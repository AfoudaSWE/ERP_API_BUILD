import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { pool } from './db/client.js';

describe('API', () => {
  it('reports its health without database access', async () => {
    const response = await request(createApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('protects ERP resources', async () => {
    const response = await request(createApp()).get('/api/products');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed login input before database access', async () => {
    const response = await request(createApp()).post('/api/auth/login').send({ email: 'not-an-email', password: 'short' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when an authenticated role lacks a module permission', async () => {
    const employee = (await pool.query<{ id: string; tenant_id: string; company_id: string }>("SELECT id,tenant_id,company_id FROM users WHERE role='employee' LIMIT 1")).rows[0];
    const token = jwt.sign(
      { tenantId: employee.tenant_id, companyId: employee.company_id, role: 'employee', permissions: [] },
      env.JWT_SECRET,
      { subject: employee.id, expiresIn: '5m' },
    );
    const response = await request(createApp()).get('/api/products').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('validates AI chat input before querying PostgreSQL or Ollama', async () => {
    const owner = (await pool.query<{ id: string; tenant_id: string; company_id: string }>("SELECT id,tenant_id,company_id FROM users WHERE role IN('business_owner','company_owner') LIMIT 1")).rows[0];
    const token = jwt.sign(
      { tenantId: owner.tenant_id, companyId: owner.company_id, role: 'business_owner', permissions: [] },
      env.JWT_SECRET,
      { subject: owner.id, expiresIn: '5m' },
    );
    const response = await request(createApp())
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ locale: 'en', messages: [] });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
