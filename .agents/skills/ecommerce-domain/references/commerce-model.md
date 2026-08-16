# Commerce domain model

- Products group merchandising content; variants are concrete sellable configurations.
- Listings bind variants to channel, locale, visibility, SEO, price source, and availability.
- Prices/promotions define currency, tax mode, scope, precedence, effective window, eligibility, limits, and rounding.
- Reprice and revalidate availability server-side at checkout boundaries.
- Use idempotency keys for order placement and provider operations; persist an immutable snapshot before side effects.
- Treat authorization, capture, settlement, void, refund, and chargeback as distinct events.
- Reconcile asynchronous provider events despite duplicates, delay, and reordering.
- Support partial allocation, shipment, delivery, cancellation, return, inspection, refund, and restock outcomes.
