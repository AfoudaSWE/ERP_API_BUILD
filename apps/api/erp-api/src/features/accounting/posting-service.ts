import type { PoolClient } from 'pg';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { HttpError } from '../../lib/http.js';
import { parseDecimal } from '@erp/contracts';
import { assertOpenPeriod } from './period-service.js';

type PostingLine = { accountRole: string; debit: string; credit: string; description?: string; partyType?: string; partyId?: string };

export async function postJournal(client: PoolClient, input: { companyId: string; userId: string; businessDate: string; description: string; sourceType: string; sourceId: string; postingType: string; operationKey?: string; lines: PostingLine[] }) {
  await assertOpenPeriod(client, input.companyId, input.businessDate);
  const debit = input.lines.reduce((sum, line) => sum + parseDecimal(line.debit, 2), 0n);
  const credit = input.lines.reduce((sum, line) => sum + parseDecimal(line.credit, 2), 0n);
  if (input.lines.length < 2 || debit !== credit || debit === 0n) throw new HttpError(422, 'UNBALANCED_JOURNAL', 'Journal debits and credits must be equal and non-zero');
  const roles = [...new Set(input.lines.map((line) => line.accountRole))];
  const accounts = await client.query<{ id: string; system_role: string }>('SELECT id,system_role FROM ledger_accounts WHERE company_id=$1 AND system_role=ANY($2) AND is_active=true', [input.companyId, roles]);
  const accountByRole = new Map(accounts.rows.map((row) => [row.system_role, row.id]));
  if (roles.some((role) => !accountByRole.has(role))) throw new HttpError(422, 'ACCOUNT_MAPPING_MISSING', 'A required system ledger account is not configured');
  const entryNumber = await nextDocumentNumber(client, { companyId: input.companyId, documentType: 'journal', prefix: 'JE', businessDate: input.businessDate });
  const entry = await client.query<{ id: string }>(`INSERT INTO journal_entries (company_id,entry_number,business_date,description,status,source_type,source_id,posting_type,operation_key,created_by,posted_at) VALUES ($1,$2,$3,$4,'posted',$5,$6,$7,$8,$9,now()) RETURNING id`, [input.companyId, entryNumber, input.businessDate, input.description, input.sourceType, input.sourceId, input.postingType, input.operationKey ?? null, input.userId]);
  for (const line of input.lines) await client.query(`INSERT INTO journal_lines (journal_entry_id,ledger_account_id,party_type,party_id,description,debit,credit) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [entry.rows[0].id, accountByRole.get(line.accountRole), line.partyType ?? null, line.partyId ?? null, line.description ?? input.description, line.debit, line.credit]);
  return entry.rows[0].id;
}
