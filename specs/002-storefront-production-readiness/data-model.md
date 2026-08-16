# Frontend Data Model

## Authoritative entities

- **Product** belongs to Category, optionally Brand, and has Media, Review summary, and zero or more Variants.
- **Variant** belongs to Product and carries SKU, attributes, price, comparison price, stock quantity, availability, and optional image.
- **Cart** belongs to a company and optional customer; contains Cart Lines and server-calculated currency/totals.
- **Customer** owns Addresses, Wishlist Items, and Orders.
- **Order** contains immutable line snapshots, customer/address snapshots, payment status, fulfillment status, and totals.

## Frontend-only bounded state

- **Comparison Set**: schema version, ordered unique product slugs, minimum 2 and maximum 4.
- **Recently Viewed**: schema version, ordered unique product slugs, maximum 8.
- **Locale Preference**: `ar` or `en`; controls document language and direction.

## State transitions

- Cart: active → converted or abandoned (server controlled).
- Order: pending → confirmed → processing → shipped → delivered; cancellation only by future server eligibility.
- Comparison: empty → collecting → comparable; remove/clear returns to collecting/empty.
- Product availability: in stock / low stock / out of stock, derived from authoritative inventory.

## Validation

- Variant required when a product exposes variants; unavailable variants cannot be purchased.
- Cart quantities remain within server-provided maximum.
- Comparison contains unique products and never exceeds four.
- Customer addresses require recipient, phone, street, city; configurable area/building details remain optional until contract expansion.
