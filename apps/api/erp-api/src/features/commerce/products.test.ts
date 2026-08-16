import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { pool } from '../../db/client.js';

describe('Commerce product endpoints', () => {
  it('creates, filters, and edits a company-scoped product', async () => {
    const user = (await pool.query<{ id: string; tenant_id: string; company_id: string }>("SELECT id,tenant_id,company_id FROM users WHERE role IN ('business_owner','company_owner') LIMIT 1")).rows[0];
    const token = jwt.sign({ tenantId: user.tenant_id, companyId: user.company_id, role: 'business_owner', permissions: [] }, env.JWT_SECRET, { subject: user.id, expiresIn: '5m' });
    const sku = `CMS-${randomUUID().slice(0, 8)}`;
    const created = await request(createApp()).post('/api/commerce/products').set('Authorization', `Bearer ${token}`).send({ sku, name: 'CMS test product', costPrice: 10, sellingPrice: 15, status: 'draft' });
    expect(created.status).toBe(201); expect(created.body.data).toMatchObject({ sku, status: 'draft' });
    const id = created.body.data.id as string;
    try {
      const listed = await request(createApp()).get(`/api/commerce/products?search=${sku}&status=draft`).set('Authorization', `Bearer ${token}`);
      expect(listed.status).toBe(200); expect(listed.body.data.map((product: { id: string }) => product.id)).toContain(id); expect(listed.body.meta.total).toBeGreaterThanOrEqual(1);
      const updated = await request(createApp()).patch(`/api/commerce/products/${id}`).set('Authorization', `Bearer ${token}`).send({ sellingPrice: 18, status: 'active' });
      expect(updated.status).toBe(200); expect(updated.body.data).toMatchObject({ sellingPrice: 18, status: 'active' });
    } finally { await pool.query('DELETE FROM products WHERE id=$1', [id]); }
  });
});

afterAll(async () => { await pool.end(); });
