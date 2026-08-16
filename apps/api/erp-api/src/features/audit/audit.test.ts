import { describe, expect, it, vi } from 'vitest';
import { appendAuditEvent, listAuditEvents } from './routes.js';

describe('audit events', () => {
  it('always writes explicit tenant and company scope', async () => {
    const query = vi.fn().mockResolvedValue({});
    await appendAuditEvent({ query } as never, { tenantId: 'tenant-a', companyId: 'company-a', action: 'created', entityType: 'purchase_order' });
    expect(query.mock.calls[0][1].slice(0, 2)).toEqual(['tenant-a', 'company-a']);
    expect(query.mock.calls[0][0]).toContain('INSERT INTO audit_events');
  });
  it('queries only the authenticated company', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: '0' }] });
    await expect(listAuditEvents({ query } as never, 'company-a', 1, 25)).resolves.toEqual({ events: [], total: 0 });
    expect(query.mock.calls.every((call) => call[1][0] === 'company-a')).toBe(true);
  });
});
