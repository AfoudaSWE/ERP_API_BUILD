import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { loginSchema, signupSchema } from '@erp/contracts';
import { env } from '../../config/env.js';
import { query, transaction } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRow } from '../../lib/rows.js';
import { sendMail } from '../../lib/mailer.js';
import { authenticate } from './middleware.js';

type UserRow = { id: string; tenant_id: string; company_id: string; email: string; password_hash: string; name: string; role: string; permissions: string[] };
export const authRouter = Router();

const refreshSchema = z.object({ refreshToken: z.string().min(32).max(512) });
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newRefreshToken = () => crypto.randomBytes(48).toString('base64url');
function signAccessToken(user: Pick<UserRow, 'id' | 'tenant_id' | 'company_id' | 'role' | 'permissions'>) {
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
  if (user.role !== 'super_admin') {
    const company = (await query<{ subscription_status: string }>('SELECT subscription_status FROM companies WHERE id=$1', [user.company_id])).rows[0];
    if (company?.subscription_status === 'pending_approval') {
      throw new HttpError(402, 'PENDING_APPROVAL', 'This company is awaiting approval before it can be used');
    }
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

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'company';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

async function createCompanyAndOwner(input: { companyName: string; companyNameAr: string; name: string; email: string; passwordHash: string }) {
  const existing = await query('SELECT 1 FROM users WHERE lower(email)=lower($1)', [input.email]);
  if (existing.rowCount) {
    throw new HttpError(409, 'EMAIL_IN_USE', 'This email is already registered');
  }
  const existingCompany = await query(
    'SELECT 1 FROM companies WHERE lower(btrim(name))=lower(btrim($1))',
    [input.companyName],
  );
  if (existingCompany.rowCount) {
    throw new HttpError(409, 'COMPANY_NAME_IN_USE', 'This company name is already registered');
  }
  const user = await transaction(async (client) => {
    const tenant = (
      await client.query<{ id: string }>(
        `INSERT INTO tenants(name,slug)VALUES($1,$2)RETURNING id`,
        [input.companyName, slugify(input.companyName)],
      )
    ).rows[0];
    const company = (
      await client.query<{ id: string }>(
        `INSERT INTO companies(tenant_id,name,name_ar,subscription_status)
         VALUES($1,$2,$3,'pending_approval')RETURNING id`,
        [tenant.id, input.companyName, input.companyNameAr],
      )
    ).rows[0];
    const createdUser = (
      await client.query<{ id: string; tenant_id: string; company_id: string; email: string; name: string; role: string }>(
        `INSERT INTO users(tenant_id,company_id,email,password_hash,name,role)
         VALUES($1,$2,lower($3),$4,$5,'company_owner')RETURNING id,tenant_id,company_id,email,name,role`,
        [tenant.id, company.id, input.email, input.passwordHash, input.name],
      )
    ).rows[0];
    await client.query(
      `INSERT INTO branches(company_id,code,name,name_ar) VALUES($1,'MAIN','Main Branch',$2)`,
      [company.id, input.companyNameAr ? `${input.companyNameAr} - الفرع الرئيسي` : 'الفرع الرئيسي'],
    );
    return createdUser;
  });
  if (env.PLATFORM_APPROVAL_EMAIL) {
    void sendMail({
      to: env.PLATFORM_APPROVAL_EMAIL,
      subject: `New subscriber: ${input.companyName}`,
      html: `<p>A new subscriber signed up on ClubGenies ERP and is waiting for approval.</p>
        <ul>
          <li><strong>Company:</strong> ${input.companyName}${input.companyNameAr ? ` (${input.companyNameAr})` : ''}</li>
          <li><strong>Owner:</strong> ${input.name}</li>
          <li><strong>Email:</strong> ${input.email}</li>
        </ul>
        <p>Open the platform admin panel to approve or reject this company.</p>`,
    });
  }
  return user;
}

async function issueSession(user: { id: string; tenant_id: string; company_id: string; email: string; name: string; role: string }) {
  const permissions = (
    await query<{ permission_code: string }>('SELECT permission_code FROM role_permissions WHERE role=$1', [user.role])
  ).rows.map((row) => row.permission_code);
  const fullUser = { ...user, permissions };
  const accessToken = signAccessToken(fullUser);
  const refreshToken = newRefreshToken();
  await query(
    `INSERT INTO auth_refresh_tokens(user_id,tenant_id,token_hash,family_id,expires_at)
     VALUES($1,$2,$3,gen_random_uuid(),now()+($4 || ' days')::interval)`,
    [user.id, user.tenant_id, tokenHash(refreshToken), env.REFRESH_TOKEN_DAYS],
  );
  const safeUser = { id: user.id, tenant_id: user.tenant_id, company_id: user.company_id, email: user.email, name: user.name, role: user.role, permissions };
  return { accessToken, refreshToken, user: serializeRow(safeUser) };
}

authRouter.post('/signup', async (request, response) => {
  const input = validate(signupSchema, request.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await createCompanyAndOwner({ companyName: input.companyName, companyNameAr: input.companyNameAr, name: input.name, email: input.email, passwordHash });
  const session = await issueSession(user);
  response.status(201).json({ data: { ...session, pendingApproval: true } });
});

let googleClient: OAuth2Client | null = null;
function getGoogleClient() {
  if (!env.GOOGLE_CLIENT_ID) return null;
  if (!googleClient) googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  return googleClient;
}

const googleAuthSchema = z.object({
  idToken: z.string().min(20),
  companyName: z.string().trim().min(2).max(120).optional(),
  companyNameAr: z.string().trim().max(120).default(''),
});

authRouter.post('/google', async (request, response) => {
  const client = getGoogleClient();
  if (!client) throw new HttpError(503, 'GOOGLE_SIGNIN_UNAVAILABLE', 'Sign in with Google is not configured');
  const input = validate(googleAuthSchema, request.body);
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: input.idToken, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, 'INVALID_GOOGLE_TOKEN', 'Could not verify the Google sign-in token');
  }
  if (!payload?.email || !payload.email_verified) {
    throw new HttpError(400, 'GOOGLE_EMAIL_UNVERIFIED', 'Your Google account email is not verified');
  }
  const email = payload.email;
  const name = payload.name || email.split('@')[0];

  const existingResult = await query<UserRow>(
    `SELECT u.id, u.tenant_id, u.company_id, u.email, u.password_hash, u.name, u.role,
      COALESCE(array_agg(rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL), '{}') permissions
     FROM users u LEFT JOIN role_permissions rp ON rp.role = u.role
     WHERE lower(u.email) = lower($1) AND u.is_active = true
     GROUP BY u.id`,
    [email],
  );
  const existingUser = existingResult.rows[0];

  if (existingUser) {
    if (existingUser.role !== 'super_admin') {
      const company = (await query<{ subscription_status: string }>('SELECT subscription_status FROM companies WHERE id=$1', [existingUser.company_id])).rows[0];
      if (company?.subscription_status === 'pending_approval') {
        throw new HttpError(402, 'PENDING_APPROVAL', 'This company is awaiting approval before it can be used');
      }
    }
    const session = await issueSession(existingUser);
    response.json({ data: session });
    return;
  }

  if (!input.companyName) {
    throw new HttpError(400, 'COMPANY_NAME_REQUIRED', 'A company name is required to create a new account');
  }
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
  const user = await createCompanyAndOwner({ companyName: input.companyName, companyNameAr: input.companyNameAr, name, email, passwordHash });
  const session = await issueSession(user);
  response.status(201).json({ data: { ...session, pendingApproval: true } });
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
      COALESCE(array_agg(p.permission_code) FILTER (WHERE p.permission_code IS NOT NULL), '{}') permissions
     FROM users u
     LEFT JOIN LATERAL(
       SELECT permission_code FROM custom_role_permissions WHERE company_id=u.company_id AND role=u.role
       UNION ALL
       SELECT permission_code FROM role_permissions WHERE role=u.role AND NOT EXISTS(SELECT 1 FROM custom_role_permissions crp WHERE crp.company_id=u.company_id AND crp.role=u.role)
     )p ON true
     WHERE u.id = $1 GROUP BY u.id`,
    [request.auth!.userId],
  );
  if (!result.rows[0]) throw new HttpError(404, 'USER_NOT_FOUND', 'User no longer exists');
  response.json({ data: serializeRow(result.rows[0]) });
});
