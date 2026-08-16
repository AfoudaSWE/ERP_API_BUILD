# Research Decisions

## Preserve existing application boundaries

- **Decision**: Improve the existing Vite storefront and shared Nx commerce libraries incrementally.
- **Rationale**: Routes, API facades, customer auth, server cart, checkout, orders, and lazy loading already work.
- **Alternatives considered**: Framework replacement or repository-wide reorganization; rejected due to migration risk without customer value.

## Server authority and client state

- **Decision**: Server owns product, price, stock, cart, checkout, customer, and order state. Browser storage is limited to versioned guest wishlist, compare, recently viewed, language, and opaque cart token.
- **Rationale**: Matches constitution and prevents financial/inventory divergence.
- **Alternatives considered**: Client price calculations or static products; rejected.

## Data fetching and performance

- **Decision**: Keep the structured data-access facade, run independent requests concurrently, retain lazy routes, debounce typeahead search, and avoid introducing a new server-state dependency in this increment.
- **Rationale**: Current architecture is small, observable, and already centralized.
- **Alternatives considered**: Add a query framework immediately; deferred until caching/invalidation complexity justifies it.

## Comparison

- **Decision**: Provide a bounded two-to-four-item local comparison using existing product detail specifications; represent absent attributes explicitly.
- **Rationale**: High-value mobile retail feature that does not mutate ERP state.
- **Alternatives considered**: Server persistence; deferred until a customer comparison contract exists.

## Unsupported commerce mutations

- **Decision**: Document returns, cancellation, coupons, online payment, reviews, trade-in, pickup, bundles, and installments as backend contract gaps.
- **Rationale**: Frontend must not imply transactions the server cannot authorize or price.
