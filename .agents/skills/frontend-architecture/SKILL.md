---
name: frontend-architecture
description: Design and implement maintainable frontend application architecture. Use for feature boundaries, routing, state ownership, data fetching, forms, errors, component APIs, accessibility, localization, RTL, testing, performance, or large UI refactors; combine with React, Tailwind, design-system, Nx, API, and domain skills as relevant.
---

# Frontend Architecture

1. Inspect `AGENTS.md`, documentation, manifests, entry points, routes, feature folders, state/data libraries, components, tests, and styling conventions.
2. Identify installed versions and use current official documentation for version-sensitive APIs.
3. Trace the user flow, data ownership, loading/error/empty states, permissions, and responsive behavior.
4. Choose the smallest feature boundary that keeps domain logic out of generic UI primitives.
5. Implement accessible, production-ready behavior. Preserve public components and routes unless a breaking change is approved.
6. Run lint, typecheck, unit/component/e2e tests, builds, accessibility checks, and Nx affected targets.
7. Report files, checks, assumptions, decisions, compatibility, and risks.

## Architecture rules

- Prefer composition, cohesive feature modules, semantic components, and explicit data flow.
- Keep server, URL, form, feature, and local UI state distinct. Do not duplicate derived state.
- Avoid unnecessary effects, effect-driven transformations, global state for local concerns, boolean-prop explosions, and premature memoization.
- Design routing, deep links, authorization, error boundaries, recovery, loading states, and optimistic updates intentionally.
- Meet keyboard, focus, semantic HTML, labels, contrast, reduced-motion, zoom, screen-reader, and touch-target requirements.
- Support responsive layouts, Arabic/English, logical CSS properties, bidirectionality, and RTL mirroring.
- Control bundle size, waterfalls, rerenders, asset loading, caching, and long tasks based on measurement.
- Test business logic, components, route integration, and critical journeys at stable boundaries.

Use installed React, Tailwind, frontend-design, UI/UX, and web-guideline skills only when their scope matches.
Read [frontend-checklist.md](references/frontend-checklist.md) for new features or cross-route refactors.

