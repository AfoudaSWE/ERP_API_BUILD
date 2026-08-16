# Tasks: Storefront Production Readiness

## Phase 1: Setup and audit

- [x] T001 Record current application/API architecture and constraints in specs/002-storefront-production-readiness/plan.md
- [x] T002 [P] Document missing transactional contracts in specs/002-storefront-production-readiness/contracts/backend-gaps.md
- [x] T003 [P] Define authoritative and bounded frontend entities in specs/002-storefront-production-readiness/data-model.md

## Phase 2: Shared foundations

- [x] T004 Add versioned compare and recently-viewed persistence utilities in apps/web/ecom-interface/src/features/comparison/comparisonStore.js
- [x] T005 Add metadata/structured-data utility in apps/web/ecom-interface/src/components/seo/RouteMetadata.jsx
- [x] T006 Expand centralized Arabic/English storefront translations in apps/web/ecom-interface/src/i18n.js
- [x] T007 Add reusable icon-based commerce controls and remove corrupted text glyphs in apps/web/ecom-interface/src/components/storefront/ProductCard.jsx

## Phase 3: User Story 1 — Discover and evaluate products (P1)

- [x] T008 [P] [US1] Add live category/deals merchandising API composition in apps/web/ecom-interface/src/features/home/HomePage.jsx
- [x] T009 [US1] Build responsive product carousel and discovery sections in apps/web/ecom-interface/src/features/home/HomePage.jsx
- [x] T010 [US1] Style live merchandising, media fallbacks, and responsive rails in apps/web/ecom-interface/assets/css/components.css
- [ ] T011 [P] [US1] Add catalog accessible labels and bounded pagination behavior in apps/web/ecom-interface/src/features/products/ProductsPage.jsx
- [ ] T012 [US1] Add product metadata, trust tabs, recent tracking, and comparison actions in apps/web/ecom-interface/src/features/products/ProductPage.jsx
- [ ] T013 [US1] Add discovery behavior tests in apps/web/ecom-interface/src/features/home/HomePage.test.jsx

## Phase 4: User Story 2 — Manage purchase intent (P1)

- [x] T014 [US2] Add bounded comparison provider and route in apps/web/ecom-interface/src/app/StoreProvider.jsx and apps/web/ecom-interface/src/app/App.jsx
- [x] T015 [US2] Build accessible comparison page in apps/web/ecom-interface/src/features/comparison/ComparisonPage.jsx
- [x] T016 [US2] Add compare controls and persistent state to apps/web/ecom-interface/src/components/storefront/ProductCard.jsx
- [ ] T017 [P] [US2] Improve cart clear/recovery UX in apps/web/ecom-interface/src/features/cart/CartPage.jsx
- [x] T018 [US2] Add comparison persistence tests in apps/web/ecom-interface/src/features/comparison/comparisonStore.test.js

## Phase 5: User Stories 3–4 — Checkout, account, and orders (P1)

- [ ] T019 [US3] Preserve checkout form state, prevent repeated submission, and localize errors in apps/web/ecom-interface/src/features/checkout/CheckoutPage.jsx
- [ ] T020 [P] [US4] Split and localize account navigation/auth/order states in apps/web/ecom-interface/src/features/account/AccountPage.jsx
- [ ] T021 [US3] Add checkout validation behavior tests in apps/web/ecom-interface/src/features/checkout/CheckoutPage.test.jsx
- [ ] T021A [P] [US4] Add authentication, wishlist synchronization, address ownership, and order-state behavior tests in apps/web/ecom-interface/src/features/account/AccountPage.test.jsx

## Phase 6: User Story 5 — Bilingual, accessible experience (P1)

- [ ] T022 [US5] Add debounced keyboard search navigation in apps/web/ecom-interface/src/components/storefront/SearchDialog.jsx
- [ ] T023 [US5] Complete sticky header, mega-menu focus behavior, compare entry, and footer content in apps/web/ecom-interface/src/components/layout/AppLayout.jsx
- [ ] T024 [P] [US5] Audit responsive/RTL CSS and reduced-motion behavior across apps/web/ecom-interface/assets/css/
- [ ] T025 [US5] Add route metadata and language persistence tests in apps/web/ecom-interface/src/app/App.test.jsx

## Phase 7: Production verification and growth backlog (P2)

- [ ] T026 [P] Document public frontend environment and production build in apps/web/ecom-interface/.env.example and README.md
- [ ] T027 [P] Add vendor-neutral commerce analytics abstraction in apps/web/ecom-interface/src/services/commerceAnalytics.js
- [ ] T028 Run lint, typecheck, unit tests, production build, and critical browser checks from specs/002-storefront-production-readiness/quickstart.md
- [ ] T029 Validate implemented behavior against FR-001–FR-022 and record backend-dependent P2 backlog in specs/002-storefront-production-readiness/quickstart.md

## Dependencies

- Phase 2 blocks feature work.
- US1 and US2 can proceed after Phase 2; US3/US4 reuse shared feedback and localization.
- US5 is cross-cutting and completes after critical pages stabilize.
- Production verification follows all implemented stories.

## Independent Test Criteria

- **US1**: Find a live in-stock product from home/search/catalog and reach a valid selected variant.
- **US2**: Persist cart, wishlist, and a bounded comparison across refresh.
- **US3**: Place exactly one validated order from an authenticated cart.
- **US4**: View only the authenticated customer’s addresses and orders.
- **US5**: Complete the critical flow at target widths in Arabic/English using keyboard controls.

## MVP

Phases 1–3 deliver the first independently valuable storefront discovery increment. Phases 4–7 complete the current frontend-capable production scope; contract-gated P2 mutations remain documented rather than faked.
