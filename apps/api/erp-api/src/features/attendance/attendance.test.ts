import { randomUUID } from "node:crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { env } from "../../config/env.js";
import { pool } from "../../db/client.js";

async function fixture(locationRequired = false) {
  const tenantId = randomUUID(),
    companyId = randomUUID(),
    userId = randomUUID();
  await pool.query(
    `INSERT INTO tenants(id,name,slug)VALUES($1,'Attendance Test',$2)`,
    [tenantId, `attendance-${tenantId}`],
  );
  await pool.query(
    `INSERT INTO companies(id,tenant_id,name,attendance_location_required)VALUES($1,$2,'Attendance Test',$3)`,
    [companyId, tenantId, locationRequired],
  );
  await pool.query(
    `INSERT INTO users(id,tenant_id,company_id,email,password_hash,name,role)VALUES($1,$2,$3,$4,'test','Attendance Employee','employee')`,
    [userId, tenantId, companyId, `${userId}@test.local`],
  );
  const permissions = (
    await pool.query<{ permission_code: string }>(
      "SELECT permission_code FROM role_permissions WHERE role=$1",
      ["employee"],
    )
  ).rows.map((r) => r.permission_code);
  const token = jwt.sign(
    { tenantId, companyId, role: "employee", permissions },
    env.JWT_SECRET,
    { subject: userId, expiresIn: "5m" },
  );
  return { tenantId, companyId, userId, token };
}
async function cleanup(tenantId: string) {
  await pool.query(`DELETE FROM attendance_events WHERE tenant_id=$1`, [
    tenantId,
  ]);
  await pool.query(`DELETE FROM attendance_records WHERE tenant_id=$1`, [
    tenantId,
  ]);
  // Audit events are deliberately immutable; the isolated test database is discarded after the suite.
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("attendance management", () => {
  it("requires authentication", async () => {
    expect(
      (await request(createApp()).get("/api/attendance/me/today")).status,
    ).toBe(401);
  });
  it("serializes concurrent check-in and completes check-out using server time", async () => {
    const row = await fixture();
    try {
      const app = createApp();
      const attempts = await Promise.all([
        request(app)
          .post("/api/attendance/check-in")
          .set(auth(row.token))
          .send({}),
        request(app)
          .post("/api/attendance/check-in")
          .set(auth(row.token))
          .send({}),
      ]);
      expect(attempts.map((x) => x.status).sort()).toEqual([201, 409]);
      const checkout = await request(app)
        .post("/api/attendance/check-out")
        .set(auth(row.token))
        .send({});
      expect(checkout.status).toBe(200);
      expect(checkout.body.data.checkOutAt).toBeTruthy();
      expect(
        Number(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*) FROM attendance_records WHERE user_id=$1",
              [row.userId],
            )
          ).rows[0].count,
        ),
      ).toBe(1);
    } finally {
      await cleanup(row.tenantId);
    }
  });
  it("replays the same idempotent portal request without creating a duplicate", async () => {
    const row = await fixture();
    try {
      const app = createApp(),
        key = randomUUID();
      const first = await request(app)
        .post("/api/attendance/check-in")
        .set(auth(row.token))
        .set("Idempotency-Key", key)
        .send({});
      const replay = await request(app)
        .post("/api/attendance/check-in")
        .set(auth(row.token))
        .set("Idempotency-Key", key)
        .send({});
      expect(first.status).toBe(201);
      expect(replay.status).toBe(201);
      expect(replay.body.data.id).toBe(first.body.data.id);
      expect(
        Number(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*) FROM attendance_records WHERE user_id=$1",
              [row.userId],
            )
          ).rows[0].count,
        ),
      ).toBe(1);
    } finally {
      await cleanup(row.tenantId);
    }
  });
  it("verifies workplace radius, accuracy, and stale readings in the backend", async () => {
    const row = await fixture(true);
    try {
      const workplace = (
        await pool.query<{ id: string }>(
          `INSERT INTO attendance_workplaces(company_id,name,latitude,longitude,radius_m,created_by)VALUES($1,'Office',30.0444,31.2357,150,$2)RETURNING id`,
          [row.companyId, row.userId],
        )
      ).rows[0];
      await pool.query(
        "INSERT INTO attendance_workplace_assignments(workplace_id,user_id)VALUES($1,$2)",
        [workplace.id, row.userId],
      );
      const app = createApp();
      const outside = await request(app)
        .post("/api/attendance/check-in")
        .set(auth(row.token))
        .send({
          latitude: 31,
          longitude: 32,
          accuracy: 10,
          timestamp: new Date().toISOString(),
        });
      expect(outside.status).toBe(422);
      expect(outside.body.error.code).toBe("OUTSIDE_WORKPLACE");
      const inaccurate = await request(app)
        .post("/api/attendance/check-in")
        .set(auth(row.token))
        .send({
          latitude: 30.0444,
          longitude: 31.2357,
          accuracy: 900,
          timestamp: new Date().toISOString(),
        });
      expect(inaccurate.body.error.code).toBe("LOCATION_ACCURACY_LOW");
      const stale = await request(app)
        .post("/api/attendance/check-in")
        .set(auth(row.token))
        .send({
          latitude: 30.0444,
          longitude: 31.2357,
          accuracy: 10,
          timestamp: new Date(Date.now() - 300_000).toISOString(),
        });
      expect(stale.body.error.code).toBe("LOCATION_STALE");
      const inside = await request(app)
        .post("/api/attendance/check-in")
        .set(auth(row.token))
        .send({
          latitude: 30.0445,
          longitude: 31.2357,
          accuracy: 10,
          timestamp: new Date().toISOString(),
        });
      expect(inside.status).toBe(201);
      expect(
        (
          await pool.query<{ location_status: string }>(
            "SELECT location_status FROM attendance_events WHERE user_id=$1",
            [row.userId],
          )
        ).rows[0].location_status,
      ).toBe("verified");
    } finally {
      await cleanup(row.tenantId);
    }
  });
});
afterAll(() => pool.end());
