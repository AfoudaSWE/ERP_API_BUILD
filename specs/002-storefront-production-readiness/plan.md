# Implementation Plan: Storefront Production Readiness

**Branch**: `002-storefront-production-readiness` | **Date**: 2026-08-10 | **Spec**: [spec.md](spec.md)

## Summary

Incrementally harden the existing customer storefront around its real ERP-backed APIs. Preserve the current React/Vite application, shared contracts/data access, server cart, customer authentication, checkout, and order flows. Add reusable discovery/compare/metadata/i18n foundations, strengthen error and responsive states, and explicitly document transactional features blocked by absent backend contracts.

## Technical Context

**Language/Version**: JavaScript/JSX on React 19.2; TypeScript 5.9 shared contracts and API  
**Primary Dependencies**: React Router 7, i18next, shared storefront data-access, Express 5, Zod 4  
**Storage**: PostgreSQL through ERP API; bounded/versioned browser storage for guest preferences only  
**Testing**: Vitest, React Testing Library-compatible renderer, Supertest API tests, Playwright  
**Target Platform**: Modern evergreen browsers, mobile-first web, static Vite production artifact  
**Project Type**: Nx web application plus existing API/shared libraries  
**Performance Goals**: lazy route delivery; stable media geometry; no avoidable request waterfalls; responsive interaction at catalog scale  
**Constraints**: bilingual RTL/LTR; no direct database access; ERP inventory/pricing authority; no fake unsupported transactions  
**Scale/Scope**: 473+ live products, thousands of variants, core browse-to-order journey and account lifecycle

## Constitution Check

- **Business Truth**: PASS — all money, inventory, cart, checkout, and orders remain API authoritative.
- **Tenant Isolation**: PASS — protected customer endpoints retain server ownership checks; no client authorization shortcuts.
- **Specification Traceability**: PASS — tasks reference user stories and requirement IDs.
- **Risk-First Testing**: PASS — cart, checkout, auth, and API contract checks precede completion.
- **Localized/Operable**: PASS — bilingual loading, empty, success, error, and recovery states are required.

Post-design re-check: PASS. No schema migration or ERP business-logic rewrite is planned. Backend gaps are contracts, not simulated features.

## Project Structure

```text
apps/web/ecom-interface/
├── src/app/                    # providers and lazy route composition
├── src/components/layout/      # header, mega menu, footer
├── src/components/storefront/  # reusable product, search, cart, compare UI
├── src/components/ui/          # shared states and primitives
├── src/features/               # home, products, cart, checkout, account
├── src/data-access/            # customer-only API facade
└── assets/css/                 # tokenized storefront styles

libs/domains/commerce/storefront/
├── contracts/src/              # frontend/API DTO contracts
└── data-access/src/            # structured public/cart API facade

apps/api/erp-api/src/features/storefront/ # authoritative server routes
```

**Structure Decision**: Extend existing feature boundaries. Add cohesive storefront components/services only; do not reorganize the Nx workspace or modify ERP UI.

## Complexity Tracking

No constitution exceptions.
