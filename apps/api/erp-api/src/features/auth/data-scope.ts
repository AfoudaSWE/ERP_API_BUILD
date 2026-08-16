import type { QueryResultRow } from 'pg';
import { HttpError } from '../../lib/http.js';

type AuthScope = { companyId: string; branchIds?: string[] | null };
type Executor = { query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount?: number | null }> };

export function warehouseScopeSql(auth: AuthScope, warehouseColumn: string, values: unknown[]) {
  if (auth.branchIds === null || auth.branchIds === undefined) return '';
  values.push(auth.branchIds);
  return ` AND ${warehouseColumn} IN (SELECT id FROM warehouses WHERE company_id=$1 AND branch_id=ANY($${values.length}::uuid[]))`;
}

export function branchScopeSql(auth: AuthScope, branchColumn: string, values: unknown[]) {
  if (auth.branchIds === null || auth.branchIds === undefined) return '';
  values.push(auth.branchIds);
  return ` AND ${branchColumn}=ANY($${values.length}::uuid[])`;
}

export function selectedBranchId(auth: AuthScope, requested?: string) {
  if (auth.branchIds === null || auth.branchIds === undefined) return requested ?? null;
  const selected = requested ?? (auth.branchIds.length === 1 ? auth.branchIds[0] : undefined);
  if (!selected || !auth.branchIds.includes(selected)) throw new HttpError(403, 'BRANCH_SCOPE_FORBIDDEN', 'Select one of your assigned branches');
  return selected;
}

export async function requireExpenseAccess(executor: Executor, auth: AuthScope, id: string) {
  const values: unknown[] = [auth.companyId, id];
  const scope = branchScopeSql(auth, 'branch_id', values);
  const result = await executor.query(`SELECT 1 FROM expenses WHERE company_id=$1 AND id=$2${scope}`, values);
  if (!result.rows[0]) throw new HttpError(403, 'BRANCH_SCOPE_FORBIDDEN', 'The expense is outside your assigned branches');
}

export async function requireWarehouseAccess(executor: Executor, auth: AuthScope, warehouseId?: string) {
  if (auth.branchIds === null || auth.branchIds === undefined) return;
  if (!warehouseId) throw new HttpError(403, 'BRANCH_SCOPE_FORBIDDEN', 'A warehouse in an assigned branch is required');
  const values: unknown[] = [auth.companyId, warehouseId];
  const scoped = warehouseScopeSql(auth, 'id', values);
  const result = await executor.query(`SELECT 1 FROM warehouses WHERE company_id=$1 AND id=$2${scoped}`, values);
  if (!result.rows[0]) throw new HttpError(403, 'BRANCH_SCOPE_FORBIDDEN', 'The warehouse is outside your assigned branches');
}

export async function requireDocumentWarehouseAccess(executor: Executor, auth: AuthScope, table: 'sales_invoices' | 'purchase_orders', id: string) {
  if (auth.branchIds === null || auth.branchIds === undefined) return;
  const result = await executor.query<{ warehouse_id: string | null }>(`SELECT warehouse_id FROM ${table} WHERE id=$1 AND company_id=$2`, [id, auth.companyId]);
  if (!result.rows[0]?.warehouse_id) throw new HttpError(403, 'BRANCH_SCOPE_FORBIDDEN', 'The document is outside your assigned branches');
  await requireWarehouseAccess(executor, auth, result.rows[0].warehouse_id);
}
