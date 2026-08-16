import { Router } from "express";
import { z } from "zod";
import { query, transaction } from "../../db/client.js";
import { HttpError, validate } from "../../lib/http.js";
import { serializeRows } from "../../lib/rows.js";
import { appendAuditEvent } from "../audit/routes.js";

export const platformRouter = Router();

function requirePlatformAdmin(req: import("express").Request) {
  if (req.auth!.role !== "super_admin")
    throw new HttpError(403, "PLATFORM_ADMIN_ONLY", "This area is restricted to platform administrators");
}

platformRouter.get("/companies", async (req, res) => {
  requirePlatformAdmin(req);
  const rows = await query(
    `SELECT c.id, c.tenant_id, c.name, c.name_ar, c.subscription_status, c.trial_ends_at, c.created_at,
       t.slug tenant_slug,
       (SELECT count(*)::int FROM users u WHERE u.company_id = c.id) user_count,
       (SELECT json_build_object('name', u.name, 'email', u.email)
          FROM users u WHERE u.company_id = c.id AND u.role = 'company_owner'
          ORDER BY u.created_at ASC LIMIT 1) owner
     FROM companies c JOIN tenants t ON t.id = c.tenant_id
     WHERE c.id <> $1
     ORDER BY c.created_at DESC`,
    [req.auth!.companyId],
  );
  res.json({ data: serializeRows(rows.rows) });
});

const statusSchema = z.object({
  subscriptionStatus: z.enum(["trial", "active", "suspended", "canceled"]).optional(),
  extendTrialDays: z.number().int().positive().max(365).optional(),
});

platformRouter.patch("/companies/:id", async (req, res) => {
  requirePlatformAdmin(req);
  if (req.params.id === req.auth!.companyId)
    throw new HttpError(400, "CANNOT_MODIFY_PLATFORM_COMPANY", "Cannot modify the platform's own company");
  const input = validate(statusSchema, req.body);
  const row = await transaction(async (client) => {
    const before = (
      await client.query<Record<string, unknown>>(
        "SELECT * FROM companies WHERE id=$1 FOR UPDATE",
        [req.params.id],
      )
    ).rows[0];
    if (!before) throw new HttpError(404, "COMPANY_NOT_FOUND", "Company not found");
    const updated = (
      await client.query(
        `UPDATE companies SET
           subscription_status = COALESCE($2, subscription_status),
           trial_ends_at = CASE WHEN $3::int IS NOT NULL THEN COALESCE(trial_ends_at, now()) + ($3 || ' days')::interval ELSE trial_ends_at END,
           updated_at = now()
         WHERE id=$1 RETURNING *`,
        [req.params.id, input.subscriptionStatus ?? null, input.extendTrialDays ?? null],
      )
    ).rows[0];
    await appendAuditEvent(client, {
      tenantId: req.auth!.tenantId,
      companyId: req.auth!.companyId,
      actorUserId: req.auth!.userId,
      action: "platform.company_updated",
      entityType: "company",
      entityId: String(req.params.id),
      before,
      after: updated,
    });
    return updated;
  });
  res.json({ data: row });
});

platformRouter.delete("/companies/:id", async (req, res) => {
  requirePlatformAdmin(req);
  if (req.params.id === req.auth!.companyId)
    throw new HttpError(400, "CANNOT_DELETE_PLATFORM_COMPANY", "Cannot delete the platform's own company");
  await transaction(async (client) => {
    const company = (
      await client.query<{ id: string; tenant_id: string; name: string }>(
        "SELECT id, tenant_id, name FROM companies WHERE id=$1 FOR UPDATE",
        [req.params.id],
      )
    ).rows[0];
    if (!company) throw new HttpError(404, "COMPANY_NOT_FOUND", "Company not found");
    await appendAuditEvent(client, {
      tenantId: req.auth!.tenantId,
      companyId: req.auth!.companyId,
      actorUserId: req.auth!.userId,
      action: "platform.company_deleted",
      entityType: "company",
      entityId: company.id,
      before: company,
    });
    await client.query("DELETE FROM tenants WHERE id=$1", [company.tenant_id]);
  });
  res.status(204).send();
});
