import { describe, expect, it, vi } from 'vitest';
import { nextDocumentNumber } from './document-number.js';
import { pool, transaction } from '../db/client.js';
import { databaseAvailable } from '../test/db.js';

describe('nextDocumentNumber', () => {
  it('uses one atomic upsert and formats the returned sequence', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ issued_value: '7', padding: 5 }] });
    const value = await nextDocumentNumber({ query } as never, { companyId: 'company', documentType: 'purchase_order', prefix: 'PO', businessDate: '2026-07-15' });
    expect(value).toBe('PO-2026-00007');
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT');
  });
  it('issues unique values under concurrent transactions', async () => {
    if (!(await databaseAvailable())) return;
    const company = (await pool.query<{ id: string }>('SELECT id FROM companies ORDER BY created_at LIMIT 1')).rows[0];
    if (!company) return;
    const type = `test_concurrency_${Date.now()}`;
    try {
      const values = await Promise.all(Array.from({ length: 8 }, () => transaction((client) => nextDocumentNumber(client, { companyId: company.id, documentType: type, prefix: 'TST', businessDate: '2026-07-15' }))));
      expect(new Set(values).size).toBe(values.length);
    } finally { await pool.query('DELETE FROM document_sequences WHERE company_id=$1 AND document_type=$2', [company.id, type]); }
  });
});
