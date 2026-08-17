# ClubGenies UI skill inventory

This inventory covers repository-owned skill packages discovered under `.agents/skills` and their byte-identical mirrors under `.claude/skills`. Vendored `node_modules` skill files belong to installed dependencies rather than this repository's agent workflow; they were inventoried but are not applied to application code.

| Skill | Canonical location | Purpose | Application to this task | Required workflow / validation |
|---|---|---|---|---|
| anti-ui-slop | `.agents/skills/anti-ui-slop` | Product-specific UI direction and finish gate | Governs the complete redesign | Create product context, choose an Operate direction, load craft floor before edits, render desktop/mobile, run detector once, independent finish review, document final system |
| ui-design | `.agents/skills/ui-design` | Intentional web interface design | Establishes the design contract and bounded review passes | Preserve product truth, validate rendered work in at most two screenshot rounds |
| ui-radar | `.agents/skills/ui-radar` | Focused real-product UI research | Optional only if a concrete unresolved interaction question remains | Keep at most three evidence-backed references; do not copy brand-specific elements |
| ui-slop-score | `.agents/skills/ui-slop-score` | Rendered-interface genericness review | Final rendered critique only | Review screenshots, prioritise objective breakage, at most three findings |
| architecture-engineering | `.agents/skills/architecture-engineering` | System boundaries and cross-cutting design | Preserves Nx app/library and API boundaries | Inspect architecture; make the smallest coherent change; run affected checks |
| frontend-architecture | `.agents/skills/frontend-architecture` | Routes, state, components, accessibility and RTL | Governs shared UI primitives and route refactors | Trace loading/error/empty/permission states; validate lint, typecheck, tests and build |
| erp-domain | `.agents/skills/erp-domain` | ERP workflows and invariants | Protects financial, stock, purchasing, sales and RBAC truth | Preserve contracts and auditable states; do not invent policy or records |
| ecommerce-domain | `.agents/skills/ecommerce-domain` | Commerce lifecycle design | Relevant only where ERP routes expose catalog, customers, orders or stock | Preserve totals, inventory authority and customer data; no storefront redesign in scope |
| erp-ecommerce-integration | `.agents/skills/erp-ecommerce-integration` | Reliable ERP/commerce synchronisation | Audit-only for cross-module consistency; no integration change requested | Preserve ownership, IDs, idempotency and eventual-consistency behavior |
| code-quality-linting | `.agents/skills/code-quality-linting` | TypeScript, linting and quality gates | Applies to every implementation batch | Run formatter/checks without broad unrelated rewrites; do not suppress warnings |
| devops-delivery | `.agents/skills/devops-delivery` | Delivery and production controls | Validation-only; deployment changes are out of scope | Preserve production contracts and report build impact |
| speckit-specify | `.agents/skills/speckit-specify` | Create a Spec Kit feature specification | Not invoked: this repository has `specs/` artifacts but no active `.specify/` command structure for this redesign | Requires `.specify/`; invoking it would create unrelated feature governance |
| speckit-clarify | `.agents/skills/speckit-clarify` | Clarify an active Spec Kit spec | Not invoked; product questions were handled by the required UI init flow | Requires an active feature spec and interactive clarification loop |
| speckit-plan | `.agents/skills/speckit-plan` | Generate Spec Kit design artifacts | Not invoked; the requested audit plan is recorded directly in repository docs | Requires `.specify/` templates and active feature context |
| speckit-tasks | `.agents/skills/speckit-tasks` | Generate dependency-ordered implementation tasks | Not invoked; no active Spec Kit feature was selected | Requires an active Spec Kit plan |
| speckit-analyze | `.agents/skills/speckit-analyze` | Cross-artifact consistency analysis | Not invoked; the task is implementation, not analysis of an active spec/plan/tasks set | Strictly read-only and requires active Spec Kit artifacts |
| speckit-checklist | `.agents/skills/speckit-checklist` | Requirements-quality checklist | Not invoked; the user already supplied an explicit definition of done | Requires active Spec Kit feature context |
| speckit-constitution | `.agents/skills/speckit-constitution` | Project governance | Not invoked; changing governance is outside the redesign scope | Requires explicit constitution update workflow |
| speckit-converge | `.agents/skills/speckit-converge` | Append missing work to an active task list | Not invoked; this task does not target an active Spec Kit task list | Requires spec, plan and tasks artifacts |
| speckit-implement | `.agents/skills/speckit-implement` | Execute an active Spec Kit task list | Not invoked; using it would mutate unrelated existing feature tasks | Requires active `.specify` feature selection and checklist gate |
| speckit-taskstoissues | `.agents/skills/speckit-taskstoissues` | Convert tasks to GitHub issues | Not applicable; no issue creation requested | Requires explicit GitHub issue workflow |

## Duplicate and vendored discoveries

- Seventeen `.claude/skills/*/SKILL.md` files are byte-identical mirrors of the corresponding `.agents/skills` files; the canonical instructions above apply once rather than running duplicate workflows.
- Vendored skills were found in `node_modules` for dotenv/dotenvx, Redux Toolkit, and Playwright tooling. They document dependency-specific agent behavior and are not repository instructions. Redux guidance is not applicable because the ERP frontend uses its existing auth/data providers rather than Redux; dotenv is not part of this UI change; Playwright remains applicable through the repository's own E2E configuration, not its internal CLI-agent skills.

