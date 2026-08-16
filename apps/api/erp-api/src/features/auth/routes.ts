import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { loginSchema } from '@erp/contracts';
import { env } from '../../config/env.js';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRow } from '../../lib/rows.js';
import { authenticate } from './middleware.js';

type UserRow = { id: string; tenant_id: string; company_id: string; email: string; password_hash: string; name: string; role: string; permissions: string[] };
export const authRouter = Router();

const refreshSchema = z.object({ refreshToken: z.string().min(32).max(512) });
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newRefreshToken = () => crypto.randomBytes(48).toString('base64url');
function signAccessToken(user: UserRow) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(
    { tenantId: user.tenant_id, companyId: user.company_id, role: user.role, permissions: user.permissions },
    env.JWT_SECRET,
    { ...options, subject: user.id },
  );
}

authRouter.post('/login', async (request, response) => {
  const input = validate(loginSchema, request.body);
  const result = await query<UserRow>(
    `SELECT u.id, u.tenant_id, u.company_id, u.email, u.password_hash, u.name, u.role,
      COALESCE(array_agg(rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL), '{}') permissions
     FROM users u LEFT JOIN role_permissions rp ON rp.role = u.role
     WHERE lower(u.email) = lower($1) AND u.is_active = true
       AND ($2::uuid IS NULL OR u.tenant_id = $2)
     GROUP BY u.id`,
    [input.email, input.tenantId ?? null],
  );
  if (result.rows.length > 1) {
    throw new HttpError(409, 'TENANT_REQUIRED', 'Tenant identifier is required for this account');
  }
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  const accessToken = signAccessToken(user);
  const refreshToken = newRefreshToken();
  await query(
    `INSERT INTO auth_refresh_tokens(user_id,tenant_id,token_hash,family_id,expires_at)
     VALUES($1,$2,$3,gen_random_uuid(),now()+($4 || ' days')::interval)`,
    [user.id, user.tenant_id, tokenHash(refreshToken), env.REFRESH_TOKEN_DAYS],
  );
  const safeUser = { id: user.id, tenant_id: user.tenant_id, company_id: user.company_id, email: user.email, name: user.name, role: user.role, permissions: user.permissions };
  response.json({ data: { accessToken, refreshToken, user: serializeRow(safeUser) } });
});

authRouter.post('/refresh', async (request, response) => {
  const input = validate(refreshSchema, request.body);
  const oldHash = tokenHash(input.refreshToken);
  const rotatedToken = newRefreshToken();
  const rotatedHash = tokenHash(rotatedToken);
  const user = await transaction(async (client) => {
    const token = (await client.query<{ id: string; user_id: string; family_id: string; revoked_at: string | null }>(
      `SELECT id,user_id,family_id,revoked_at FROM auth_refresh_tokens
       WHERE token_hash=$1 AND expires_at>now() FOR UPDATE`, [oldHash],
    )).rows[0];
    if (!token || token.revoked_at) {
      if (token) await client.query('UPDATE auth_refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=$1', [token.family_id]);
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }
    const current = (await client.query<UserRow>(
      `SELECT u.id,u.tenant_id,u.company_id,u.email,u.password_hash,u.name,u.role,
       COALESCE(array_agg(rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL),'{}') permissions
       FROM users u LEFT JOIN role_permissions rp ON rp.role=u.role
       WHERE u.id=$1 AND u.is_active=true GROUP BY u.id`, [token.user_id],
    )).rows[0];
    if (!current) throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    await client.query('UPDATE auth_refresh_tokens SET revoked_at=now(),replaced_by_hash=$2 WHERE id=$1', [token.id, rotatedHash]);
    await client.query(
      `INSERT INTO auth_refresh_tokens(user_id,tenant_id,token_hash,family_id,expires_at)
       VALUES($1,$2,$3,$4,now()+($5 || ' days')::interval)`,
      [current.id, current.tenant_id, rotatedHash, token.family_id, env.REFRESH_TOKEN_DAYS],
    );
    return current;
  });
  response.json({ data: { accessToken: signAccessToken(user), refreshToken: rotatedToken } });
});

authRouter.post('/logout', async (request, response) => {
  const input = validate(refreshSchema, request.body);
  await query('UPDATE auth_refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=$1', [tokenHash(input.refreshToken)]);
  response.status(204).send();
});

authRouter.get('/me', authenticate, async (request, response) => {
  const result = await query(
    `SELECT u.id, u.tenant_id, u.company_id, u.email, u.name, u.role,
      COALESCE(array_agg(rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL), '{}') permissions
     FROM users u LEFT JOIN role_permissions rp ON rp.role = u.role WHERE u.id = $1 GROUP BY u.id`,
    [request.auth!.userId],
  );
  if (!result.rows[0]) throw new HttpError(404, 'USER_NOT_FOUND', 'User no longer exists');
  response.json({ data: serializeRow(result.rows[0]) });
});
