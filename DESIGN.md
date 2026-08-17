---
name: ClubGenies
description: Operational Manifest for a dense, bilingual SME operations platform.
colors:
  canvas-light: "#f7f8f7"
  surface-muted: "#e0e1dd"
  slate: "#778da9"
  action: "#415a77"
  navy: "#1b263b"
  ink: "#0d1b2a"
  success: "#059669"
  warning: "#d97706"
  danger: "#dc2626"
typography:
  body-ltr:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  body-rtl:
    fontFamily: "Tajawal, Cairo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  page-title:
    fontFamily: "inherit"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  label:
    fontFamily: "inherit"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  nav: "0.375rem"
  control: "0.5rem"
  surface: "0.75rem"
  pill: "9999px"
spacing:
  xs: "0.375rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
    height: "2.5rem"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    typography: "{typography.body-ltr}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1rem"
    height: "2.5rem"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "1.5rem"
---

# Design System: ClubGenies

## Overview

**Creative North Star: “Operational Manifest”**

ClubGenies is a mature operations workspace, not a decorative dashboard. Its visual hierarchy comes from compact typography, crisp dividers, deliberate alignment, and a slate-to-navy tonal range. The interface supports long sessions and frequent transactions: context is easy to scan, primary actions sit beside page titles, and status colour remains rare and meaningful.

The shell and shared primitives are the default visual authority. Auth deliberately becomes a dark, split-screen threshold; the employee attendance portal becomes a simpler touch-first workflow while retaining the same navy identity.

**Key characteristics:** dense but legible, flat by default, border-led, role-aware, bilingual, dark-mode complete, and restrained in motion and colour.

## Colors

The palette moves from warm off-white through muted slate into deep navy. White and the light canvas carry most content; Action Slate drives controls and active navigation; Ink Navy anchors identity and dark surfaces. Success, warning, and danger are reserved for business state, feedback, and destructive actions. AI styling reuses the primary slate family rather than introducing a separate novelty gradient.

Light mode uses the light canvas with white surfaces and cool slate borders. Dark mode uses Ink Navy as the canvas, Navy as the surface, lighter slate for text, and darker slate borders. Auth is always rendered in the dark register. Selection uses Action Slate with white text.

**The Semantic Rarity Rule.** Green, amber, and red communicate state; they do not decorate modules or charts without a state meaning.

## Typography

Direction selects the family: Inter for LTR English and Tajawal with Cairo fallback for RTL Arabic. Body and control copy is normally 14px; auxiliary metadata and badges are 12px. Page titles are usually 24px, bold, and tightly tracked. Section titles use 16–20px at semibold or bold; dashboard values use 24px bold with tabular numerals.

Auth alone expands the headline to 36px and 48px at the small breakpoint, with tight leading and tracking. The attendance clock uses a monospaced, tabular-numeric treatment at 36–48px. Labels remain sentence case except compact fieldset legends, which are 12px uppercase with wide tracking.

**The Data First Rule.** Numeric columns, KPIs, identifiers, money, and time use stable alignment and tabular numerals; typography must make comparison easier, not more expressive.

## Layout

The application shell combines a fixed logical-start sidebar with a sticky 64px identity header. On desktop (1024px and above), the rail is 256px expanded or 80px collapsed and the workspace padding follows it. Below desktop, the rail is an overlay up to 288px wide with a dimmed backdrop. Content is centered in a `112rem` maximum frame with responsive padding of 16px, 20px, 24px, then 32px.

Pages begin with a title/context band and aligned actions, separated from work by a bottom rule. Content uses responsive one-column-first grids: two columns commonly begin at 640px or 768px; higher-density dashboard and detail layouts expand at 1024px and 1280px. Forms collapse to one column and become two-column at 768px. Action rows stack or reverse on narrow screens so the primary action remains easy to reach.

Tables retain their intrinsic density and scroll horizontally inside a clipped bordered container. The employee attendance portal is capped at 48rem and uses larger touch-led spacing. The system supports a minimum viewport width of 320px.

**The Logical Edge Rule.** Use logical start/end positioning, padding, borders, and text alignment so the same composition mirrors cleanly between LTR and RTL.

## Elevation & Depth

The core ERP is flat by default. Cards, stat surfaces, sections, and tables use tonal separation and 1px borders, not ambient shadows. Elevation appears only where layering must be unmistakable: the mobile sidebar edge, modal/employee-form scrims, transient feedback, and the attendance portal’s prominent login and punch surfaces. Scrims use deep navy at roughly 55–60% opacity.

**The Border Before Shadow Rule.** Establish hierarchy with surface tone, divider, and spacing before adding a shadow. Never add shadow to routine cards or dashboard tiles.

## Shapes

Controls use an 8px radius, navigation rows 6px, and standard cards/table containers 12px. Badges, notification dots, and compact identity marks may be fully pill-shaped. Borders are crisp and cool slate. Dashboard summary cells intentionally remove card rounding and divide into a continuous operational strip.

The attendance portal is the shipped exception: its central task surfaces use 24px corners and the punch control is circular. These shapes belong to the focused employee workflow and must not migrate into the ERP shell.

## Components

### Shell and navigation

Sidebar links are compact rows with icon, label, hover fill, and a quiet primary-tinted active state. Active links add a narrow logical-start marker. Nested groups use an inset logical-start divider. The header shows identity at start and role, locale, theme, and sign-out controls at end; secondary metadata truncates before controls collide.

### Cards and dashboard

Standard cards are white/dark-navy surfaces with a 12px radius, 1px border, no shadow, 16–24px internal padding, and optional ruled headers. Stat cards use 14px muted labels, 24px bold values, compact trend text, and restrained icon tiles. Dashboard summary cards merge into a divided grid rather than appearing as floating tiles.

### Tables

Tables use 14px type and tabular numerals. Headers are sticky, start-aligned, semibold, nowrap, and placed on a muted surface. Cells use 12px vertical and 16px horizontal padding with row dividers; hover changes only the row background. Numeric columns align to the logical end. The table container owns horizontal scrolling and outer rounding.

### Forms and actions

Inputs and selects are 40px minimum height with 14px text, 8px corners, 1px slate borders, and 10px/16px padding. Focus shifts the border to slate and adds a 3px translucent slate ring. Select chevrons and padding mirror in RTL. Labels are explicit and placed above controls; required state, help, and errors remain adjacent to the field. Long forms group related controls under fieldsets and use one/two-column grids.

Buttons share a 40px minimum height, medium weight, 8px radius, and 150ms colour transitions. Primary is Action Slate on white; secondary is a bordered muted surface; ghost is transparent until hover; success and danger are semantic. Icon-only buttons retain a 40px square target and an accessible name. Disabled controls use reduced opacity and a not-allowed cursor.

### States and feedback

Badges are compact 12px pills with pale semantic backgrounds and dark semantic text. Inline success, warning, error, and loading notices use `role=status` or `role=alert`, a 12px radius, and readable text/background pairing. Empty states center a 40px muted icon, 18px semibold title, and constrained 14px explanation. Permission denial, API retry, loading, modal, and destructive confirmation states are explicit rather than implied.

## Do's and Don'ts

### Do

- **Do** preserve the Operational Manifest: compact hierarchy, strong alignment, borders, and business truth before decoration.
- **Do** build from the shared card, button, input, select, badge, table, shell, and empty-state language.
- **Do** support light/dark and English/Arabic together, including mirrored controls and logical-edge active markers.
- **Do** keep focus visible with the shipped 2px global outline or the input’s border-and-ring treatment.
- **Do** keep interactive targets at least 40px where the shipped primitives establish that size, and retain semantic labels for icon-only actions.
- **Do** use 150–300ms colour, width, transform, opacity, fade, or short slide transitions only when they clarify state or spatial change. Reduced-motion mode collapses animation and smooth scrolling to effectively instantaneous behavior.

### Don't

- **Don't** turn routine ERP content into floating, shadowed, oversized, or highly rounded cards.
- **Don't** introduce gradients, glassmorphism, saturated module colours, decorative illustrations, or a separate purple “AI” visual language.
- **Don't** use semantic colours without a status meaning, or colour alone as the only state cue.
- **Don't** replace dense tables with spacious card lists on desktop; retain horizontal scroll on narrow screens.
- **Don't** hard-code left/right where a logical property or direction-aware alignment is available.
- **Don't** animate continuously except for progress indicators, or ignore `prefers-reduced-motion`.
- **Don't** copy the attendance portal’s 24px/circular task shapes into the main administrative shell.
