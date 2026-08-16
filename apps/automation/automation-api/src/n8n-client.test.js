import { describe, expect, it, vi } from 'vitest';
import { N8nClient, sanitizeExecution } from './n8n-client.js';

const config = {
  n8nEnabled: true, n8nBaseUrl: 'http://n8n.test', n8nWebhookBaseUrl: 'http://n8n.test/webhook',
  n8nApiKey: 'top-secret-key', n8nWebhookSecret: 'top-secret-webhook', timeoutMs: 20,
};

describe('N8nClient', () => {
  it('authenticates and returns typed JSON without exposing its key', async () => {
    const fetchImpl = vi.fn(async (_url, request) => {
      expect(request.headers['x-n8n-api-key']).toBe('top-secret-key');
      return new Response(JSON.stringify({ data: [{ id: '1' }] }), { status: 200 });
    });
    await expect(new N8nClient(config, fetchImpl).workflows()).resolves.toEqual({ data: [{ id: '1' }] });
  });

  it('maps authentication failures to sanitized errors', async () => {
    const client = new N8nClient(config, vi.fn(async () => new Response(JSON.stringify({ message: 'key top-secret-key invalid' }), { status: 401 })));
    await expect(client.workflows()).rejects.toMatchObject({ code: 'N8N_AUTH_FAILED', message: 'Automation service authentication failed' });
  });

  it('aborts timed out requests and retries GET only', async () => {
    const fetchImpl = vi.fn((_url, request) => new Promise((_resolve, reject) => request.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
    await expect(new N8nClient(config, fetchImpl).health()).rejects.toMatchObject({ code: 'N8N_TIMEOUT' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('redacts sensitive fragments from execution errors', () => {
    const result = sanitizeExecution({ id: '1', status: 'error', data: { resultData: { error: { message: 'authorization=Bearer-123 failed' } } } });
    expect(result.errorSummary).not.toContain('Bearer-123');
  });
});
