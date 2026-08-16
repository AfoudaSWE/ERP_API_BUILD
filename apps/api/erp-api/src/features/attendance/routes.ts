import { Router, type Request } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { PoolClient } from "pg";
import { query, transaction } from "../../db/client.js";
import { HttpError, validate } from "../../lib/http.js";
import { serializeRow, serializeRows } from "../../lib/rows.js";
import { authorizeAny } from "../auth/middleware.js";
import { appendAuditEvent } from "../audit/routes.js";

const geoSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().positive().max(10000).optional(),
  timestamp: z.string().datetime().optional(),
  source: z.enum(["web", "mobile"]).default("web"),
});
const pageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  userId: z.uuid().optional(),
  branchId: z.uuid().optional(),
  status: z
    .enum(["present", "late", "completed", "incomplete", "manual"])
    .optional(),
  search: z.string().max(100).optional(),
});
const workplaceSchema = z.object({
  branchId: z.uuid().nullable().optional(),
  name: z.string().min(2).max(120),
  address: z.string().max(300).default(""),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusM: z.number().int().min(10).max(10000),
  isActive: z.boolean().default(true),
});
const assignmentSchema = z.object({ userIds: z.array(z.uuid()).max(500) });
const shiftSchema = z.object({
  name: z.string().min(2).max(120),
  nameAr: z.string().max(120).default(""),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  graceMinutes: z.number().int().min(0).max(240).default(15),
  workDays: z.array(z.number().int().min(0).max(6)).min(1),
  isActive: z.boolean().default(true),
});
const manualSchema = z.object({
  checkInAt: z.string().datetime(),
  checkOutAt: z.string().datetime().nullable(),
  reason: z.string().min(5).max(500),
});
type Settings = {
  timezone: string;
  attendance_location_required: boolean;
  attendance_max_accuracy_m: number;
  attendance_location_max_age_seconds: number;
};
type Workplace = {
  id: string;
  branch_id: string | null;
  latitude: string;
  longitude: string;
  radius_m: number;
  name: string;
};

function distanceMeters(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
) {
  const r = 6371000,
    toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat),
    dLon = toRad(bLon - aLon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}
function clientIp(request: Request) {
  const value = request.ip || request.socket.remoteAddress;
  return value?.replace(/^::ffff:/, "") ?? null;
}
function requireBranch(request: Request, branchId: string | null) {
  if (
    branchId &&
    request.auth!.branchIds &&
    !request.auth!.branchIds.includes(branchId)
  )
    throw new HttpError(
      403,
      "BRANCH_SCOPE_FORBIDDEN",
      "You cannot access this branch",
    );
}

async function context(client: PoolClient, request: Request) {
  const settings = (
    await client.query<Settings>(
      "SELECT timezone,attendance_location_required,attendance_max_accuracy_m,attendance_location_max_age_seconds FROM companies WHERE id=$1",
      [request.auth!.companyId],
    )
  ).rows[0];
  if (!settings)
    throw new HttpError(404, "COMPANY_NOT_FOUND", "Company not found");
  const timezone = (
    await client.query<{ timezone: string }>(
      `SELECT COALESCE((SELECT timezone FROM branches WHERE id=ANY($2::uuid[]) AND timezone IS NOT NULL LIMIT 1),$1) timezone`,
      [settings.timezone, request.auth!.branchIds ?? []],
    )
  ).rows[0].timezone;
  const businessDate = (
    await client.query<{ business_date: string }>(
      "SELECT (now() AT TIME ZONE $1)::date::text AS business_date",
      [timezone],
    )
  ).rows[0].business_date;
  return { settings, timezone, businessDate };
}

async function verifyLocation(
  client: PoolClient,
  request: Request,
  input: z.infer<typeof geoSchema>,
  settings: Settings,
) {
  if (!settings.attendance_location_required && input.latitude === undefined)
    return {
      status: "not_required" as const,
      workplace: null as Workplace | null,
      distance: null as number | null,
    };
  if (
    input.latitude === undefined ||
    input.longitude === undefined ||
    input.accuracy === undefined ||
    !input.timestamp
  )
    throw new HttpError(
      400,
      "LOCATION_REQUIRED",
      "Location permission is required to record attendance",
    );
  if (input.accuracy > settings.attendance_max_accuracy_m)
    throw new HttpError(
      422,
      "LOCATION_ACCURACY_LOW",
      "Current location accuracy is not sufficient",
    );
  const age = Math.abs(Date.now() - new Date(input.timestamp).getTime()) / 1000;
  if (
    !Number.isFinite(age) ||
    age > settings.attendance_location_max_age_seconds
  )
    throw new HttpError(422, "LOCATION_STALE", "Location reading is too old");
  const workplaces = (
    await client.query<Workplace>(
      `SELECT w.id,w.branch_id,w.latitude::text,w.longitude::text,w.radius_m,w.name FROM attendance_workplaces w
    WHERE w.company_id=$1 AND w.is_active=true AND (w.branch_id IS NULL OR w.branch_id=ANY($3::uuid[]) OR EXISTS(SELECT 1 FROM attendance_workplace_assignments ba WHERE ba.workplace_id=w.id AND ba.user_id=$2))
    AND (EXISTS(SELECT 1 FROM attendance_workplace_assignments a WHERE a.workplace_id=w.id AND a.user_id=$2)
      OR NOT EXISTS(SELECT 1 FROM attendance_workplace_assignments x WHERE x.user_id=$2))`,
      [
        request.auth!.companyId,
        request.auth!.userId,
        request.auth!.branchIds ?? [],
      ],
    )
  ).rows;
  if (!workplaces.length)
    throw new HttpError(
      422,
      "NO_WORKPLACE_ASSIGNED",
      "No workplace is assigned to your account",
    );
  const ranked = workplaces
    .map((workplace) => ({
      workplace,
      distance: distanceMeters(
        input.latitude!,
        input.longitude!,
        Number(workplace.latitude),
        Number(workplace.longitude),
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
  if (ranked[0].distance > ranked[0].workplace.radius_m)
    throw new HttpError(
      422,
      "OUTSIDE_WORKPLACE",
      "You are outside the allowed workplace area",
      {
        distanceM: Math.round(ranked[0].distance),
        workplace: ranked[0].workplace.name,
      },
    );
  return {
    status: "verified" as const,
    workplace: ranked[0].workplace,
    distance: ranked[0].distance,
  };
}

async function punch(request: Request, eventType: "check_in" | "check_out") {
  const input = validate(geoSchema, request.body ?? {});
  const idempotencyKey =
    request.get("idempotency-key")?.trim().slice(0, 100) || null;
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      request.auth!.userId,
    ]);
    if (idempotencyKey) {
      const replay = (
        await client.query(
          `SELECT r.* FROM attendance_events e JOIN attendance_records r ON r.id=e.record_id WHERE e.company_id=$1 AND e.user_id=$2 AND e.idempotency_key=$3 AND e.event_type=$4`,
          [
            request.auth!.companyId,
            request.auth!.userId,
            idempotencyKey,
            eventType,
          ],
        )
      ).rows[0];
      if (replay) return replay;
    }
    const ctx = await context(client, request);
    const location = await verifyLocation(client, request, input, ctx.settings);
    const open = (
      await client.query<{
        id: string;
        business_date: string;
        check_in_at: string;
        branch_id: string | null;
        shift_id: string | null;
      }>(
        `SELECT id,business_date::text,check_in_at::text,branch_id,shift_id FROM attendance_records WHERE company_id=$1 AND user_id=$2 AND check_out_at IS NULL ORDER BY check_in_at DESC LIMIT 1 FOR UPDATE`,
        [request.auth!.companyId, request.auth!.userId],
      )
    ).rows[0];
    if (eventType === "check_in") {
      if (open)
        throw new HttpError(
          409,
          "ALREADY_CHECKED_IN",
          "Attendance has already been recorded",
        );
      const existing = (
        await client.query(
          "SELECT 1 FROM attendance_records WHERE company_id=$1 AND user_id=$2 AND business_date=$3",
          [request.auth!.companyId, request.auth!.userId, ctx.businessDate],
        )
      ).rowCount;
      if (existing)
        throw new HttpError(
          409,
          "ATTENDANCE_DAY_COMPLETED",
          "Attendance for this day is already complete",
        );
      const shift = (
        await client.query<{
          id: string;
          start_time: string;
          grace_minutes: number;
        }>(
          `SELECT s.id,s.start_time::text,s.grace_minutes FROM attendance_shift_assignments a JOIN attendance_shifts s ON s.id=a.shift_id AND s.is_active=true WHERE a.user_id=$1 AND $2::date BETWEEN a.effective_from AND COALESCE(a.effective_to,'infinity') LIMIT 1`,
          [request.auth!.userId, ctx.businessDate],
        )
      ).rows[0];
      const late = shift
        ? (
            await client.query<{ minutes: number }>(
              `SELECT GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(now()-(($1::date+$2::time) AT TIME ZONE $3)))/60)-$4)::int minutes`,
              [
                ctx.businessDate,
                shift.start_time,
                ctx.timezone,
                shift.grace_minutes,
              ],
            )
          ).rows[0].minutes
        : 0;
      const branchId =
        location.workplace?.branch_id ?? request.auth!.branchIds?.[0] ?? null;
      requireBranch(request, branchId);
      const record = (
        await client.query<{ id: string }>(
          `INSERT INTO attendance_records(tenant_id,company_id,user_id,branch_id,shift_id,business_date,timezone,check_in_at,status,late_minutes) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8,$9) RETURNING id`,
          [
            request.auth!.tenantId,
            request.auth!.companyId,
            request.auth!.userId,
            branchId,
            shift?.id ?? null,
            ctx.businessDate,
            ctx.timezone,
            late > 0 ? "late" : "present",
            late,
          ],
        )
      ).rows[0];
      await insertEvent(
        client,
        request,
        record.id,
        "check_in",
        ctx.businessDate,
        ctx.timezone,
        input,
        location,
        idempotencyKey,
      );
    } else {
      if (!open)
        throw new HttpError(
          409,
          "NOT_CHECKED_IN",
          "No open attendance record exists",
        );
      const worked = (
        await client.query<{ minutes: number }>(
          `SELECT GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(now()-$1::timestamptz))/60))::int minutes`,
          [open.check_in_at],
        )
      ).rows[0].minutes;
      await client.query(
        `UPDATE attendance_records SET check_out_at=now(),worked_minutes=$2,status='completed',updated_at=now() WHERE id=$1`,
        [open.id, worked],
      );
      await insertEvent(
        client,
        request,
        open.id,
        "check_out",
        open.business_date,
        ctx.timezone,
        input,
        location,
        idempotencyKey,
      );
    }
    return (
      await client.query(
        `SELECT r.*,u.name employee_name,b.name branch_name FROM attendance_records r JOIN users u ON u.id=r.user_id LEFT JOIN branches b ON b.id=r.branch_id WHERE r.company_id=$1 AND r.user_id=$2 ORDER BY r.check_in_at DESC LIMIT 1`,
        [request.auth!.companyId, request.auth!.userId],
      )
    ).rows[0];
  });
}

async function insertEvent(
  client: PoolClient,
  request: Request,
  recordId: string,
  type: "check_in" | "check_out",
  date: string,
  timezone: string,
  input: z.infer<typeof geoSchema>,
  location: {
    status: "verified" | "not_required";
    workplace: Workplace | null;
    distance: number | null;
  },
  idempotencyKey: string | null,
) {
  await client.query(
    `INSERT INTO attendance_events(record_id,tenant_id,company_id,user_id,branch_id,event_type,business_date,timezone,latitude,longitude,accuracy_m,location_timestamp,workplace_id,distance_m,location_status,ip_address,user_agent,source,created_by,idempotency_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'employee_attendance_portal',$4,$18)`,
    [
      recordId,
      request.auth!.tenantId,
      request.auth!.companyId,
      request.auth!.userId,
      location.workplace?.branch_id ?? request.auth!.branchIds?.[0] ?? null,
      type,
      date,
      timezone,
      input.latitude ?? null,
      input.longitude ?? null,
      input.accuracy ?? null,
      input.timestamp ?? null,
      location.workplace?.id ?? null,
      location.distance,
      location.status,
      clientIp(request),
      request.get("user-agent")?.slice(0, 500) ?? null,
      idempotencyKey,
    ],
  );
}

export const attendanceRouter = Router();
const punchLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
async function punchWithRejectedAudit(
  request: Request,
  eventType: "check_in" | "check_out",
) {
  try {
    return await punch(request, eventType);
  } catch (error) {
    const code = error instanceof HttpError ? error.code : "";
    if (
      [
        "OUTSIDE_WORKPLACE",
        "LOCATION_ACCURACY_LOW",
        "LOCATION_STALE",
        "NO_WORKPLACE_ASSIGNED",
        "LOCATION_REQUIRED",
      ].includes(code)
    ) {
      await transaction((client) =>
        appendAuditEvent(client, {
          tenantId: request.auth!.tenantId,
          companyId: request.auth!.companyId,
          actorUserId: request.auth!.userId,
          action: "attendance.location_rejected",
          entityType: "attendance_attempt",
          metadata: { eventType, code, ipAddress: clientIp(request) },
        }),
      );
    }
    throw error;
  }
}
attendanceRouter.get(
  "/me/today",
  authorizeAny(
    "attendance.self.view",
    "attendance.punch",
    "attendance.read",
    "attendance.view",
  ),
  async (req, res) => {
    const result = await transaction(async (client) => {
      const ctx = await context(client, req);
      const record =
        (
          await client.query(
            `SELECT r.*,u.name employee_name,c.name company_name,b.name branch_name FROM attendance_records r JOIN users u ON u.id=r.user_id JOIN companies c ON c.id=r.company_id LEFT JOIN branches b ON b.id=r.branch_id WHERE r.company_id=$1 AND r.user_id=$2 AND (r.business_date=$3 OR r.check_out_at IS NULL) ORDER BY r.check_in_at DESC LIMIT 1`,
            [req.auth!.companyId, req.auth!.userId, ctx.businessDate],
          )
        ).rows[0] ?? null;
      const identity = (
        await client.query(
          `SELECT u.name employee_name,c.name company_name,(SELECT b.name FROM branches b JOIN user_branch_assignments a ON a.branch_id=b.id WHERE a.user_id=u.id LIMIT 1) branch_name FROM users u JOIN companies c ON c.id=u.company_id WHERE u.id=$1`,
          [req.auth!.userId],
        )
      ).rows[0];
      return {
        serverTime: new Date().toISOString(),
        timezone: ctx.timezone,
        businessDate: ctx.businessDate,
        state: record
          ? record.check_out_at
            ? "checked_out"
            : record.status === "late"
              ? "late"
              : "present"
          : "not_checked_in",
        record,
        identity,
      };
    });
    res.json({ data: serializeRow(result) });
  },
);
attendanceRouter.post(
  "/check-in",
  punchLimit,
  authorizeAny("attendance.self.check_in", "attendance.punch"),
  async (req, res) =>
    res.status(201).json({
      data: serializeRow(await punchWithRejectedAudit(req, "check_in")),
    }),
);
attendanceRouter.post(
  "/check-out",
  punchLimit,
  authorizeAny("attendance.self.check_out", "attendance.punch"),
  async (req, res) =>
    res.json({
      data: serializeRow(await punchWithRejectedAudit(req, "check_out")),
    }),
);
attendanceRouter.get(
  "/me/history",
  authorizeAny(
    "attendance.self.view",
    "attendance.punch",
    "attendance.read",
    "attendance.view",
  ),
  async (req, res) => {
    const p = validate(pageSchema, req.query);
    const [rows, total] = await Promise.all([
      query(
        `SELECT r.*,b.name branch_name FROM attendance_records r LEFT JOIN branches b ON b.id=r.branch_id WHERE r.company_id=$1 AND r.user_id=$2 AND ($3::date IS NULL OR business_date>=$3) AND ($4::date IS NULL OR business_date<=$4) ORDER BY business_date DESC LIMIT $5 OFFSET $6`,
        [
          req.auth!.companyId,
          req.auth!.userId,
          p.from ?? null,
          p.to ?? null,
          p.pageSize,
          (p.page - 1) * p.pageSize,
        ],
      ),
      query<{ count: string }>(
        `SELECT count(*) FROM attendance_records WHERE company_id=$1 AND user_id=$2`,
        [req.auth!.companyId, req.auth!.userId],
      ),
    ]);
    res.json({
      data: serializeRows(rows.rows),
      meta: {
        page: p.page,
        pageSize: p.pageSize,
        total: Number(total.rows[0].count),
      },
    });
  },
);
attendanceRouter.get(
  "/admin/records",
  authorizeAny(
    "attendance.records.view",
    "attendance.records.view_all",
    "attendance.records.view_branch",
    "attendance.manage",
    "attendance.write",
  ),
  async (req, res) => {
    const p = validate(pageSchema, req.query);
    if (p.branchId) requireBranch(req, p.branchId);
    const branches = req.auth!.branchIds;
    const values = [
      req.auth!.companyId,
      p.from ?? null,
      p.to ?? null,
      p.userId ?? null,
      p.branchId ?? null,
      p.status ?? null,
      p.search ?? null,
      branches,
      p.pageSize,
      (p.page - 1) * p.pageSize,
    ];
    const where = `r.company_id=$1 AND ($2::date IS NULL OR r.business_date>=$2) AND ($3::date IS NULL OR r.business_date<=$3) AND ($4::uuid IS NULL OR r.user_id=$4) AND ($5::uuid IS NULL OR r.branch_id=$5) AND ($6::text IS NULL OR r.status=$6) AND ($7::text IS NULL OR u.name ILIKE '%'||$7||'%' OR u.email ILIKE '%'||$7||'%') AND ($8::uuid[] IS NULL OR r.branch_id=ANY($8))`;
    const [rows, total] = await Promise.all([
      query(
        `SELECT r.*,u.name employee_name,u.email,b.name branch_name,s.name shift_name,ci.location_status,ci.distance_m,ci.accuracy_m,ci.workplace_id,cw.name workplace_name,co.distance_m checkout_distance_m,co.accuracy_m checkout_accuracy_m,ow.name checkout_workplace_name FROM attendance_records r JOIN users u ON u.id=r.user_id LEFT JOIN branches b ON b.id=r.branch_id LEFT JOIN attendance_shifts s ON s.id=r.shift_id LEFT JOIN LATERAL(SELECT * FROM attendance_events e WHERE e.record_id=r.id AND e.event_type='check_in' ORDER BY e.occurred_at LIMIT 1)ci ON true LEFT JOIN attendance_workplaces cw ON cw.id=ci.workplace_id LEFT JOIN LATERAL(SELECT * FROM attendance_events e WHERE e.record_id=r.id AND e.event_type='check_out' ORDER BY e.occurred_at LIMIT 1)co ON true LEFT JOIN attendance_workplaces ow ON ow.id=co.workplace_id WHERE ${where} ORDER BY r.business_date DESC,r.check_in_at DESC LIMIT $9 OFFSET $10`,
        values,
      ),
      query<{ count: string }>(
        `SELECT count(*) FROM attendance_records r JOIN users u ON u.id=r.user_id WHERE ${where}`,
        values.slice(0, 8),
      ),
    ]);
    res.json({
      data: serializeRows(rows.rows),
      meta: {
        page: p.page,
        pageSize: p.pageSize,
        total: Number(total.rows[0].count),
      },
    });
  },
);
attendanceRouter.get(
  "/admin/summary",
  authorizeAny(
    "attendance.reports.view",
    "attendance.records.view",
    "attendance.manage",
  ),
  async (req, res) => {
    const date = z
      .string()
      .date()
      .catch(new Date().toISOString().slice(0, 10))
      .parse(req.query.date);
    const branches = req.auth!.branchIds;
    const row = (
      await query(
        `WITH scoped_employees AS (SELECT count(DISTINCT u.id) total FROM users u LEFT JOIN user_branch_assignments uba ON uba.user_id=u.id WHERE u.company_id=$1 AND u.is_active=true AND ($3::uuid[] IS NULL OR uba.branch_id=ANY($3))) SELECT (SELECT total FROM scoped_employees) total_employees,count(*) FILTER(WHERE r.check_in_at IS NOT NULL) present,count(*) FILTER(WHERE r.late_minutes>0) late,count(*) FILTER(WHERE r.check_out_at IS NOT NULL) checked_out,count(*) FILTER(WHERE r.check_in_at IS NOT NULL AND r.check_out_at IS NULL) missing_checkout,GREATEST(0,(SELECT total FROM scoped_employees)-count(*)) absent FROM attendance_records r WHERE r.company_id=$1 AND r.business_date=$2 AND ($3::uuid[] IS NULL OR r.branch_id=ANY($3))`,
        [req.auth!.companyId, date, branches],
      )
    ).rows[0];
    const rejected =
      (
        await query<{ count: string }>(
          `SELECT count(*) FROM audit_events WHERE company_id=$1 AND action='attendance.location_rejected' AND created_at::date=$2`,
          [req.auth!.companyId, date],
        )
      ).rows[0]?.count ?? "0";
    res.json({
      data: serializeRow({
        ...row,
        rejectedLocation: Number(rejected),
        suspicious: 0,
        date,
      }),
    });
  },
);
attendanceRouter.get(
  "/admin/export",
  authorizeAny("attendance.records.export", "attendance.manage"),
  async (req, res) => {
    const p = validate(
      pageSchema.omit({ page: true, pageSize: true }),
      req.query,
    );
    if (p.branchId) requireBranch(req, p.branchId);
    const branches = req.auth!.branchIds;
    const rows = (
      await query(
        `SELECT u.name employee,u.email,r.business_date,b.name branch,r.check_in_at,r.check_out_at,r.worked_minutes,r.late_minutes,r.early_leave_minutes,r.status FROM attendance_records r JOIN users u ON u.id=r.user_id LEFT JOIN branches b ON b.id=r.branch_id WHERE r.company_id=$1 AND ($2::date IS NULL OR r.business_date>=$2) AND ($3::date IS NULL OR r.business_date<=$3) AND ($4::uuid IS NULL OR r.user_id=$4) AND ($5::uuid IS NULL OR r.branch_id=$5) AND ($6::text IS NULL OR r.status=$6) AND ($7::text IS NULL OR u.name ILIKE '%'||$7||'%' OR u.email ILIKE '%'||$7||'%') AND ($8::uuid[] IS NULL OR r.branch_id=ANY($8)) ORDER BY r.business_date DESC LIMIT 10000`,
        [
          req.auth!.companyId,
          p.from ?? null,
          p.to ?? null,
          p.userId ?? null,
          p.branchId ?? null,
          p.status ?? null,
          p.search ?? null,
          branches,
        ],
      )
    ).rows;
    const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const columns = [
      "employee",
      "email",
      "business_date",
      "branch",
      "check_in_at",
      "check_out_at",
      "worked_minutes",
      "late_minutes",
      "early_leave_minutes",
      "status",
    ];
    const csv =
      "\uFEFF" +
      [
        columns.join(","),
        ...rows.map((row) => columns.map((c) => escape(row[c])).join(",")),
      ].join("\r\n");
    await transaction((client) =>
      appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "attendance.export",
        entityType: "attendance_report",
        metadata: { filters: p, rowCount: rows.length },
      }),
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  },
);
attendanceRouter.patch(
  "/admin/records/:id",
  authorizeAny(
    "attendance.records.edit",
    "attendance.manage",
    "attendance.write",
  ),
  async (req, res) => {
    const input = validate(manualSchema, req.body);
    const recordId = String(req.params.id);
    const updated = await transaction(async (client) => {
      const before = (
        await client.query<Record<string, unknown>>(
          "SELECT * FROM attendance_records WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [recordId, req.auth!.companyId],
        )
      ).rows[0];
      if (!before)
        throw new HttpError(
          404,
          "ATTENDANCE_NOT_FOUND",
          "Attendance record not found",
        );
      requireBranch(req, before.branch_id as string | null);
      const row = (
        await client.query(
          `UPDATE attendance_records SET check_in_at=$2,check_out_at=$3,worked_minutes=CASE WHEN $3::timestamptz IS NULL THEN NULL ELSE GREATEST(0,FLOOR(EXTRACT(EPOCH FROM($3::timestamptz-$2::timestamptz))/60))::int END,status='manual',updated_at=now() WHERE id=$1 RETURNING *`,
          [recordId, input.checkInAt, input.checkOutAt],
        )
      ).rows[0];
      await client.query(
        `INSERT INTO attendance_events(record_id,tenant_id,company_id,user_id,branch_id,event_type,business_date,timezone,location_status,source,created_by,reason) SELECT id,tenant_id,company_id,user_id,branch_id,'manual_edit',business_date,timezone,'manual','admin',$2,$3 FROM attendance_records WHERE id=$1`,
        [recordId, req.auth!.userId, input.reason],
      );
      await appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "attendance.manual_update",
        entityType: "attendance_record",
        entityId: recordId,
        before,
        after: row,
        metadata: { reason: input.reason },
      });
      return row;
    });
    res.json({ data: serializeRow(updated) });
  },
);
attendanceRouter.get(
  "/admin/workplaces",
  authorizeAny(
    "attendance.locations.view",
    "attendance.locations",
    "attendance.manage",
  ),
  async (req, res) =>
    res.json({
      data: serializeRows(
        (
          await query(
            `SELECT w.*,b.name branch_name,(SELECT count(*)::int FROM attendance_workplace_assignments a WHERE a.workplace_id=w.id) assigned_users FROM attendance_workplaces w LEFT JOIN branches b ON b.id=w.branch_id WHERE w.company_id=$1 ORDER BY w.name`,
            [req.auth!.companyId],
          )
        ).rows,
      ),
    }),
);
attendanceRouter.post(
  "/admin/workplaces",
  authorizeAny(
    "attendance.locations.manage",
    "attendance.locations",
    "attendance.manage",
  ),
  async (req, res) => {
    const i = validate(workplaceSchema, req.body);
    requireBranch(req, i.branchId ?? null);
    const row = (
      await query(
        `INSERT INTO attendance_workplaces(company_id,branch_id,name,address,latitude,longitude,radius_m,is_active,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          req.auth!.companyId,
          i.branchId ?? null,
          i.name,
          i.address,
          i.latitude,
          i.longitude,
          i.radiusM,
          i.isActive,
          req.auth!.userId,
        ],
      )
    ).rows[0];
    res.status(201).json({ data: serializeRow(row) });
  },
);
attendanceRouter.patch(
  "/admin/workplaces/:id",
  authorizeAny(
    "attendance.locations.manage",
    "attendance.locations",
    "attendance.manage",
  ),
  async (req, res) => {
    const i = validate(workplaceSchema.partial(), req.body);
    const row = await transaction(async (client) => {
      const current = (
        await client.query<
          Record<string, unknown> & { branch_id: string | null }
        >(
          "SELECT * FROM attendance_workplaces WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!current)
        throw new HttpError(404, "WORKPLACE_NOT_FOUND", "Workplace not found");
      requireBranch(req, i.branchId ?? current.branch_id);
      const updated = (
        await client.query(
          `UPDATE attendance_workplaces SET branch_id=COALESCE($3,branch_id),name=COALESCE($4,name),address=COALESCE($5,address),latitude=COALESCE($6,latitude),longitude=COALESCE($7,longitude),radius_m=COALESCE($8,radius_m),is_active=COALESCE($9,is_active),updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING *`,
          [
            req.params.id,
            req.auth!.companyId,
            i.branchId,
            i.name,
            i.address,
            i.latitude,
            i.longitude,
            i.radiusM,
            i.isActive,
          ],
        )
      ).rows[0];
      await appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "attendance.workplace_updated",
        entityType: "attendance_workplace",
        entityId: String(req.params.id),
        before: current,
        after: updated,
      });
      return updated;
    });
    res.json({ data: serializeRow(row) });
  },
);
attendanceRouter.delete(
  "/admin/workplaces/:id",
  authorizeAny(
    "attendance.locations.manage",
    "attendance.locations",
    "attendance.manage",
  ),
  async (req, res) => {
    const { reason } = validate(
      z.object({ reason: z.string().trim().min(1).max(500) }),
      req.body ?? {},
    );
    await transaction(async (client) => {
      const current = (
        await client.query<
          Record<string, unknown> & {
            branch_id: string | null;
            is_active: boolean;
          }
        >(
          "SELECT * FROM attendance_workplaces WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!current)
        throw new HttpError(404, "WORKPLACE_NOT_FOUND", "Workplace not found");
      requireBranch(req, current.branch_id);
      if (current.is_active)
        await client.query(
          "UPDATE attendance_workplaces SET is_active=false,updated_at=now() WHERE id=$1",
          [req.params.id],
        );
      await appendAuditEvent(client, {
        tenantId: req.auth!.tenantId,
        companyId: req.auth!.companyId,
        actorUserId: req.auth!.userId,
        action: "attendance.workplace_archived",
        entityType: "attendance_workplace",
        entityId: String(req.params.id),
        before: current,
        after: { ...current, is_active: false },
        metadata: { reason },
      });
    });
    res.status(204).send();
  },
);
attendanceRouter.post(
  "/admin/workplaces/:id/assignments",
  authorizeAny(
    "attendance.locations.manage",
    "attendance.locations",
    "attendance.manage",
  ),
  async (req, res) => {
    const i = validate(assignmentSchema, req.body);
    await transaction(async (client) => {
      const workplace = (
        await client.query<{ id: string }>(
          "SELECT id FROM attendance_workplaces WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!workplace)
        throw new HttpError(404, "WORKPLACE_NOT_FOUND", "Workplace not found");
      const valid = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE company_id=$1 AND id=ANY($2::uuid[])",
        [req.auth!.companyId, i.userIds],
      );
      if (valid.rows.length !== i.userIds.length)
        throw new HttpError(
          400,
          "INVALID_EMPLOYEE",
          "One or more employees are invalid",
        );
      await client.query(
        "DELETE FROM attendance_workplace_assignments WHERE workplace_id=$1",
        [req.params.id],
      );
      if (i.userIds.length)
        await client.query(
          "INSERT INTO attendance_workplace_assignments(workplace_id,user_id) SELECT $1,unnest($2::uuid[])",
          [req.params.id, i.userIds],
        );
    });
    res.status(204).send();
  },
);
attendanceRouter.get(
  "/admin/shifts",
  authorizeAny("attendance.manage", "attendance.write"),
  async (req, res) =>
    res.json({
      data: serializeRows(
        (
          await query(
            "SELECT * FROM attendance_shifts WHERE company_id=$1 ORDER BY name",
            [req.auth!.companyId],
          )
        ).rows,
      ),
    }),
);
attendanceRouter.post(
  "/admin/shifts",
  authorizeAny("attendance.manage", "attendance.write"),
  async (req, res) => {
    const i = validate(shiftSchema, req.body);
    const row = (
      await query(
        `INSERT INTO attendance_shifts(company_id,name,name_ar,start_time,end_time,grace_minutes,work_days,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          req.auth!.companyId,
          i.name,
          i.nameAr,
          i.startTime,
          i.endTime,
          i.graceMinutes,
          i.workDays,
          i.isActive,
        ],
      )
    ).rows[0];
    res.status(201).json({ data: serializeRow(row) });
  },
);
attendanceRouter.patch(
  "/admin/shifts/:id",
  authorizeAny("attendance.manage", "attendance.write"),
  async (req, res) => {
    const i = validate(shiftSchema.partial(), req.body);
    const row = (
      await query(
        `UPDATE attendance_shifts SET name=COALESCE($3,name),name_ar=COALESCE($4,name_ar),start_time=COALESCE($5,start_time),end_time=COALESCE($6,end_time),grace_minutes=COALESCE($7,grace_minutes),work_days=COALESCE($8,work_days),is_active=COALESCE($9,is_active),updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING *`,
        [req.params.id, req.auth!.companyId, i.name, i.nameAr, i.startTime, i.endTime, i.graceMinutes, i.workDays, i.isActive],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "SHIFT_NOT_FOUND", "Shift not found");
    res.json({ data: serializeRow(row) });
  },
);
attendanceRouter.delete(
  "/admin/shifts/:id",
  authorizeAny("attendance.manage", "attendance.write"),
  async (req, res) => {
    await transaction(async (client) => {
      const shift = (
        await client.query(
          "SELECT id FROM attendance_shifts WHERE id=$1 AND company_id=$2 FOR UPDATE",
          [req.params.id, req.auth!.companyId],
        )
      ).rows[0];
      if (!shift) throw new HttpError(404, "SHIFT_NOT_FOUND", "Shift not found");
      const assigned = await client.query(
        "SELECT 1 FROM attendance_shift_assignments a JOIN users u ON u.id=a.user_id WHERE a.shift_id=$1 AND u.is_active=true LIMIT 1",
        [req.params.id],
      );
      if (assigned.rowCount)
        throw new HttpError(409, "SHIFT_IN_USE", "Reassign active employees before archiving this shift");
      await client.query(
        "UPDATE attendance_shifts SET is_active=false,updated_at=now() WHERE id=$1",
        [req.params.id],
      );
    });
    res.status(204).send();
  },
);
attendanceRouter.post(
  "/admin/shifts/:id/assignments",
  authorizeAny("attendance.manage", "attendance.write"),
  async (req, res) => {
    const i = validate(
      assignmentSchema.extend({
        effectiveFrom: z.string().date().optional(),
        effectiveTo: z.string().date().nullable().optional(),
      }),
      req.body,
    );
    const shiftId = String(req.params.id);
    await transaction(async (client) => {
      if (
        !(
          await client.query(
            "SELECT 1 FROM attendance_shifts WHERE id=$1 AND company_id=$2",
            [shiftId, req.auth!.companyId],
          )
        ).rowCount
      )
        throw new HttpError(404, "SHIFT_NOT_FOUND", "Shift not found");
      const valid = await client.query(
        "SELECT id FROM users WHERE company_id=$1 AND id=ANY($2::uuid[])",
        [req.auth!.companyId, i.userIds],
      );
      if (valid.rowCount !== i.userIds.length)
        throw new HttpError(
          400,
          "INVALID_EMPLOYEE",
          "One or more employees are invalid",
        );
      for (const userId of i.userIds)
        await client.query(
          `INSERT INTO attendance_shift_assignments(user_id,shift_id,effective_from,effective_to)VALUES($1,$2,COALESCE($3,current_date),$4) ON CONFLICT(user_id)DO UPDATE SET shift_id=excluded.shift_id,effective_from=excluded.effective_from,effective_to=excluded.effective_to`,
          [userId, shiftId, i.effectiveFrom ?? null, i.effectiveTo ?? null],
        );
    });
    res.status(204).send();
  },
);
attendanceRouter.get(
  "/admin/settings",
  authorizeAny("attendance.locations", "attendance.manage"),
  async (req, res) =>
    res.json({
      data: serializeRow(
        (
          await query(
            "SELECT timezone,attendance_location_required,attendance_max_accuracy_m,attendance_location_max_age_seconds FROM companies WHERE id=$1",
            [req.auth!.companyId],
          )
        ).rows[0],
      ),
    }),
);
attendanceRouter.patch(
  "/admin/settings",
  authorizeAny("attendance.locations", "attendance.manage"),
  async (req, res) => {
    const i = validate(
      z.object({
        timezone: z.string().min(1).max(100).optional(),
        locationRequired: z.boolean().optional(),
        maxAccuracyM: z.number().int().min(10).max(5000).optional(),
        locationMaxAgeSeconds: z.number().int().min(10).max(3600).optional(),
      }),
      req.body,
    );
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
        `UPDATE companies SET timezone=COALESCE($2,timezone),attendance_location_required=COALESCE($3,attendance_location_required),attendance_max_accuracy_m=COALESCE($4,attendance_max_accuracy_m),attendance_location_max_age_seconds=COALESCE($5,attendance_location_max_age_seconds),updated_at=now() WHERE id=$1 RETURNING timezone,attendance_location_required,attendance_max_accuracy_m,attendance_location_max_age_seconds`,
        [
          req.auth!.companyId,
          i.timezone,
          i.locationRequired,
          i.maxAccuracyM,
          i.locationMaxAgeSeconds,
        ],
      )
    ).rows[0];
    res.json({ data: serializeRow(row) });
  },
);
