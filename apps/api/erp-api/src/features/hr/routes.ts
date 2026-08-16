import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, transaction } from "../../db/client.js";
import { HttpError, validate } from "../../lib/http.js";
import { serializeRow, serializeRows } from "../../lib/rows.js";
import { authorizeAny } from "../auth/middleware.js";
import { appendAuditEvent } from "../audit/routes.js";

export const hrRouter = Router();
const branchSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().max(120).default(""),
  address: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(30).default(""),
  timezone: z.string().trim().max(100).nullable().optional(),
  isActive: z.boolean().default(true),
});
const departmentSchema = z.object({
  code: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().max(120).default(""),
});
const employeeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().max(120).default(""),
  email: z.email(),
  password: z.string().min(8).max(200),
  employeeCode: z.string().trim().min(2).max(50),
  nationalId: z.string().trim().max(30).nullable().optional(),
  phone: z.string().trim().max(30).default(""),
  jobTitle: z.string().trim().max(120).default(""),
  departmentId: z.uuid().nullable().optional(),
  hireDate: z.string().date(),
  baseSalary: z.coerce.number().min(0).max(999999999),
  branchIds: z.array(z.uuid()).min(1).max(20),
  shiftId: z.uuid().nullable().optional(),
  workplaceIds: z.array(z.uuid()).max(20).default([]),
  managerId: z.uuid().nullable().optional(),
});

async function assertReferences(
  client: import("pg").PoolClient,
  companyId: string,
  input: z.infer<typeof employeeSchema>,
  employeeUserId?: string,
) {
  const branches = await client.query(
    "SELECT id FROM branches WHERE company_id=$1 AND is_active=true AND id=ANY($2::uuid[])",
    [companyId, input.branchIds],
  );
  if (branches.rowCount !== input.branchIds.length)
    throw new HttpError(
      400,
      "INVALID_BRANCH",
      "One or more selected branches are invalid",
    );
  if (
    input.departmentId &&
    !(
      await client.query(
        "SELECT 1 FROM hr_departments WHERE id=$1 AND company_id=$2 AND is_active=true",
        [input.departmentId, companyId],
      )
    ).rowCount
  )
    throw new HttpError(400, "INVALID_DEPARTMENT", "Department is invalid");
  if (
    input.shiftId &&
    !(
      await client.query(
        "SELECT 1 FROM attendance_shifts WHERE id=$1 AND company_id=$2 AND is_active=true",
        [input.shiftId, companyId],
      )
    ).rowCount
  )
    throw new HttpError(400, "INVALID_SHIFT", "Shift is invalid");
  if (input.workplaceIds.length) {
    const locations = await client.query(
      "SELECT id FROM attendance_workplaces WHERE company_id=$1 AND is_active=true AND id=ANY($2::uuid[])",
      [companyId, input.workplaceIds],
    );
    if (locations.rowCount !== input.workplaceIds.length)
      throw new HttpError(
        400,
        "INVALID_WORKPLACE",
        "One or more workplaces are invalid",
      );
  }
  if (input.managerId) {
    if (employeeUserId && input.managerId === employeeUserId)
      throw new HttpError(400, "INVALID_MANAGER", "An employee cannot be their own manager");
    if (
      !(
        await client.query(
          "SELECT 1 FROM hr_employee_profiles WHERE user_id=$1 AND company_id=$2",
          [input.managerId, companyId],
        )
      ).rowCount
    )
      throw new HttpError(400, "INVALID_MANAGER", "Selected manager is invalid");
  }
}

hrRouter.get(
  "/bootstrap",
  authorizeAny("hr.employees.view", "hr.employees.manage", "hr.read"),
  async (req, res) => {
    const [branches, departments, shifts, workplaces] = await Promise.all([
      query("SELECT * FROM branches WHERE company_id=$1 ORDER BY code", [
        req.auth!.companyId,
      ]),
      query("SELECT * FROM hr_departments WHERE company_id=$1 ORDER BY code", [
        req.auth!.companyId,
      ]),
      query(
        "SELECT * FROM attendance_shifts WHERE company_id=$1 ORDER BY name",
        [req.auth!.companyId],
      ),
      query(
        "SELECT id,name,branch_id,is_active FROM attendance_workplaces WHERE company_id=$1 ORDER BY name",
        [req.auth!.companyId],
      ),
    ]);
    res.json({
      data: {
        branches: serializeRows(branches.rows),
        departments: serializeRows(departments.rows),
        shifts: serializeRows(shifts.rows),
        workplaces: serializeRows(workplaces.rows),
      },
    });
  },
);

hrRouter.get(
  "/employees",
  authorizeAny("hr.employees.view", "hr.employees.manage", "hr.read"),
  async (req, res) => {
    const rows = await query(
      `SELECT p.*,u.name,u.email,u.role,u.is_active,d.name department_name,d.name_ar department_name_ar,m.employee_code manager_code,mu.name manager_name,COALESCE((SELECT json_agg(json_build_object('id',b.id,'name',b.name,'nameAr',b.name_ar) ORDER BY b.code) FROM user_branch_assignments a JOIN branches b ON b.id=a.branch_id WHERE a.user_id=u.id),'[]') branches,(SELECT json_build_object('id',s.id,'name',s.name,'nameAr',s.name_ar) FROM attendance_shift_assignments a JOIN attendance_shifts s ON s.id=a.shift_id WHERE a.user_id=u.id) shift,COALESCE((SELECT json_agg(json_build_object('id',w.id,'name',w.name)) FROM attendance_workplace_assignments a JOIN attendance_workplaces w ON w.id=a.workplace_id WHERE a.user_id=u.id),'[]') workplaces FROM hr_employee_profiles p JOIN users u ON u.id=p.user_id LEFT JOIN hr_departments d ON d.id=p.department_id LEFT JOIN hr_employee_profiles m ON m.user_id=p.manager_id LEFT JOIN users mu ON mu.id=m.user_id WHERE p.company_id=$1 ORDER BY p.employee_code`,
      [req.auth!.companyId],
    );
    res.json({ data: serializeRows(rows.rows) });
  },
);

async function createEmployee(
  auth: { tenantId: string; companyId: string; userId: string },
  input: z.infer<typeof employeeSchema>,
) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return transaction(async (client) => {
    await assertReferences(client, auth.companyId, input);
    const user = (
      await client.query(
        `INSERT INTO users(tenant_id,company_id,email,password_hash,name,role)VALUES($1,$2,lower($3),$4,$5,'employee')RETURNING id,email,name,role,is_active`,
        [auth.tenantId, auth.companyId, input.email, passwordHash, input.name],
      )
    ).rows[0];
    const profile = (
      await client.query(
        `INSERT INTO hr_employee_profiles(user_id,company_id,employee_code,name_ar,national_id,phone,job_title,department_id,hire_date,base_salary,manager_id)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)RETURNING *`,
        [
          user.id,
          auth.companyId,
          input.employeeCode,
          input.nameAr,
          input.nationalId ?? null,
          input.phone,
          input.jobTitle,
          input.departmentId ?? null,
          input.hireDate,
          input.baseSalary,
          input.managerId ?? null,
        ],
      )
    ).rows[0];
    await client.query(
      "INSERT INTO user_branch_assignments(user_id,branch_id)SELECT $1,unnest($2::uuid[])",
      [user.id, input.branchIds],
    );
    if (input.shiftId)
      await client.query(
        "INSERT INTO attendance_shift_assignments(user_id,shift_id,effective_from)VALUES($1,$2,$3)",
        [user.id, input.shiftId, input.hireDate],
      );
    if (input.workplaceIds.length)
      await client.query(
        "INSERT INTO attendance_workplace_assignments(workplace_id,user_id)SELECT unnest($2::uuid[]),$1",
        [user.id, input.workplaceIds],
      );
    await appendAuditEvent(client, {
      tenantId: auth.tenantId,
      companyId: auth.companyId,
      actorUserId: auth.userId,
      action: "hr.employee_onboarded",
      entityType: "employee",
      entityId: user.id,
      after: {
        employeeCode: input.employeeCode,
        branchIds: input.branchIds,
        shiftId: input.shiftId,
        workplaceIds: input.workplaceIds,
      },
    });
    return { ...user, ...profile };
  });
}

hrRouter.post(
  "/employees",
  authorizeAny("hr.employees.manage", "hr.write"),
  async (req, res) => {
    const input = validate(employeeSchema, req.body);
    const row = await createEmployee(
      { tenantId: req.auth!.tenantId, companyId: req.auth!.companyId, userId: req.auth!.userId },
      input,
    );
    res.status(201).json({ data: serializeRow(row) });
  },
);

hrRouter.post(
  "/employees/bulk",
  authorizeAny("hr.employees.manage", "hr.write"),
  async (req, res) => {
    const rows = validate(
      z.object({ employees: z.array(z.record(z.string(), z.unknown())).min(1).max(500) }),
      req.body,
    ).employees;
    const auth = { tenantId: req.auth!.tenantId, companyId: req.auth!.companyId, userId: req.auth!.userId };
    const created: unknown[] = [];
    const errors: { index: number; employeeCode?: string; error: string }[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      const parsed = employeeSchema.safeParse(rows[index]);
      if (!parsed.success) {
        errors.push({
          index,
          employeeCode: typeof rows[index]?.employeeCode === "string" ? rows[index].employeeCode as string : undefined,
          error: parsed.error.issues.map((issue) => issue.message).join("; "),
        });
        continue;
      }
      try {
        created.push(await createEmployee(auth, parsed.data));
      } catch (err) {
        errors.push({
          index,
          employeeCode: parsed.data.employeeCode,
          error: err instanceof HttpError ? err.message : "Failed to create employee",
        });
      }
    }
    res.status(created.length ? 201 : 400).json({
      data: { created: created.length, failed: errors.length, errors },
    });
  },
);

hrRouter.patch(
  "/departments/:id",
  authorizeAny("hr.departments.manage", "hr.employees.manage"),
  async (req, res) => {
    const input = validate(
      departmentSchema.partial().extend({ isActive: z.boolean().optional() }),
      req.body,
    );
    const row = await transaction(async (client) => {
      const before = (
        await client.query<Record<string, unknown>>(
          "SELECT * FROM hr_departments WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!before)
        throw new HttpError(404, "DEPARTMENT_NOT_FOUND", "Department not found");
      const updated = (
        await client.query(
          `UPDATE hr_departments SET code=COALESCE(upper($3),code),name=COALESCE($4,name),name_ar=COALESCE($5,name_ar),is_active=COALESCE($6,is_active),updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING *`,
          [req.params.id, req.auth!.companyId, input.code, input.name, input.nameAr, input.isActive],
        )
      ).rows[0];
      await appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "hr.department_updated",
        entityType: "department",
        entityId: String(req.params.id),
        before,
        after: updated,
      });
      return updated;
    });
    res.json({ data: serializeRow(row) });
  },
);

hrRouter.delete(
  "/departments/:id",
  authorizeAny("hr.departments.manage", "hr.employees.manage"),
  async (req, res) => {
    await transaction(async (client) => {
      const before = (
        await client.query<Record<string, unknown>>(
          "SELECT * FROM hr_departments WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!before)
        throw new HttpError(404, "DEPARTMENT_NOT_FOUND", "Department not found");
      const assigned = await client.query(
        "SELECT 1 FROM hr_employee_profiles WHERE department_id=$1 AND employment_status='active' LIMIT 1",
        [req.params.id],
      );
      if (assigned.rowCount)
        throw new HttpError(409, "DEPARTMENT_IN_USE", "Reassign active employees before archiving this department");
      await client.query(
        "UPDATE hr_departments SET is_active=false,updated_at=now() WHERE id=$1",
        [req.params.id],
      );
      await appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "hr.department_archived",
        entityType: "department",
        entityId: String(req.params.id),
        before,
        after: { ...before, is_active: false },
      });
    });
    res.status(204).send();
  },
);

hrRouter.patch(
  "/employees/:id",
  authorizeAny("hr.employees.manage", "hr.write"),
  async (req, res) => {
    const input = validate(
      employeeSchema
        .omit({ password: true, email: true })
        .partial()
        .extend({
          isActive: z.boolean().optional(),
          employmentStatus: z
            .enum(["active", "suspended", "terminated"])
            .optional(),
        }),
      req.body,
    );
    const row = await transaction(async (client) => {
      const before = (
        await client.query<Record<string, unknown>>(
          "SELECT p.*,u.name,u.is_active FROM hr_employee_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND p.company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!before)
        throw new HttpError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
      if (input.branchIds) {
        const full = {
          ...input,
          branchIds: input.branchIds,
          workplaceIds: input.workplaceIds ?? [],
          name: String(input.name ?? before.name),
          nameAr: String(input.nameAr ?? before.name_ar),
          email: "placeholder@example.com",
          password: "12345678",
          employeeCode: String(input.employeeCode ?? before.employee_code),
          phone: String(input.phone ?? before.phone),
          jobTitle: String(input.jobTitle ?? before.job_title),
          hireDate: String(input.hireDate ?? before.hire_date),
          baseSalary: Number(input.baseSalary ?? before.base_salary),
        } as z.infer<typeof employeeSchema>;
        await assertReferences(client, req.auth!.companyId, full, String(req.params.id));
        await client.query(
          "DELETE FROM user_branch_assignments WHERE user_id=$1",
          [req.params.id],
        );
        await client.query(
          "INSERT INTO user_branch_assignments(user_id,branch_id)SELECT $1,unnest($2::uuid[])",
          [req.params.id, input.branchIds],
        );
      }
      if (input.managerId !== undefined && !input.branchIds) {
        if (input.managerId === req.params.id)
          throw new HttpError(400, "INVALID_MANAGER", "An employee cannot be their own manager");
        if (
          input.managerId &&
          !(
            await client.query(
              "SELECT 1 FROM hr_employee_profiles WHERE user_id=$1 AND company_id=$2",
              [input.managerId, req.auth!.companyId],
            )
          ).rowCount
        )
          throw new HttpError(400, "INVALID_MANAGER", "Selected manager is invalid");
      }
      if (input.shiftId !== undefined) {
        await client.query(
          "DELETE FROM attendance_shift_assignments WHERE user_id=$1",
          [req.params.id],
        );
        if (input.shiftId)
          await client.query(
            "INSERT INTO attendance_shift_assignments(user_id,shift_id,effective_from)VALUES($1,$2,COALESCE($3,current_date))",
            [req.params.id, input.shiftId, input.hireDate ?? null],
          );
      }
      if (input.workplaceIds) {
        await client.query(
          "DELETE FROM attendance_workplace_assignments WHERE user_id=$1",
          [req.params.id],
        );
        if (input.workplaceIds.length)
          await client.query(
            "INSERT INTO attendance_workplace_assignments(workplace_id,user_id)SELECT unnest($2::uuid[]),$1",
            [req.params.id, input.workplaceIds],
          );
      }
      await client.query(
        "UPDATE users SET name=COALESCE($2,name),is_active=COALESCE($3,is_active),updated_at=now() WHERE id=$1",
        [req.params.id, input.name, input.isActive],
      );
      const updated = (
        await client.query(
          `UPDATE hr_employee_profiles SET employee_code=COALESCE($2,employee_code),name_ar=COALESCE($3,name_ar),national_id=COALESCE($4,national_id),phone=COALESCE($5,phone),job_title=COALESCE($6,job_title),department_id=COALESCE($7,department_id),hire_date=COALESCE($8,hire_date),base_salary=COALESCE($9,base_salary),employment_status=COALESCE($10,employment_status),manager_id=CASE WHEN $11 THEN $12::uuid ELSE manager_id END,updated_at=now() WHERE user_id=$1 RETURNING *`,
          [
            req.params.id,
            input.employeeCode,
            input.nameAr,
            input.nationalId,
            input.phone,
            input.jobTitle,
            input.departmentId,
            input.hireDate,
            input.baseSalary,
            input.employmentStatus,
            input.managerId !== undefined,
            input.managerId ?? null,
          ],
        )
      ).rows[0];
      await appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "hr.employee_updated",
        entityType: "employee",
        entityId: String(req.params.id),
        before,
        after: updated,
      });
      return updated;
    });
    res.json({ data: serializeRow(row) });
  },
);

hrRouter.get(
  "/branches",
  authorizeAny("branches.view", "branches.read"),
  async (req, res) =>
    res.json({
      data: serializeRows(
        (
          await query(
            `SELECT b.*,(SELECT count(*)::int FROM user_branch_assignments a WHERE a.branch_id=b.id) employee_count FROM branches b WHERE b.company_id=$1 ORDER BY b.code`,
            [req.auth!.companyId],
          )
        ).rows,
      ),
    }),
);
hrRouter.post(
  "/branches",
  authorizeAny("branches.manage"),
  async (req, res) => {
    const i = validate(branchSchema, req.body);
    if (
      i.timezone &&
      !(
        await query("SELECT 1 FROM pg_timezone_names WHERE name=$1", [
          i.timezone,
        ])
      ).rowCount
    )
      throw new HttpError(400, "INVALID_TIMEZONE", "Unknown time zone");
    const row = (
      await query(
        `INSERT INTO branches(company_id,code,name,name_ar,address,phone,timezone,is_active)VALUES($1,upper($2),$3,$4,$5,$6,$7,$8)RETURNING *`,
        [
          req.auth!.companyId,
          i.code,
          i.name,
          i.nameAr,
          i.address,
          i.phone,
          i.timezone ?? null,
          i.isActive,
        ],
      )
    ).rows[0];
    res.status(201).json({ data: serializeRow(row) });
  },
);
hrRouter.patch(
  "/branches/:id",
  authorizeAny("branches.manage"),
  async (req, res) => {
    const i = validate(branchSchema.partial(), req.body);
    const row = (
      await query(
        `UPDATE branches SET code=COALESCE(upper($3),code),name=COALESCE($4,name),name_ar=COALESCE($5,name_ar),address=COALESCE($6,address),phone=COALESCE($7,phone),timezone=COALESCE($8,timezone),is_active=COALESCE($9,is_active),updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING *`,
        [
          req.params.id,
          req.auth!.companyId,
          i.code,
          i.name,
          i.nameAr,
          i.address,
          i.phone,
          i.timezone,
          i.isActive,
        ],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "BRANCH_NOT_FOUND", "Branch not found");
    res.json({ data: serializeRow(row) });
  },
);
hrRouter.delete(
  "/branches/:id",
  authorizeAny("branches.manage"),
  async (req, res) => {
    const reason = validate(
      z.object({ reason: z.string().trim().min(1).max(500) }),
      req.body,
    ).reason;
    await transaction(async (client) => {
      const before = (
        await client.query<Record<string, unknown>>(
          "SELECT * FROM branches WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!before)
        throw new HttpError(404, "BRANCH_NOT_FOUND", "Branch not found");
      const assigned = await client.query(
        "SELECT 1 FROM user_branch_assignments a JOIN users u ON u.id=a.user_id WHERE a.branch_id=$1 AND u.is_active=true LIMIT 1",
        [req.params.id],
      );
      if (assigned.rowCount)
        throw new HttpError(
          409,
          "BRANCH_IN_USE",
          "Reassign active employees before archiving this branch",
        );
      await client.query(
        "UPDATE branches SET is_active=false,updated_at=now() WHERE id=$1",
        [req.params.id],
      );
      await appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "hr.branch_archived",
        entityType: "branch",
        entityId: String(req.params.id),
        before,
        after: { ...before, is_active: false },
        metadata: { reason },
      });
    });
    res.status(204).send();
  },
);

hrRouter.get(
  "/departments",
  authorizeAny("hr.departments.view", "hr.employees.view", "hr.read"),
  async (req, res) =>
    res.json({
      data: serializeRows(
        (
          await query(
            "SELECT * FROM hr_departments WHERE company_id=$1 ORDER BY code",
            [req.auth!.companyId],
          )
        ).rows,
      ),
    }),
);
hrRouter.post(
  "/departments",
  authorizeAny("hr.departments.manage", "hr.employees.manage"),
  async (req, res) => {
    const i = validate(departmentSchema, req.body);
    const row = (
      await query(
        "INSERT INTO hr_departments(company_id,code,name,name_ar)VALUES($1,upper($2),$3,$4)RETURNING *",
        [req.auth!.companyId, i.code, i.name, i.nameAr],
      )
    ).rows[0];
    res.status(201).json({ data: serializeRow(row) });
  },
);
