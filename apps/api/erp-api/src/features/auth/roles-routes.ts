import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRows } from '../../lib/rows.js';
import { appendAuditEvent } from '../audit/routes.js';
import { authorizeAny } from './middleware.js';

export const rolesRouter = Router();

export async function assertAssignable(actor: Express.Request['auth'] & {}, role: string) {
  const target = await query<{ access_rank: number | null; permissions: string[] }>(`SELECT dr.access_rank,COALESCE(array_agg(p.permission_code) FILTER(WHERE p.permission_code IS NOT NULL),'{}') permissions FROM (SELECT $1::text code)x LEFT JOIN default_roles dr ON dr.code=x.code LEFT JOIN custom_roles cr ON cr.code=x.code AND cr.company_id=$2 AND cr.is_active=true LEFT JOIN LATERAL(SELECT permission_code FROM custom_role_permissions WHERE company_id=$2 AND role=x.code UNION ALL SELECT permission_code FROM role_permissions WHERE role=x.code AND NOT EXISTS(SELECT 1 FROM custom_role_permissions crp WHERE crp.company_id=$2 AND crp.role=x.code))p ON true WHERE dr.code IS NOT NULL OR cr.code IS NOT NULL GROUP BY dr.access_rank`, [role,actor.companyId]);
  if (!target.rows[0]?.permissions.length) throw new HttpError(400, 'INVALID_ROLE', 'The selected role is not configured');
  const actorRank = (await query<{ access_rank: number }>('SELECT access_rank FROM default_roles WHERE code=$1', [actor.role])).rows[0]?.access_rank ?? 100;
  if (actor.role !== 'super_admin' && target.rows[0].access_rank !== null && target.rows[0].access_rank < actorRank) throw new HttpError(403, 'ROLE_SCOPE_FORBIDDEN', 'You cannot assign a role above your authority');
  if (actor.role !== 'super_admin' && target.rows[0].access_rank === null) {
    const beyondScope = target.rows[0].permissions.filter((permission) => !actor.permissions.includes(permission));
    if (beyondScope.length) throw new HttpError(403, 'PERMISSION_DELEGATION_FORBIDDEN', 'You cannot grant permissions outside your own scope');
  }
}

rolesRouter.get('/', authorizeAny('roles.read'), async (request, response) => {
  const result = await query<{ role: string; name: string | null; name_ar: string | null; description: string | null; description_ar: string | null; scope_level: string | null; access_rank: number | null; permissions: string[]; is_default: boolean; is_active: boolean }>(
    `SELECT roles.role,COALESCE(dr.name,cr.name) name,COALESCE(dr.name_ar,cr.name_ar) name_ar,COALESCE(dr.description,cr.description) description,COALESCE(dr.description_ar,cr.description_ar) description_ar,COALESCE(dr.scope_level,cr.scope_level) scope_level,dr.access_rank,
      COALESCE((SELECT array_agg(p.permission_code ORDER BY p.permission_code) FROM(SELECT permission_code FROM custom_role_permissions WHERE company_id=$1 AND role=roles.role UNION ALL SELECT permission_code FROM role_permissions WHERE role=roles.role AND NOT EXISTS(SELECT 1 FROM custom_role_permissions crp WHERE crp.company_id=$1 AND crp.role=roles.role))p),'{}') permissions,
      (dr.code IS NOT NULL) is_default,COALESCE(cr.is_active,true) is_active
     FROM (SELECT code role FROM default_roles UNION SELECT code FROM custom_roles WHERE company_id=$1) roles
     LEFT JOIN default_roles dr ON dr.code=roles.role LEFT JOIN custom_roles cr ON cr.code=roles.role AND cr.company_id=$1
     ORDER BY COALESCE(dr.access_rank,999),roles.role`, [request.auth!.companyId],
  );
  response.json({ data: serializeRows(result.rows) });
});

rolesRouter.get('/permissions', authorizeAny('roles.read'), async (_request, response) => {
  response.json({ data: serializeRows((await query(`SELECT code,description,split_part(code,'.',1) module,split_part(code,'.',2) action FROM permissions ORDER BY code`)).rows) });
});

const customRoleSchema=z.object({
  code:z.string().trim().min(2).max(50).regex(/^[a-z][a-z0-9_]*$/),name:z.string().trim().min(2).max(120),nameAr:z.string().trim().max(120).default(""),
  description:z.string().trim().max(300).default(""),descriptionAr:z.string().trim().max(300).default(""),scopeLevel:z.enum(["company","branch","self"]).default("company"),
  permissionCodes:z.array(z.string().min(3).max(100)).min(1).max(300),isActive:z.boolean().default(true),
});
async function assertDelegablePermissions(actor:Express.Request['auth']&{},codes:string[]){
  const unique=[...new Set(codes)];
  const valid=(await query<{code:string}>("SELECT code FROM permissions WHERE code=ANY($1::text[])",[unique])).rows.map(row=>row.code);
  if(valid.length!==unique.length)throw new HttpError(400,"INVALID_PERMISSION","One or more permissions are invalid");
  if(actor.role!=="super_admin"){const outside=unique.filter(code=>!actor.permissions.includes(code));if(outside.length)throw new HttpError(403,"PERMISSION_DELEGATION_FORBIDDEN","You cannot grant permissions outside your own role",{permissions:outside});}
  return unique;
}
rolesRouter.post("/custom",authorizeAny("roles.create","roles.manage"),async(request,response)=>{
  const input=validate(customRoleSchema,request.body),codes=await assertDelegablePermissions(request.auth!,input.permissionCodes);
  const row=await transaction(async client=>{if((await client.query("SELECT 1 FROM default_roles WHERE code=$1",[input.code])).rowCount)throw new HttpError(409,"ROLE_CODE_RESERVED","This role code is reserved");
    const created=(await client.query(`INSERT INTO custom_roles(company_id,code,name,name_ar,description,description_ar,scope_level,is_active,created_by)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)RETURNING *`,[request.auth!.companyId,input.code,input.name,input.nameAr,input.description,input.descriptionAr,input.scopeLevel,input.isActive,request.auth!.userId])).rows[0];
    await client.query("INSERT INTO custom_role_permissions(company_id,role,permission_code)SELECT $1,$2,unnest($3::text[])",[request.auth!.companyId,input.code,codes]);
    await appendAuditEvent(client,{tenantId:request.auth!.tenantId,companyId:request.auth!.companyId,actorUserId:request.auth!.userId,action:"role.created",entityType:"custom_role",after:{...created,permissionCodes:codes}});return created;});response.status(201).json({data:row});
});
rolesRouter.patch("/custom/:code",authorizeAny("roles.update","roles.manage"),async(request,response)=>{
  const input=validate(customRoleSchema.omit({code:true}),request.body),codes=await assertDelegablePermissions(request.auth!,input.permissionCodes);
  const row=await transaction(async client=>{const before=(await client.query("SELECT * FROM custom_roles WHERE company_id=$1 AND code=$2 FOR UPDATE",[request.auth!.companyId,request.params.code])).rows[0];if(!before)throw new HttpError(404,"CUSTOM_ROLE_NOT_FOUND","Custom role not found");
    const updated=(await client.query(`UPDATE custom_roles SET name=$3,name_ar=$4,description=$5,description_ar=$6,scope_level=$7,is_active=$8,updated_at=now() WHERE company_id=$1 AND code=$2 RETURNING *`,[request.auth!.companyId,request.params.code,input.name,input.nameAr,input.description,input.descriptionAr,input.scopeLevel,input.isActive])).rows[0];
    await client.query("DELETE FROM custom_role_permissions WHERE company_id=$1 AND role=$2",[request.auth!.companyId,request.params.code]);await client.query("INSERT INTO custom_role_permissions(company_id,role,permission_code)SELECT $1,$2,unnest($3::text[])",[request.auth!.companyId,request.params.code,codes]);
    await appendAuditEvent(client,{tenantId:request.auth!.tenantId,companyId:request.auth!.companyId,actorUserId:request.auth!.userId,action:"role.updated",entityType:"custom_role",before,after:{...updated,permissionCodes:codes}});return updated;});response.json({data:row});
});
rolesRouter.delete("/custom/:code",authorizeAny("roles.delete","roles.manage"),async(request,response)=>{await transaction(async client=>{const role=(await client.query("SELECT * FROM custom_roles WHERE company_id=$1 AND code=$2 FOR UPDATE",[request.auth!.companyId,request.params.code])).rows[0];if(!role)throw new HttpError(404,"CUSTOM_ROLE_NOT_FOUND","Custom role not found");if((await client.query("SELECT 1 FROM users WHERE company_id=$1 AND role=$2 LIMIT 1",[request.auth!.companyId,request.params.code])).rowCount)throw new HttpError(409,"ROLE_IN_USE","Reassign users before deleting this role");await client.query("DELETE FROM custom_roles WHERE company_id=$1 AND code=$2",[request.auth!.companyId,request.params.code]);await appendAuditEvent(client,{tenantId:request.auth!.tenantId,companyId:request.auth!.companyId,actorUserId:request.auth!.userId,action:"role.deleted",entityType:"custom_role",before:role});});response.status(204).send();});

rolesRouter.put('/:role/permissions', authorizeAny('roles.update', 'roles.manage'), async (request, response) => {
  const role = String(request.params.role);
  if (role === 'super_admin') throw new HttpError(403, 'FORBIDDEN', 'This role cannot be edited');
  const input = validate(z.object({ permissionCodes: z.array(z.string().min(3).max(100)).min(1).max(300) }), request.body);
  const exists = await query('SELECT 1 FROM default_roles WHERE code=$1 UNION SELECT 1 FROM custom_roles WHERE code=$1 AND company_id=$2', [role, request.auth!.companyId]);
  if (!exists.rowCount) throw new HttpError(404, 'ROLE_NOT_FOUND', 'Role not found');
  const codes = await assertDelegablePermissions(request.auth!, input.permissionCodes);
  await transaction(async (client) => {
    // custom_role_permissions.(company_id,role) has a FK into custom_roles(company_id,code); overriding a
    // default role's permissions for this company requires a shadow custom_roles row to satisfy that FK.
    await client.query(
      `INSERT INTO custom_roles(company_id,code,name,name_ar,description,description_ar,scope_level,is_active,created_by)
       SELECT $1,$2,COALESCE(dr.name,$2),COALESCE(dr.name_ar,''),COALESCE(dr.description,''),COALESCE(dr.description_ar,''),COALESCE(dr.scope_level,'company'),true,$3
       FROM (SELECT $2::text code) x LEFT JOIN default_roles dr ON dr.code=x.code
       ON CONFLICT (company_id,code) DO NOTHING`,
      [request.auth!.companyId, role, request.auth!.userId],
    );
    const before = (await client.query<{ permission_code: string }>('SELECT permission_code FROM custom_role_permissions WHERE company_id=$1 AND role=$2', [request.auth!.companyId, role])).rows.map((r) => r.permission_code);
    await client.query('DELETE FROM custom_role_permissions WHERE company_id=$1 AND role=$2', [request.auth!.companyId, role]);
    if (codes.length) await client.query('INSERT INTO custom_role_permissions(company_id,role,permission_code)SELECT $1,$2,unnest($3::text[])', [request.auth!.companyId, role, codes]);
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: 'role.permissions_updated', entityType: 'role', before: { permissionCodes: before }, after: { role, permissionCodes: codes } });
  });
  response.json({ data: { role, permissionCodes: codes } });
});

rolesRouter.get('/users', authorizeAny('roles.read'), async (request, response) => {
  const result = await query('SELECT id,email,name,role,is_active,created_at FROM users WHERE tenant_id=$1 AND company_id=$2 ORDER BY name', [request.auth!.tenantId, request.auth!.companyId]);
  response.json({ data: serializeRows(result.rows) });
});

rolesRouter.post('/users', authorizeAny('roles.create', 'roles.manage'), async (request, response) => {
  const input = validate(z.object({ name: z.string().min(2).max(120), email: z.email(), password: z.string().min(8), role: z.string().min(2).max(50) }), request.body);
  await assertAssignable(request.auth!, input.role);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const data = await transaction(async (client) => {
    const row = (await client.query(`INSERT INTO users(tenant_id,company_id,email,password_hash,name,role) VALUES($1,$2,lower($3),$4,$5,$6) RETURNING id,email,name,role,is_active,created_at`, [request.auth!.tenantId, request.auth!.companyId, input.email, passwordHash, input.name, input.role])).rows[0];
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: 'user.created', entityType: 'user', entityId: row.id, after: { role: input.role }, metadata: { requestId: request.requestId } });
    return row;
  });
  response.status(201).json({ data: serializeRows([data])[0] });
});

rolesRouter.patch('/users/:id/role', authorizeAny('roles.update', 'roles.manage'), async (request, response) => {
  const input = validate(z.object({ role: z.string().min(2).max(50), confirmSensitive: z.literal(true) }), request.body);
  await assertAssignable(request.auth!, input.role);
  const data = await transaction(async (client) => {
    const before = (await client.query<{ role: string }>('SELECT role FROM users WHERE id=$1 AND tenant_id=$2 AND company_id=$3 FOR UPDATE', [request.params.id, request.auth!.tenantId, request.auth!.companyId])).rows[0];
    if (!before) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    const row = (await client.query(`UPDATE users SET role=$1,updated_at=now() WHERE id=$2 RETURNING id,email,name,role,is_active,updated_at`, [input.role, request.params.id])).rows[0];
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: 'user.role_changed', entityType: 'user', entityId: String(request.params.id), before: { role: before.role }, after: { role: input.role }, metadata: { requestId: request.requestId } });
    return row;
  });
  response.json({ data: serializeRows([data])[0] });
});

rolesRouter.delete('/users/:id', authorizeAny('roles.delete', 'roles.manage'), async (request, response) => {
  if (request.params.id === request.auth!.userId) throw new HttpError(400, 'SELF_DELETE', 'You cannot delete your own account');
  await transaction(async (client) => {
    const deleted = await client.query<{ id: string; role: string }>('DELETE FROM users WHERE id=$1 AND tenant_id=$2 AND company_id=$3 RETURNING id,role', [request.params.id, request.auth!.tenantId, request.auth!.companyId]);
    if (!deleted.rows[0]) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    await appendAuditEvent(client, { tenantId: request.auth!.tenantId, companyId: request.auth!.companyId, actorUserId: request.auth!.userId, action: 'user.deleted', entityType: 'user', entityId: String(request.params.id), before: { role: deleted.rows[0].role }, metadata: { requestId: request.requestId } });
  });
  response.status(204).send();
});
