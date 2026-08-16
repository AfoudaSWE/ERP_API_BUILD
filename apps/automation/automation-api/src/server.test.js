import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutomationServer, validatePayload } from './server.js';

const config = {
  port: 3333, n8nEnabled: true, n8nBaseUrl: 'http://n8n.test', n8nWebhookBaseUrl: 'http://n8n.test/webhook',
  n8nEditorUrl: '', n8nApiKey: 'key', n8nWebhookSecret: 'secret', timeoutMs: 100,
  auditFile: 'unused', allowedOrigins: [], maxBodyBytes: 1024, rateLimitPerMinute: 10,
  workflowMap: { 'retail-occupancy-alert': { n8nId: '10', name: 'Retail Occupancy Alert', category: 'Operations', webhookPath: 'retail-occupancy-alert', allowedRoles: ['ADMIN'], allowedPayloadFields: ['eventType','storeId','cameraId','entered','exited','currentOccupancy','capacity','timestamp'] } },
};
const servers = [];
afterEach(async () => Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve)))));

async function start(overrides = {}) {
  const client = {
    health: vi.fn(async () => ({})), workflows: vi.fn(async () => ({ data: [] })),
    executions: vi.fn(async () => ({ data: [] })), trigger: vi.fn(async () => ({ accepted: true })),
    ...overrides.client,
  };
  const audits = { findByIdempotencyKey: vi.fn(async () => null), append: vi.fn(async record => ({ ...record, id: 'audit-1' })), ...overrides.audits };
  const server = createAutomationServer({ config, client, audits });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); servers.push(server);
  return { url: `http://127.0.0.1:${server.address().port}`, client, audits };
}
const headers = { 'content-type': 'application/json', 'x-realtwin-user-id': 'user-1', 'x-realtwin-role': 'ADMIN', 'x-realtwin-permissions': 'automation:read,automation:execute' };

describe('automation API', () => {
  it('enforces RBAC', async () => {
    const { url } = await start();
    const response = await fetch(`${url}/api/automation/workflows`, { headers: { ...headers, 'x-realtwin-permissions': '' } });
    expect(response.status).toBe(403);
  });

  it('rejects workflows outside the allowlist', async () => {
    const { url, client } = await start();
    const response = await fetch(`${url}/api/automation/workflows/not-allowed/execute`, { method: 'POST', headers: { ...headers, 'idempotency-key': 'request-1' }, body: '{}' });
    expect(response.status).toBe(403);
    expect(client.trigger).not.toHaveBeenCalled();
  });

  it('rejects invalid payload fields', () => {
    expect(() => validatePayload({ payload: { password: 'no' } }, config.workflowMap['retail-occupancy-alert'])).toThrow(/not allowed/);
  });

  it('records an audit and protects duplicate submissions', async () => {
    const { url, client, audits } = await start();
    const body = JSON.stringify({ storeId: 'store-01', payload: { currentOccupancy: 37, capacity: 40, timestamp: '2026-07-26T17:30:00+03:00' } });
    const response = await fetch(`${url}/api/automation/workflows/retail-occupancy-alert/execute`, { method: 'POST', headers: { ...headers, 'idempotency-key': 'request-2' }, body });
    expect(response.status).toBe(202);
    expect(client.trigger).toHaveBeenCalledOnce();
    expect(audits.append).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted', requestedBy: 'user-1' }));
    expect(audits.append.mock.calls[0][0]).not.toHaveProperty('payload');
  });
});
