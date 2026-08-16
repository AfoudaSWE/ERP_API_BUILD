import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { pool } from '../../db/client.js';

async function userToken(role: string) {
  const user = (await pool.query<{ id: string; tenant_id: string; company_id: string }>('SELECT id,tenant_id,company_id FROM users WHERE role=$1 LIMIT 1', [role])).rows[0];
  return { user, token: jwt.sign({ tenantId: user.tenant_id, companyId: user.company_id, role, permissions: [] }, env.JWT_SECRET, { subject: user.id, expiresIn: '5m' }) };
}

describe('RBAC HTTP enforcement', () => {
  it.each(['auditor', 'viewer'])('%s cannot mutate business data', async (role) => {
    const { token } = await userToken(role);
    const response = await request(createApp()).post('/api/purchase-orders').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', `${role}-mutation`).send({});
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('employee receives only their own self-service profile', async () => {
    const { token, user } = await userToken('employee');
    const own = await request(createApp()).get('/api/self-service/profile').set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200); expect(own.body.data.id).toBe(user.id);
    const products = await request(createApp()).get('/api/products').set('Authorization', `Bearer ${token}`);
    expect(products.status).toBe(403);
  });

  it('branch manager cannot list a warehouse from another branch', async () => {
    const { token, user } = await userToken('branch_manager');
    const branchId = randomUUID(); const warehouseId = randomUUID();
    await pool.query(`INSERT INTO branches(id,company_id,code,name) VALUES($1,$2,$3,'Other Branch')`, [branchId, user.company_id, `OTHER-${branchId.slice(0, 6)}`]);
    await pool.query(`INSERT INTO warehouses(id,company_id,branch_id,code,name) VALUES($1,$2,$3,$4,'Other Warehouse')`, [warehouseId, user.company_id, branchId, `OTHER-${warehouseId.slice(0, 6)}`]);
    try {
      const response = await request(createApp()).get('/api/warehouses').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.map((warehouse: { id: string }) => warehouse.id)).not.toContain(warehouseId);
    } finally {
      await pool.query('DELETE FROM warehouses WHERE id=$1', [warehouseId]);
      await pool.query('DELETE FROM branches WHERE id=$1', [branchId]);
    }
  });
});

afterAll(async () => { await pool.end(); });
