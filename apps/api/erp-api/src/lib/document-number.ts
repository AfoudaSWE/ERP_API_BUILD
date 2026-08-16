import type { PoolClient } from 'pg';

export async function nextDocumentNumber(client: PoolClient, input: { companyId: string; documentType: string; prefix: string; businessDate: string; padding?: number }) {
  const fiscalYear = Number(input.businessDate.slice(0, 4));
  const result = await client.query<{ issued_value: string; padding: number }>(
    `INSERT INTO document_sequences (company_id, document_type, prefix, fiscal_year, next_value, padding)
     VALUES ($1, $2, $3, $4, 2, $5)
     ON CONFLICT (company_id, document_type, fiscal_year)
     DO UPDATE SET next_value = document_sequences.next_value + 1, updated_at = now()
     RETURNING (next_value - 1)::text AS issued_value, padding`,
    [input.companyId, input.documentType, input.prefix, fiscalYear, input.padding ?? 5],
  );
  const row = result.rows[0];
  return `${input.prefix}-${fiscalYear}-${row.issued_value.padStart(row.padding, '0')}`;
}
