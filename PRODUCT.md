# Product

<!-- uizze:product-schema 1 -->

## Platform

web

## Users

ClubGenies serves SME owners and administrators, department managers, and operational staff equally. The interface must support both supervisory decision-making and frequent transaction-oriented work without privileging one role's experience over the others.

## Product Purpose

ClubGenies is an integrated SME operations platform for running ERP, HR, attendance, payroll, finance, accounting, CRM, purchasing, sales, inventory, reporting, and related administrative workflows. Success means each authorised user can complete daily work efficiently, understand operational state, and move between connected business areas without losing context.

## Positioning

ClubGenies brings operational, workforce, commercial, and financial workflows together in one role-aware system, with AI assistance grounded in the application's real business data and permissions.

## Operating Context

Users work in the product for extended periods on desktop and mobile devices. They review dashboards, manage records, process transactions, configure organisational data, monitor attendance, run reports, and administer access. Interfaces need useful data density, predictable navigation, clear state communication, and efficient keyboard and touch interaction.

## Capabilities and Constraints

- Preserve the existing React, TypeScript, Vite, and Nx architecture.
- Preserve backend API contracts, domain rules, authentication, authorisation, and route behavior unless a verified defect requires a coordinated change.
- Render only functionality and business data supported by the repository, API, or database.
- Support English and Arabic, including RTL layout behavior.
- Employee-only users must remain constrained to their authorised attendance experience.
- Super administrators, company administrators, managers, and operational roles retain their existing permission boundaries.

## Brand Commitments

- Product name: ClubGenies.
- Preserve and systematise the established slate/navy palette: `#e0e1dd`, `#778da9`, `#415a77`, `#1b263b`, and `#0d1b2a`.
- The product should feel mature, trustworthy, efficient, and intentionally designed for enterprise operations.

## Evidence on Hand

The repository contains implemented frontend routes, API features, database migrations, tests, role and permission definitions, localisation resources, and existing operational data contracts. No unsupported metrics, claims, entities, or placeholder workflows may be invented during the redesign.

## Product Principles

1. Operational clarity before decoration.
2. Equal-quality experiences across authorised roles.
3. Dense, legible, and predictable daily workflows.
4. Business truth and secure permissions remain authoritative.
5. Shared patterns stay consistent while each module reflects its actual job.

## Accessibility & Inclusion

Target WCAG 2.2 AA where practical, including keyboard access, visible focus, semantic structure, accessible names, contrast, reduced motion, usable touch targets, and equivalent English/Arabic and LTR/RTL experiences.
