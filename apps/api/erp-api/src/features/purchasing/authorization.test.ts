import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { pool } from '../../db/client.js';
import { databaseAvailable } from '../../test/db.js';

async function token(role: string) {
  const user = (await pool.query<{ id: string; tenant_id: string; company_id: string }>('SELECT id,tenant_id,company_id FROM users WHERE role=$1 LIMIT 1', [role])).rows[0];
  return jwt.sign({ tenantId: user.tenant_id, companyId: user.company_id, role, permissions: [] }, env.JWT_SECRET, { subject: user.id, expiresIn: '5m' });
}

describe('purchasing authorization and company isolation', () => {
  it('rejects purchase mutations without purchases.write', async () => {
    const response = await request(createApp()).post('/api/purchase-orders').set('Authorization', `Bearer ${await token('employee')}`).set('Idempotency-Key', 'authorization-test-key').send({});
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('does not expose another company purchase order', async () => {
    if (!(await databaseAvailable())) return;
    const otherCompany = '00000000-0000-4000-8000-000000000099';
    const response = await request(createApp()).get('/api/purchase-orders').set('Authorization', `Bearer ${await token('business_owner')}`).set('x-company-id', otherCompany);
    expect(response.status).toBe(403);
  });
});

afterAll(async () => { await pool.end(); });
