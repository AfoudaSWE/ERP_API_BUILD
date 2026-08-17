import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { pool } from "../../db/client.js";

describe("HR employee onboarding", () => {
  it("creates the user, profile, branch, shift and workplace assignments atomically", async () => {
    const tenantId = randomUUID(),
      companyId = randomUUID(),
      ownerId = randomUUID(),
      branchId = randomUUID(),
      shiftId = randomUUID(),
      workplaceId = randomUUID();
    const companyName = `HR Test ${tenantId}`;
    await pool.query(
      "INSERT INTO tenants(id,name,slug)VALUES($1,$2,$3)",
      [tenantId, companyName, `hr-${tenantId}`],
    );
    await pool.query(
      "INSERT INTO companies(id,tenant_id,name)VALUES($1,$2,$3)",
      [companyId, tenantId, companyName],
    );
    await pool.query(
      "INSERT INTO users(id,tenant_id,company_id,email,password_hash,name,role)VALUES($1,$2,$3,$4,'x','Owner','business_owner')",
      [ownerId, tenantId, companyId, `${ownerId}@test.local`],
    );
    await pool.query(
      "INSERT INTO branches(id,company_id,code,name)VALUES($1,$2,'TEST','Test Branch')",
      [branchId, companyId],
    );
    await pool.query(
      "INSERT INTO attendance_shifts(id,company_id,name,start_time,end_time)VALUES($1,$2,'Day','09:00','17:00')",
      [shiftId, companyId],
    );
    await pool.query(
      "INSERT INTO attendance_workplaces(id,company_id,branch_id,name,latitude,longitude,radius_m,created_by)VALUES($1,$2,$3,'Office',30,31,100,$4)",
      [workplaceId, companyId, branchId, ownerId],
    );
    const permissions = (
      await pool.query<{ permission_code: string }>(
        "SELECT permission_code FROM role_permissions WHERE role='business_owner'",
      )
    ).rows.map((x) => x.permission_code);
    const token = jwt.sign(
      { tenantId, companyId, role: "business_owner", permissions },
      env.JWT_SECRET,
      { subject: ownerId, expiresIn: "5m" },
    );
    try {
      const response = await request(createApp())
        .post("/api/hr/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "New Employee",
          nameAr: "موظف جديد",
          email: `employee-${randomUUID()}@test.local`,
          password: "StrongPass123!",
          employeeCode: "EMP-001",
          hireDate: "2026-08-14",
          baseSalary: 5000,
          branchIds: [branchId],
          shiftId,
          workplaceIds: [workplaceId],
        });
      expect(response.status).toBe(201);
      const userId = response.body.data.userId;
      expect(
        Number(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*) FROM hr_employee_profiles WHERE user_id=$1",
              [userId],
            )
          ).rows[0].count,
        ),
      ).toBe(1);
      expect(
        Number(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*) FROM user_branch_assignments WHERE user_id=$1",
              [userId],
            )
          ).rows[0].count,
        ),
      ).toBe(1);
      expect(
        Number(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*) FROM attendance_shift_assignments WHERE user_id=$1",
              [userId],
            )
          ).rows[0].count,
        ),
      ).toBe(1);
      expect(
        Number(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*) FROM attendance_workplace_assignments WHERE user_id=$1",
              [userId],
            )
          ).rows[0].count,
        ),
      ).toBe(1);
      const before = Number(
        (
          await pool.query<{ count: string }>(
            "SELECT count(*) FROM users WHERE company_id=$1",
            [companyId],
          )
        ).rows[0].count,
      );
      const failed = await request(createApp())
        .post("/api/hr/employees")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Bad Employee",
          email: `bad-${randomUUID()}@test.local`,
          password: "StrongPass123!",
          employeeCode: "EMP-002",
          hireDate: "2026-08-14",
          baseSalary: 1,
          branchIds: [randomUUID()],
          workplaceIds: [],
        });
      expect(failed.status).toBe(400);
      expect(
        Number(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*) FROM users WHERE company_id=$1",
              [companyId],
            )
          ).rows[0].count,
        ),
      ).toBe(before);
    } finally {
      // Audit events are immutable; the isolated integration database is discarded after the suite.
    }
  });
});
afterAll(() => pool.end());
