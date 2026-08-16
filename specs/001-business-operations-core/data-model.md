# Data Model: Business Operations Core

All entities are company-scoped unless explicitly noted. Monetary fields are fixed-precision decimals;
quantities use fixed-precision decimals. Every mutable master/document has `created_at`, `updated_at`, and
where applicable `created_by`/`updated_by`. Posted ledgers and audit events are append-only.

## Shared controls

### DocumentSequence

- `id`, `company_id`, `document_type`, `prefix`, `next_value`, `padding`, `fiscal_year`, `updated_at`
- Unique: `(company_id, document_type, fiscal_year)`
- Next number is allocated under a row lock in the document transaction.

### IdempotencyRecord

- `id`, `company_id`, `operation_key`, `action`, `request_hash`, `status`, `resource_type`, `resource_id`,
  `response_code`, `response_body`, `created_at`, `completed_at`, `expires_at`
- Unique: `(company_id, operation_key)`
- Reusing a key with a different action/hash is a conflict.

### AuditEvent

- `id`, `tenant_id`, `company_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `operation_key`,
  `before_data`, `after_data`, `metadata`, `ip_address`, `user_agent`, `created_at`
- Append-only; indexed by company/time, entity, actor, and operation key.

## Inventory and purchasing

### Warehouse

- `id`, `company_id`, optional `branch_id`, `code`, `name`, `name_ar`, `type`, `is_active`
- Unique: `(company_id, code)`

### PurchaseOrder / PurchaseOrderItem

- Header: `id`, `company_id`, `order_number`, `supplier_id`, `warehouse_id`, `status`, `order_date`,
  `expected_date`, `currency`, `subtotal`, `discount_amount`, `tax_amount`, `total`, approval fields, notes
- Item: `id`, `purchase_order_id`, `product_id`, description, ordered/received quantity, unit, unit price,
  discount, tax, line total
- States: `draft -> submitted -> approved -> partially_received -> received -> closed`; draft/submitted may
  be cancelled; rejected submission returns to draft with reason.
- Approved commercial fields become immutable; change requires cancellation/replacement or controlled revision.

### GoodsReceipt / GoodsReceiptItem

- Header: `id`, `company_id`, `receipt_number`, `purchase_order_id`, `warehouse_id`, `supplier_id`,
  `receipt_date`, `status`, supplier document reference, operation key, actor
- Item: ordered item reference, product, received/accepted/rejected quantity, unit cost, tax, batch metadata
- States: created directly as `posted`; reversal creates a linked reversal receipt.

### SupplierAccrual

- `id`, `company_id`, `supplier_id`, `goods_receipt_id`, `business_date`, `amount`, `currency`, `status`,
  `journal_entry_id`, `operation_key`, and optional future settlement reference.
- A posted receipt creates one accrued liability in a goods-received-not-invoiced control account.
- It is not a supplier tax invoice. A future supplier-invoice specification will match and clear this
  accrual into accounts payable without recognizing the receipt value twice.

### StockMovement / InventoryBalance

- Movement: `id`, `company_id`, `warehouse_id`, `product_id`, `movement_type`, signed quantity, unit cost,
  source type/id/line, reason, operation key, actor, business date, created timestamp, reversal reference
- Unique source effect: company + source + line + movement type.
- Balance: `(company_id, warehouse_id, product_id)`, on-hand, reserved, available, average cost, version/time
- Balance invariant: `available = on_hand - reserved`; negative available is forbidden unless company policy allows.

## Sales and settlement

### SalesInvoice extensions

- Add warehouse, currency, operation key, posting state, returned total, and immutable confirmation metadata.
- State actions validate stock and accounting periods. Existing invoice items remain source lines.

### Payment / PaymentAllocation

- Payment: `id`, `company_id`, `payment_number`, direction, party type/id, financial account, amount, currency,
  method, reference, business date, status, operation key, actor, reversal reference
- Allocation: payment, document type/id, allocated amount
- States: `draft -> posted -> reversed`; sum of allocations cannot exceed payment or document outstanding.

### SalesReturn / SalesReturnItem

- Header: `id`, `company_id`, `return_number`, original invoice, customer, warehouse, status, business date,
  subtotal/tax/total, operation key, actor, reason
- Item: original invoice item, product, eligible and returned quantity, price/tax/total
- A posted return adds stock for accepted goods, creates customer credit, and posts a reversal journal.

## Accounting and finance

### LedgerAccount

- `id`, `company_id`, `code`, `name`, `name_ar`, type, optional parent, normal balance, system role,
  allow-manual-posting, active flag
- Unique: `(company_id, code)` and one active account per required system role.

### JournalEntry / JournalLine

- Entry: `id`, `company_id`, `entry_number`, business date, description, status, source type/id, posting type,
  operation key, actor/poster, posted/reversed timestamps, reversal links
- Line: entry, account, optional party, description, debit, credit, currency, dimensions
- States: `draft -> posted -> reversed`; posted entries never update/delete.
- Invariants: total debit equals total credit and each line has exactly one positive side.

### AccountingPeriod

- `id`, `company_id`, start/end date, status, closed by/at, close note
- States: `open -> closed`; reopening requires a distinct permission and audit reason.
- Periods do not overlap per company.

### FinancialAccount / AccountMovement

- Account: cash/bank/wallet type, code/name, currency, optional ledger account, active flag
- Movement: account, signed amount, movement type, source, business date, operation key, reversal link
- Balances derive from posted movements.

### Expense extensions

- Add category, supplier, account, currency, approval actor/time, payment actor/time, operation key and source posting.
- States: `draft -> submitted -> approved -> paid`; submitted can be rejected; unpaid approved can cancel.

### Transfer

- `id`, `company_id`, transfer number, from/to account, amount, currency, business date, status, operation key,
  actor, linked outgoing/incoming movements and journal
- From and to accounts must differ; posted values are equal and linked.

### Reconciliation / StatementLine / ReconciliationMatch

- Reconciliation: account, statement date range, opening/closing balance, status, difference, actor/time
- Statement line: date, description, reference, amount, imported identity/hash
- Match: statement line, one or more account movements, matched amount, status, actor/time
- States: `draft -> completed`; completed reconciliation is immutable and adjustments are separately posted.

## Reporting views

- Inventory position and valuation by product/warehouse/business date.
- Purchase ordered/received/outstanding and supplier payable aging.
- Sales, returns, collections, customer receivable aging and profitability.
- Trial balance, income statement, balance sheet, cash flow, tax summary and account reconciliation.
- Every aggregate carries stable dimensions/source identifiers needed for drill-down.

## Deactivation and retention

Master records referenced by documents are deactivated, not deleted. Draft unreferenced records may be
deleted with permission and audit. Posted documents, movements, payments, journals, period actions,
reconciliations, and audit events are never hard-deleted by application workflows.
