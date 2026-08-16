import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { pool } from '../../db/client.js';

const createdLeadIds: string[] = [];

afterEach(async () => {
  if (!createdLeadIds.length) return;
  await pool.query('DELETE FROM leads WHERE id = ANY($1::uuid[])', [createdLeadIds.splice(0)]);
});

describe('CRM leads', () => {
  it('saves a submitted lead in the authenticated company', async () => {
    const owner = (await pool.query<{ id: string; tenant_id: string; company_id: string }>(
      "SELECT id,tenant_id,company_id FROM users WHERE role IN('business_owner','company_owner') LIMIT 1",
    )).rows[0];
    expect(owner).toBeDefined();

    const token = jwt.sign(
      { tenantId: owner.tenant_id, companyId: owner.company_id, role: 'business_owner', permissions: [] },
      env.JWT_SECRET,
      { subject: owner.id, expiresIn: '5m' },
    );
    const response = await request(createApp())
      .post('/api/crm/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Integration Test Lead',
        nameAr: 'عميل اختبار',
        company: 'Test Company',
        value: 12500,
        probability: 60,
        expectedCloseDate: '2026-08-15',
        status: 'new',
        source: 'other',
        tags: [],
      });

    expect(response.status).toBe(201);
    createdLeadIds.push(response.body.data.id);
    const saved = (await pool.query(
      'SELECT company_id,name,value,probability,expected_close_date FROM leads WHERE id=$1',
      [response.body.data.id],
    )).rows[0];
    expect(saved).toMatchObject({
      company_id: owner.company_id,
      name: 'Integration Test Lead',
      value: '12500.00',
      probability: 60,
    });
    expect(String(saved.expected_close_date)).toContain('2026');
  });
});
