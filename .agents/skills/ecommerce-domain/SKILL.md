---
name: ecommerce-domain
description: Design and implement e-commerce catalogs, categories, brands, variants, pricing, promotions, carts, checkout, orders, payments, shipping, returns, inventory reservations, customers, localization, SEO, and analytics. Use for commerce requirements, workflows, models, APIs, storefronts, tests, or operations; combine with architecture and technology skills.
---

# E-commerce Domain

1. Inspect `AGENTS.md`, docs, schemas, APIs, storefront/admin flows, provider adapters, analytics, tests, and state machines.
2. Trace customer and operational lifecycles: identity, pricing, stock, fraud, fulfillment, cancellation, return, refund, and notifications.
3. Verify current official payment, shipping, marketplace, tax, SEO, and framework documentation.
4. Define authoritative totals, snapshots, transitions, idempotency, transactions, privacy/consent, and recovery.
5. Implement across domain logic, persistence, APIs/events, accessible UI, operations, analytics, and tests.
6. Preserve order history, public contracts, URLs, structured data, and compatibility unless migration is approved.
7. Run lint, typecheck, tests, builds, accessibility, performance, and affected checks; report files, results, assumptions, decisions, and risks.

## Commerce rules

- Separate product, sellable variant, channel listing, price, promotion, availability, and reservation.
- Snapshot order lines, addresses, tax, discounts, shipping, currency, and totals.
- Use decimals and deterministic rounding; define promotion precedence, exclusivity, limits, and refunds.
- Make checkout/order/payment callbacks idempotent; never trust client totals or browser redirects as payment proof.
- Reserve inventory with expiration/release policies and concurrent-checkout protection.
- Model fulfillment, cancellation, return, exchange, refund, and partial outcomes as audited transitions.
- Support Arabic/English, RTL, EGP, locale formatting, accessibility, SEO, structured data, and consent-aware analytics.

Read [commerce-model.md](references/commerce-model.md) for checkout, order, payment, inventory, or returns.

