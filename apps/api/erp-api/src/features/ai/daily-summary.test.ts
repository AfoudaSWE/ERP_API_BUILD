import { describe, expect, it, vi } from 'vitest';
import { generateDailySummary, loadAuthorizedFacts, sanitizeSummaryContent, type QueryExecutor } from './daily-summary.js';
import type { QueryResultRow } from 'pg';

const row = { sales_today: '100', sales_month: '200', sales_previous_month: '150', payments_month: '75', outstanding: '25', expenses_month: '40', purchases_month: '60', payables: '10', low_stock: '2', out_of_stock: '1' };
const auth = { companyId: '20000000-0000-4000-8000-000000000001', permissions: ['sales.view', 'payments.view', 'purchases.view', 'expenses.view', 'inventory.view'], branchIds: null };
const execute: QueryExecutor = async <T extends QueryResultRow>() => ({ rows: [row] as unknown as T[] });

describe('Daily AI summary', () => {
  it('generates and sanitizes a completed Ollama response', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ done: true, model: 'configured', message: { content: '- Sales improved\n<script>x</script>Low stock: 2' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await generateDailySummary({ auth, locale: 'en', execute, fetcher });
    expect(result.items).toEqual(['Sales improved', 'x Low stock: 2']);
    const request = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(request.model).toBeTruthy();
    expect(request.messages[0].content).not.toContain('customer_name');
  });

  it.each([
    ['timeout', Object.assign(new Error('timeout'), { name: 'TimeoutError' }), 'OLLAMA_TIMEOUT'],
    ['unavailable', new Error('connection refused'), 'OLLAMA_UNAVAILABLE'],
  ])('maps %s without leaking details', async (_label, failure, code) => {
    await expect(generateDailySummary({ auth, locale: 'ar', execute, fetcher: vi.fn(async () => { throw failure; }) })).rejects.toMatchObject({ code });
  });

  it('rejects invalid and incomplete model responses', async () => {
    const invalidJson = vi.fn(async () => new Response('not-json', { status: 200 }));
    await expect(generateDailySummary({ auth, locale: 'en', execute, fetcher: invalidJson })).rejects.toMatchObject({ code: 'INVALID_AI_RESPONSE' });
    const incomplete = vi.fn(async () => new Response(JSON.stringify({ done: false, message: { content: 'partial' } }), { status: 200 }));
    await expect(generateDailySummary({ auth, locale: 'en', execute, fetcher: incomplete })).rejects.toMatchObject({ code: 'INVALID_AI_RESPONSE' });
  });

  it('applies company, permission, and assigned-branch isolation before Ollama', async () => {
    let sql = ''; let values: unknown[] = [];
    const scopedExecute: QueryExecutor = async <T extends QueryResultRow>(text: string, params?: unknown[]) => { sql = text; values = params ?? []; return { rows: [row] as unknown as T[] }; };
    await loadAuthorizedFacts(scopedExecute, { ...auth, permissions: ['sales.view'], branchIds: ['30000000-0000-4000-8000-000000000001'] });
    expect(values[0]).toBe(auth.companyId);
    expect(values).toContainEqual(['30000000-0000-4000-8000-000000000001']);
    expect(sql).toContain('branch_id=ANY');
    expect(sql).not.toContain('sum(total) FROM purchase_orders');
  });

  it('removes markup, control characters, and excess lines', () => {
    expect(sanitizeSummaryContent('<b>one</b>\n\u0000two')).toEqual(['one', 'two']);
  });
});
