# ERP-commerce integration model

For each entity and field record: system of record, destination, external identifiers, direction, trigger, expected latency, transformation, conflict policy, deletion behavior, and reconciliation rule.

Typical assumptions to verify:

- ERP owns accounting products, tax categories, cost, stock ledger, purchasing, and posted invoices.
- Commerce owns merchandising copy, channel visibility, carts, checkout sessions, and consent-aware behavior.
- Choose one pricing authority per price list and effective period.
- Commerce originates orders; ERP acknowledges, allocates, fulfills, invoices, and returns status through versioned events.

## Contracts and failure controls

- Include event ID/type/version, aggregate ID/version, source, occurred-at, correlation/causation IDs, tenant/channel, locale, payload, and trace context.
- Authenticate webhooks and retain raw provider events when policy permits.
- Deduplicate through a durable inbox and unique business keys; publish committed changes through an outbox or equivalent.
- Handle gaps/reordering with versions or provider sequence tokens.
- Reconcile with watermarks and checkpoints; make jobs resumable and repairs idempotent.
- Provide dead-letter inspection, redacted diagnostics, ownership, alerts, and safe replay.

Test product retirement, price/tax changes during checkout, reservation races, duplicate order webhooks, partial fulfillment/returns/refunds, localization drift, EGP rounding, and branch mapping changes.
