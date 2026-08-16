import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { pool, query } from '../../db/client.js';
import { databaseAvailable } from '../../test/db.js';
import { buildAuthorizedErpContext } from './erp-context.js';

describe('ERP chat context database integration', () => {
  it('loads every readable owner module using real schema queries', async () => {
    if (!(await databaseAvailable())) return;
    const owner = (await pool.query<{ id: string; company_id: string; permissions: string[] }>(`SELECT u.id,u.company_id,COALESCE(array_agg(rp.permission_code) FILTER(WHERE rp.permission_code IS NOT NULL),'{}') permissions FROM users u LEFT JOIN role_permissions rp ON rp.role=u.role WHERE u.role IN('business_owner','company_owner') GROUP BY u.id LIMIT 1`)).rows[0];
    const context = await buildAuthorizedErpContext(query, { userId: owner.id, companyId: owner.company_id, permissions: owner.permissions, branchIds: null });
    expect(context).toHaveProperty('company');
    expect(context).toHaveProperty('sales');
    expect(context).toHaveProperty('inventory');
    expect(context).toHaveProperty('accounting');
  });

  it('sends comprehensive authorized ERP context to Ollama and returns a sanitized answer', async () => {
    if (!(await databaseAvailable())) return;
    const owner = (await pool.query<{ id: string; tenant_id: string; company_id: string }>(`SELECT id,tenant_id,company_id FROM users WHERE role IN('business_owner','company_owner') LIMIT 1`)).rows[0];
    const fetcher = vi.fn(async (_url: string | URL | globalThis.Request, init?: RequestInit) => {
      const requestBody = JSON.parse(String(init?.body));
      expect(requestBody.messages[0].content).toContain('AUTHORIZED ERP CONTEXT');
      expect(requestBody.messages[0].content).toContain('recentInvoices');
      expect(requestBody.messages[0].content).not.toContain('password_hash');
      return new Response(JSON.stringify({ model: 'configured-model', done: true, message: { role: 'assistant', content: '<b>Recorded answer</b>' } }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetcher);
    const token = jwt.sign({ tenantId: owner.tenant_id, companyId: owner.company_id, role: 'business_owner', permissions: [] }, env.JWT_SECRET, { subject: owner.id, expiresIn: '5m' });
    const response = await request(createApp()).post('/api/ai/chat').set('Authorization', `Bearer ${token}`).send({ locale: 'en', messages: [{ role: 'user', content: 'Tell me everything important in the ERP' }] });
    expect(response.status).toBe(200);
    expect(response.body.data.content).toBe('Recorded answer');
  });
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => { await pool.end(); });
