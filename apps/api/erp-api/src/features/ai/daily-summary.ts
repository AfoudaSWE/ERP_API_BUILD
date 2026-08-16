import type { QueryResultRow } from 'pg';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http.js';

export type DailySummaryAuth = {
  companyId: string;
  permissions: string[];
  branchIds?: string[] | null;
};

export type QueryExecutor = <T extends QueryResultRow>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
type SummaryRow = {
  sales_today: string; sales_month: string; sales_previous_month: string;
  payments_month: string; outstanding: string; expenses_month: string;
  purchases_month: string; payables: string; low_stock: string; out_of_stock: string;
};

type OllamaResponse = { model?: string; message?: { content?: unknown }; done?: boolean };

function can(auth: DailySummaryAuth, ...permissions: string[]) {
  return permissions.some((permission) => auth.permissions.includes(permission));
}

function branchPredicate(auth: DailySummaryAuth, warehouseColumn: string, values: unknown[]) {
  if (auth.branchIds === null || auth.branchIds === undefined) return '';
  values.push(auth.branchIds);
  return ` AND ${warehouseColumn} IN (SELECT id FROM warehouses WHERE branch_id=ANY($${values.length}::uuid[]))`;
}

export function sanitizeSummaryContent(input: unknown): string[] {
  if (typeof input !== 'string') return [];
  const clean = input
    .replace(/<[^>]*>/g, ' ')
    .split('').filter((character) => { const code = character.charCodeAt(0); return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127); }).join('')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/gm, '')
    .trim()
    .slice(0, 4000);
  return clean.split(/\r?\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 8);
}

export async function loadAuthorizedFacts(execute: QueryExecutor, auth: DailySummaryAuth) {
  const values: unknown[] = [auth.companyId];
  const salesVisible = can(auth, 'sales.view', 'sales.read', 'payments.view', 'payments.receive');
  const purchasesVisible = can(auth, 'purchases.view', 'purchases.read');
  const expensesVisible = can(auth, 'expenses.view', 'expenses.read');
  const inventoryVisible = can(auth, 'inventory.view', 'inventory.read');
  const salesScope = salesVisible ? branchPredicate(auth, 'warehouse_id', values) : '';
  const purchaseScope = purchasesVisible ? branchPredicate(auth, 'warehouse_id', values) : '';
  const inventoryScope = inventoryVisible ? branchPredicate(auth, 'w.id', values) : '';

  const sql = `SELECT
    ${salesVisible ? `COALESCE((SELECT sum(total) FROM sales_invoices WHERE company_id=$1 AND invoice_date=current_date${salesScope}),0)` : 'NULL'}::text sales_today,
    ${salesVisible ? `COALESCE((SELECT sum(total) FROM sales_invoices WHERE company_id=$1 AND date_trunc('month',invoice_date)=date_trunc('month',current_date)${salesScope}),0)` : 'NULL'}::text sales_month,
    ${salesVisible ? `COALESCE((SELECT sum(total) FROM sales_invoices WHERE company_id=$1 AND date_trunc('month',invoice_date)=date_trunc('month',current_date-interval '1 month')${salesScope}),0)` : 'NULL'}::text sales_previous_month,
    ${salesVisible ? `COALESCE((SELECT sum(paid_amount) FROM sales_invoices WHERE company_id=$1 AND date_trunc('month',invoice_date)=date_trunc('month',current_date)${salesScope}),0)` : 'NULL'}::text payments_month,
    ${salesVisible ? `COALESCE((SELECT sum(remaining_amount) FROM sales_invoices WHERE company_id=$1${salesScope}),0)` : 'NULL'}::text outstanding,
    ${expensesVisible ? `COALESCE((SELECT sum(total) FROM expenses WHERE company_id=$1 AND date_trunc('month',expense_date)=date_trunc('month',current_date)),0)` : 'NULL'}::text expenses_month,
    ${purchasesVisible ? `COALESCE((SELECT sum(total) FROM purchase_orders WHERE company_id=$1 AND date_trunc('month',order_date)=date_trunc('month',current_date)${purchaseScope}),0)` : 'NULL'}::text purchases_month,
    ${purchasesVisible ? `COALESCE((SELECT sum(sa.amount) FROM supplier_accruals sa JOIN goods_receipts gr ON gr.id=sa.goods_receipt_id WHERE sa.company_id=$1 AND sa.status='open'${branchPredicate(auth, 'gr.warehouse_id', values)}),0)` : 'NULL'}::text payables,
    ${inventoryVisible ? `COALESCE((SELECT count(DISTINCT b.product_id) FROM inventory_balances b JOIN warehouses w ON w.id=b.warehouse_id WHERE b.company_id=$1 AND b.available <= (SELECT reorder_level FROM products p WHERE p.id=b.product_id)${inventoryScope}),0)` : 'NULL'}::text low_stock,
    ${inventoryVisible ? `COALESCE((SELECT count(DISTINCT b.product_id) FROM inventory_balances b JOIN warehouses w ON w.id=b.warehouse_id WHERE b.company_id=$1 AND b.available=0${inventoryScope}),0)` : 'NULL'}::text out_of_stock`;
  const row = (await execute<SummaryRow>(sql, values)).rows[0];
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null).map(([key, value]) => [key, Number(value)]));
}

export async function generateDailySummary(input: {
  auth: DailySummaryAuth;
  locale: 'ar' | 'en';
  execute: QueryExecutor;
  fetcher?: typeof fetch;
}) {
  const facts = await loadAuthorizedFacts(input.execute, input.auth);
  if (!Object.keys(facts).length) return { items: [] as string[], model: env.OLLAMA_MODEL };
  const language = input.locale === 'ar' ? 'Arabic' : 'English';
  const prompt = `Create a concise daily ERP executive summary in ${language}. Return 3-6 plain-text lines, one insight per line. Use only the aggregate JSON facts supplied. Do not output HTML, Markdown, hidden reasoning, names, identifiers, or invented figures. Mention useful trends and alerts. JSON facts: ${JSON.stringify(facts)}`;
  let result: globalThis.Response;
  try {
    result = await (input.fetcher ?? fetch)(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.OLLAMA_MODEL, stream: false, think: false, messages: [{ role: 'system', content: prompt }], options: { temperature: 0.1 } }),
      signal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name);
    throw new HttpError(timedOut ? 504 : 503, timedOut ? 'OLLAMA_TIMEOUT' : 'OLLAMA_UNAVAILABLE', timedOut ? 'Ollama request timed out' : 'Ollama is unavailable');
  }
  if (!result.ok) throw new HttpError(503, 'OLLAMA_UNAVAILABLE', 'Ollama is unavailable');
  let body: OllamaResponse;
  try { body = await result.json() as OllamaResponse; } catch { throw new HttpError(502, 'INVALID_AI_RESPONSE', 'Ollama returned invalid JSON'); }
  const items = sanitizeSummaryContent(body.message?.content);
  if (!body.done || !items.length) throw new HttpError(502, 'INVALID_AI_RESPONSE', 'Ollama returned an invalid summary');
  return { items, model: body.model || env.OLLAMA_MODEL };
}
