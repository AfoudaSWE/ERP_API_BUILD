---
name: code-quality-linting
description: Configure or repair linting, formatting, TypeScript quality, import boundaries, staged checks, commit hooks, and CI gates. Use for ESLint, Prettier, Stylelint, type checking, Nx module boundaries, code-quality automation, conventional commits when requested, or conflicting developer tools.
---

# Code Quality and Linting

1. Inspect `AGENTS.md`, docs, manifests, lockfiles, editor settings, TypeScript, ESLint/Prettier/Stylelint, Nx, hooks, staged checks, and CI.
2. Determine tool versions, generated configuration, file types, package boundaries, and commands. Check current official documentation.
3. Identify the concrete gap or conflict. Preserve the established formatter and avoid duplicated rules.
4. Implement the smallest coherent changes, using shared root policy with narrow overrides.
5. Run formatting checks, lint, typecheck, tests, builds, and Nx affected targets. Test staged commands without rewriting unrelated files.
6. Report files, commands, results, assumptions, exceptions, compatibility, and debt.

## Quality policy

- Let formatters own layout and linters own correctness, maintainability, accessibility, security, and architecture.
- Enable type-aware linting only where supported and account for CI cost.
- Keep TypeScript strictness aligned; tighten incrementally when legacy code blocks an atomic change.
- Enforce import boundaries based on ownership and layer direction.
- Exclude generated, vendored, build, cache, coverage, and migration artifacts appropriately.
- Prefer fast staged checks and complete CI checks; hooks are not the only enforcement.
- Add conventional commits only when requested or already policy.
- Avoid broad rewrites, conflicting formatters, duplicated plugins, obsolete shims, and permanently ignored warnings.

Read [quality-checklist.md](references/quality-checklist.md) for new toolchains or major migrations.

