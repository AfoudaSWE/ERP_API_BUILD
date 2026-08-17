import type { PoolClient } from 'pg';
import type { DeliveryNoteInput } from '@erp/contracts';
import { HttpError } from '../../lib/http.js';
import { nextDocumentNumber } from '../../lib/document-number.js';
import { appendAuditEvent } from '../audit/routes.js';

export async function createDeliveryNote(client: PoolClient, auth: Express.Request['auth'] & {}, input: DeliveryNoteInput) {
  const deliveryNumber = await nextDocumentNumber(client, { companyId: auth.companyId, documentType: 'delivery_note', prefix: 'DN', businessDate: input.deliveryDate });
  const note = await client.query<{ id: string }>(
    `INSERT INTO delivery_notes(company_id,delivery_number,invoice_id,warehouse_id,delivery_date,recipient_name,notes,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [auth.companyId, deliveryNumber, input.invoiceId ?? null, input.warehouseId ?? null, input.deliveryDate, input.recipientName, input.notes, auth.userId],
  );
  for (const item of input.items) {
    await client.query(
      `INSERT INTO delivery_note_items(delivery_note_id,product_id,description,quantity) VALUES($1,$2,$3,$4)`,
      [note.rows[0].id, item.productId ?? null, item.description, item.quantity],
    );
  }
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: 'delivery_note.created', entityType: 'delivery_note', entityId: note.rows[0].id, after: note.rows[0] });
  return note.rows[0];
}

export async function actOnDeliveryNote(client: PoolClient, auth: Express.Request['auth'] & {}, deliveryNoteId: string, action: 'deliver' | 'cancel') {
  const before = (await client.query('SELECT * FROM delivery_notes WHERE id=$1 AND company_id=$2 FOR UPDATE', [deliveryNoteId, auth.companyId])).rows[0];
  if (!before) throw new HttpError(404, 'DELIVERY_NOTE_NOT_FOUND', 'Delivery note not found');
  if (before.status !== 'pending') throw new HttpError(409, 'INVALID_DELIVERY_STATE', `Cannot ${action} a delivery note in status ${before.status}`);
  const nextStatus = action === 'deliver' ? 'delivered' : 'canceled';
  const updated = (await client.query('UPDATE delivery_notes SET status=$2,updated_at=now() WHERE id=$1 RETURNING *', [deliveryNoteId, nextStatus])).rows[0];
  await appendAuditEvent(client, { tenantId: auth.tenantId, companyId: auth.companyId, actorUserId: auth.userId, action: `delivery_note.${action}`, entityType: 'delivery_note', entityId: deliveryNoteId, before, after: updated });
  return updated;
}
