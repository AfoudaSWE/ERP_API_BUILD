import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http.js';
import { query } from '../../db/client.js';

type TokenPayload = { sub: string; tenantId: string; companyId: string; role: string; permissions: string[] };

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication is required'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const current = (await query<{ role: string; permission_code: string | null; scope_level: string | null }>(`SELECT u.role,p.permission_code,COALESCE(dr.scope_level,cr.scope_level) scope_level FROM users u LEFT JOIN default_roles dr ON dr.code=u.role LEFT JOIN custom_roles cr ON cr.company_id=u.company_id AND cr.code=u.role LEFT JOIN LATERAL(SELECT permission_code FROM role_permissions WHERE role=u.role UNION SELECT permission_code FROM custom_role_permissions WHERE company_id=u.company_id AND role=u.role)p ON true WHERE u.id=$1 AND u.tenant_id=$2 AND u.company_id=$3 AND u.is_active=true AND (dr.code IS NOT NULL OR cr.is_active=true)`, [payload.sub, payload.tenantId, payload.companyId])).rows;
    if (!current.length) return next(new HttpError(401, 'INACTIVE_OR_UNASSIGNED_USER', 'User is inactive or no longer belongs to this company'));
    let companyId = payload.companyId;
    const requestedCompany = request.header('x-company-id');
    if (requestedCompany && requestedCompany !== companyId) {
      if (current[0].role !== 'super_admin') return next(new HttpError(403, 'COMPANY_SCOPE_FORBIDDEN', 'You cannot access another company'));
      const allowed = await query('SELECT 1 FROM companies WHERE id=$1', [requestedCompany]);
      if (!allowed.rowCount) return next(new HttpError(404, 'COMPANY_NOT_FOUND', 'Company not found'));
      companyId = requestedCompany;
    }
    const subscription = (
      await query<{ subscription_status: string; trial_ends_at: string | null }>(
        'SELECT subscription_status, trial_ends_at FROM companies WHERE id=$1',
        [companyId],
      )
    ).rows[0];
    if (subscription) {
      if (subscription.subscription_status === 'suspended' || subscription.subscription_status === 'canceled') {
        return next(new HttpError(402, 'SUBSCRIPTION_INACTIVE', 'This company subscription is not active'));
      }
      if (
        subscription.subscription_status === 'trial' &&
        subscription.trial_ends_at &&
        new Date(subscription.trial_ends_at).getTime() < Date.now()
      ) {
        return next(new HttpError(402, 'TRIAL_EXPIRED', 'The free trial for this company has ended'));
      }
    }
    const scopeLevel = current[0].scope_level ?? 'branch';
    const branches = ['system', 'company'].includes(scopeLevel) ? null : (await query<{ branch_id: string }>('SELECT uba.branch_id FROM user_branch_assignments uba JOIN branches b ON b.id=uba.branch_id WHERE uba.user_id=$1 AND b.company_id=$2 AND b.is_active=true', [payload.sub, companyId])).rows.map((row) => row.branch_id);
    request.auth = { userId: payload.sub, tenantId: payload.tenantId, companyId, role: current[0].role, permissions: current.flatMap((row) => row.permission_code ? [row.permission_code] : []), branchIds: branches };
    next();
  } catch {
    next(new HttpError(401, 'INVALID_TOKEN', 'The access token is invalid or expired'));
  }
}

export function authorize(permission: string) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth?.permissions.includes(permission)) {
      return next(new HttpError(403, 'FORBIDDEN', `Missing permission: ${permission}`));
    }
    next();
  };
}

export function authorizeAny(...permissions: string[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!permissions.some((permission) => request.auth?.permissions.includes(permission))) {
      return next(new HttpError(403, 'FORBIDDEN', `Missing permission: ${permissions[0]}`));
    }
    next();
  };
}
