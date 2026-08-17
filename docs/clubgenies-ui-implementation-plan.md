# ClubGenies UI implementation plan

## Strategy

Use shared foundations and route-family components to improve the entire application coherently, then make focused corrections in high-value specialist flows. Business behavior, API contracts and permission rules remain unchanged.

## Controlled batches

1. **Foundation** — replace generic blue/slate tokens with the confirmed ClubGenies palette; add typography, spacing, radius, elevation, focus, control, table and motion tokens; add reduced-motion and strong focus behavior.
2. **Shared primitives** — introduce consistent page headers, toolbars and system states only where they eliminate existing duplication; improve buttons, fields, cards, tables, badges, dialogs and empty/error/permission states in the current CSS component layer.
3. **Application shell** — rebrand to ClubGenies; remove decorative gradient/Sparkles treatment; improve information grouping, active navigation, collapsed behavior, header actions, mobile drawer and RTL behavior.
4. **Authentication and system states** — refine login, signup, loading, 403, 404 and error surfaces with semantic structure and clear recovery.
5. **Dashboard** — prioritise supported operational data, reduce equal-card repetition, improve chart/list hierarchy and partial-data states.
6. **Shared route families** — improve `EntityRoutePage`, `CatalogCrud`, `AccountingRoutePage`, `ReportRoutePage`, `SettingsSectionPage`, and `OperationsPage`. This batch covers most data-heavy routes and removes invented zero metrics.
7. **Specialist workflows** — refine HR/onboarding, attendance, payroll, inventory transfers/adjustments, purchasing, sales documents, CRM and roles/permissions using their existing actions and data only.
8. **Responsive and accessibility pass** — verify 360, 768, 1024, 1440 and wide desktop; correct overflow, focus, labels, dialogs, semantic tables, touch targets, RTL and reduced motion.
9. **Regression and finish gate** — format, lint, typecheck, unit tests, targeted Playwright tests, build, browser-console scan, one Anti-UI-Slop detector run, desktop/mobile screenshots, independent finish review, and final design-system documentation.

## Validation after each logical batch

- `nx lint erp_interface`
- `nx typecheck erp_interface`
- `nx test erp_interface`
- `nx build erp_interface`
- Focused Playwright specs for changed critical workflows
- Visual inspection at the required viewports, batched as desktop/mobile where practical

## Non-goals

- No redesign of `ecom-interface`, `retail-ms-interface`, automation, vision, worker, or unrelated applications.
- No new business entities, routes, controls, metrics, API fields, dependencies or UI framework.
- No permission, role-ranking, authentication or backend contract changes unless a separately verified defect is found.
