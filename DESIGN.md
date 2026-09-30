---
version: alpha
name: Haziniy SSP
description: Balanced Scorecard (SSP) web app for Haziniy ilm maskani — a multi-branch learning center in Fergana, Uzbekistan. Calm, professional, data-first; brand dark green with a mint accent.
colors:
  primary: "#0A5D3A"
  primary-hover: "#084A2E"
  primary-active: "#063A24"
  on-primary: "#FFFFFF"
  secondary: "#2FBF71"
  secondary-soft: "#E9F7EF"
  on-secondary-soft: "#0A5D3A"
  neutral: "#F6F8F7"
  surface: "#FFFFFF"
  surface-muted: "#F1F4F2"
  on-surface: "#1B2420"
  on-surface-muted: "#5F6E66"
  border: "#E2E8E4"
  border-strong: "#C9D3CD"
  status-red: "#B33636"
  status-red-soft: "#FBE9E9"
  status-amber: "#8A6100"
  status-amber-fill: "#E0A100"
  status-amber-soft: "#FFF4D6"
  status-green: "#17703D"
  status-green-fill: "#1F9D55"
  status-green-soft: "#E3F5EA"
  chart-plan: "#9AA8A0"
  chart-fact: "#0A5D3A"
  error: "#B33636"
  focus-ring: "#2FBF71"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
    fontFeature: "'tnum' 1"
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.04em
  number-kpi:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "'tnum' 1"
  number-table:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
spacing:
  base: 8px
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  page-margin-desktop: 32px
  page-margin-mobile: 16px
  sidebar-width: 248px
  sidebar-collapsed: 72px
  topbar-height: 64px
  bottom-nav-height: 64px
  content-max-width: 1440px
  tap-target: 44px
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
components:
  app-background:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
  sidebar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    width: "{spacing.sidebar-width}"
  sidebar-item-active:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  topbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    height: "{spacing.topbar-height}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  kpi-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.number-kpi}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 0 16px
  button-danger:
    backgroundColor: "{colors.status-red}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    height: 40px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 0 12px
  input-fact-mobile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-sm}"
    rounded: "{rounded.md}"
    height: 52px
  chip-period:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 0 12px
  chip-period-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  badge-status-red:
    backgroundColor: "{colors.status-red-soft}"
    textColor: "{colors.status-red}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-status-amber:
    backgroundColor: "{colors.status-amber-soft}"
    textColor: "{colors.status-amber}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-status-green:
    backgroundColor: "{colors.status-green-soft}"
    textColor: "{colors.status-green}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  progress-track:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.full}"
    height: 8px
  table-header:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-sm}"
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.number-table}"
    height: 48px
  department-row:
    backgroundColor: "{colors.secondary-soft}"
    textColor: "{colors.on-secondary-soft}"
    typography: "{typography.label-lg}"
  editable-cell:
    backgroundColor: "{colors.secondary-soft}"
    textColor: "{colors.on-surface}"
    typography: "{typography.number-table}"
    rounded: "{rounded.sm}"
  computed-cell:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.number-table}"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    height: "{spacing.bottom-nav-height}"
  bottom-nav-active:
    textColor: "{colors.primary}"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  toast-error:
    backgroundColor: "{colors.status-red-soft}"
    textColor: "{colors.status-red}"
    rounded: "{rounded.md}"
  progress-fill-red:
    backgroundColor: "{colors.status-red}"
    rounded: "{rounded.full}"
  progress-fill-amber:
    backgroundColor: "{colors.status-amber-fill}"
    rounded: "{rounded.full}"
  progress-fill-green:
    backgroundColor: "{colors.status-green-fill}"
    rounded: "{rounded.full}"
  chart-line-plan:
    backgroundColor: "{colors.chart-plan}"
  chart-line-fact:
    backgroundColor: "{colors.chart-fact}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  input-border:
    backgroundColor: "{colors.border-strong}"
    width: 1px
  focus-ring:
    backgroundColor: "{colors.focus-ring}"
    width: 2px
---

# Haziniy SSP — Design System

## Overview

Haziniy SSP is the internal performance dashboard of Haziniy ilm maskani. It
shows, per branch and per department, how much of the monthly plan has been
fulfilled, based on daily facts entered by staff. Two audiences:

- **The Owner (Boshqaruvchi)** — works mostly on a desktop, configures branches,
  departments, metrics, roles, plans and bonuses, and reads the whole scorecard.
- **Staff in custom roles** (Filial admini, O'qituvchi, Sotuv menejeri…) — work
  mostly on a phone, enter yesterday's/today's facts in under a minute and check
  their own department and bonus progress.

Feel: calm, trustworthy, precise — a finance-grade tool, not a marketing site.
Numbers are the hero; decoration is minimal. Dense data on desktop is fine as
long as hierarchy is obvious at a glance: total score → department → metric.
All UI text is Uzbek (Latin script). Number format `1 234 567 so'm` (space as
thousands separator), dates `DD.MM.YYYY`, weeks start on Monday. Counts of
people are always whole numbers.

## Colors

The palette comes from the Haziniy logo: a deep green, a fresh mint accent and
white. Status colors are reserved for plan fulfilment and must mean the same
thing on every screen.

- **Primary (#0A5D3A):** brand dark green. Sidebar background, primary buttons,
  selected period chip, the "Fakt" line on charts, active navigation.
  Hover #084A2E, pressed #063A24. Text on it is white.
- **Secondary (#2FBF71):** mint/emerald accent. Focus rings, small highlights,
  positive micro-accents, logo accent. Never used for large text on white
  (insufficient contrast) — use it as a fill or border.
- **Secondary soft (#E9F7EF):** light mint surface for department header rows,
  editable plan cells and selected list items.
- **Neutral (#F6F8F7):** page background; cards sit on it in pure white
  **Surface (#FFFFFF)**. **Surface muted (#F1F4F2)** is for table headers,
  computed read-only cells and progress tracks.
- **On-surface (#1B2420)** for main text, **on-surface-muted (#5F6E66)** for
  secondary text, captions and axis labels. **Border (#E2E8E4)** for dividers,
  **border-strong (#C9D3CD)** for inputs.
- **Status (fulfilment %):**
  - Red — below the minimum bonus level (default < 90%): text #B33636 on
    soft #FBE9E9.
  - Amber — between minimum and excellent (default 90–99%): text #8A6100 on
    soft #FFF4D6; bar/ring fill #E0A100.
  - Green — excellent or above (default ≥ 100%): text #17703D on soft #E3F5EA;
    bar/ring fill #1F9D55.
  Thresholds come from the app settings, never hard-coded.
- **Charts:** Reja (plan) line #9AA8A0 dashed, Fakt (fact) line #0A5D3A solid.
- **Error (#B33636):** form errors and destructive actions (same hue as
  status-red on purpose).

## Typography

One family, **Inter**, for everything; hierarchy comes from size and weight.
All numbers use tabular figures (`font-feature-settings: 'tnum'`) so columns of
figures align.

- **display-lg / number-kpi:** the big total SSP % and KPI values.
- **headline-lg / md / sm:** page titles, card titles, section titles.
- **body-lg:** inputs and important text; **body-md (14px)** is the default UI
  text; **body-sm** for dense tables and helper text.
- **label-lg / md / sm:** buttons, chips, badges, table headers
  (label-sm is used uppercase with slight letter-spacing).
- **number-table:** every numeric cell in tables.

Use at most three weights per screen (400, 600, 700).

## Layout

- **Desktop (≥ 1024px):** fixed left sidebar 248px (collapsible to 72px, icons
  only) in primary green with the logo on top; white top bar 64px with branch
  switcher, global period selector and user menu; content area on the neutral
  background, max width 1440px, 32px page margin, 24px gutter, 12-column grid.
- **Tablet (640–1023px):** sidebar collapsed to icons by default.
- **Mobile (< 640px):** no sidebar; 16px page margin; bottom navigation (64px)
  with 4 items — SSP, Fakt kiritish, Bonusim, Menyu. Fact entry and the SSP
  summary are designed mobile-first; wide tables scroll horizontally inside
  their card with the first column sticky.
- **Spacing:** 8px base scale (4px half-step). Cards have 24px padding, stacked
  cards have 16px gaps, form fields 16px apart. Minimum tap target 44px.
- **Global controls:** period chips — Bugun, Kecha, Bu hafta, O'tgan hafta,
  Bu oy, O'tgan oy, Chorak, Yil, Dan – gacha (range calendar). On mobile the
  chips scroll horizontally.

## Elevation & Depth

Mostly flat, with tonal layers: white cards on the light neutral background,
separated by a 1px border (#E2E8E4) and a very soft shadow
`0 1px 2px rgba(16, 24, 20, 0.06)`. Raised layers only for overlays:
dropdowns and popovers `0 8px 24px rgba(16, 24, 20, 0.12)`; modals the same
shadow plus a backdrop `rgba(10, 30, 20, 0.45)`. No gradients inside the app;
a subtle primary→primary-hover gradient is allowed only on the login page
background.

## Shapes

Soft and friendly but disciplined: 8px radius for buttons and inputs, 12px for
cards, 16px for modals and bottom sheets, full pills for chips, badges and
progress bars, 6px for small editable table cells. Never sharp 0px corners on
interactive elements; never mix radii within one component group.

## Components

- **KPI card:** title (label-md, muted), big value (number-kpi), a circular
  progress ring in the status fill color, sub-line "Reja: 70 · Fakt: 63"
  (body-sm) and the status badge.
- **Metric row (SSP table):** Ko'rsatkich, Vazn, Reja, Fakt, Farq (+ green /
  − red text), Bajarilish % as progress bar + status badge (bar visually capped
  at 120%), sparkline, chevron to details. Department header rows use the
  secondary-soft background and show the department's weighted %.
- **Buttons:** primary (green fill) for the single main action per screen;
  secondary (white with green text and border-strong border); danger (red) only
  inside delete confirmations. Height 40px (48px on mobile full-width).
- **Inputs:** 44px height, 1px border-strong, label above, helper/error text
  below; focus ring 2px secondary. Fact-entry inputs on mobile are 52px, numeric
  keypad, right-aligned numbers, today's plan shown as muted helper text
  ("Bugungi reja: 3").
- **Editable vs computed cells:** editable plan cells use secondary-soft
  background; computed cells use surface-muted with muted text and are never
  editable.
- **Period chips:** pill, selected = primary fill + white text.
- **Status badges:** pill with soft background and strong text of the same
  status color; always show the number ("92%"), never color alone.
- **Tables:** sticky header in surface-muted, label-sm uppercase headers, 48px
  rows, numbers right-aligned, zebra striping off (borders only).
- **Permission matrix (Rollar):** rows = modules, columns = Ko'rish / Qo'shish /
  Tahrirlash / O'chirish, checkbox cells centered, "hammasini belgilash" per row
  and column.
- **Modal / drawer:** white, 16px radius, title headline-sm, actions bottom-right
  (secondary then primary); every delete asks for confirmation.
- **Toasts:** top-right on desktop, top on mobile; success in green soft,
  error in red soft.
- **Empty states:** simple line icon, one sentence, one primary action.
- **Loading:** skeleton blocks in surface-muted, no spinners for page loads.
- **Logo:** full logo (mark + "HAZINIY" wordmark) in the expanded sidebar and
  login card; mark only in the collapsed sidebar, favicon and PWA icon. Use the
  white version on primary green, the green version on white.

## Do's and Don'ts

- Do keep status colors exclusively for fulfilment state (red/amber/green) —
  never use them for decoration.
- Do always pair a color with a number or label (accessibility, color-blind
  users).
- Do show counts of people as whole numbers ("4 ta", not "3.8 ta"); only money
  and percentages may have decimals.
- Do use one primary button per screen.
- Do keep all UI text in Uzbek (Latin) and all numbers in tabular figures.
- Don't use the mint accent (#2FBF71) as text on white.
- Don't add gradients, illustrations or heavy shadows inside the app.
- Don't show features the user's role has no permission for — hide them.
- Do maintain WCAG AA contrast (4.5:1 for body text).
