import { describe, expect, it, vi } from 'vitest';
import { beginIdempotent, requestHash } from './idempotency.js';

describe('idempotency', () => {
  it('hashes objects independently of key order', () => expect(requestHash({ b: 2, a: 1 })).toBe(requestHash({ a: 1, b: 2 })));
  it('replays a completed matching request', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [{ action: 'receipt', request_hash: requestHash({ a: 1 }), status: 'completed', response_code: 201, response_body: { data: { id: 'x' } } }] });
    await expect(beginIdempotent({ query } as never, { companyId: 'c', key: 'receipt-12345678', action: 'receipt', body: { a: 1 } })).resolves.toEqual({ kind: 'replay', statusCode: 201, body: { data: { id: 'x' } } });
  });
  it('rejects reuse for another request', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [{ action: 'receipt', request_hash: requestHash({ a: 2 }), status: 'completed' }] });
    await expect(beginIdempotent({ query } as never, { companyId: 'c', key: 'receipt-12345678', action: 'receipt', body: { a: 1 } })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });
});
