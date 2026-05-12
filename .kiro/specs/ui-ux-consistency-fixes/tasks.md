# Implementation Plan: UI/UX Consistency Fixes

## Overview

Implement 14 design-system consistency fixes across the PropTool web app, prioritised Critical → Low. The plan starts with design token additions, then introduces two new shared components (PageHeader, PillTabs), applies component-level fixes in priority order, and finishes with integration wiring. Property-based tests validate correctness properties from the design document.

## Tasks

- [x] 1. Add design tokens and foundational config
  - [x] 1.1 Add `letterSpacing.label` to `tailwind.config.ts` and CSS variables to `globals.css`
    - Add `label: '0.05em'` to `theme.extend.letterSpacing` in tailwind config
    - Add `--status-red: #FF5A5A`, `--sparkline-positive: var(--aqua)`, `--sparkline-negative: var(--status-red)` to `:root` in `globals.css`
    - _Requirements: 12.1, 13.1_

- [x] 2. Critical fixes (C1–C3)
  - [x] 2.1 Dark-theme rewrite of AreaInsightCard [C1]
    - Replace all light-theme classes in `components/insights/area-insight-card.tsx` with Onyx_Palette equivalents per the design mapping table
    - `bg-white` → `bg-onyx-card`, `border-gray-200` → `border-onyx-line`, `text-gray-900` → `text-white`, etc.
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Write property test for AreaInsightCard dark-theme exclusivity
    - **Property 1: AreaInsightCard dark-theme exclusivity**
    - Render AreaInsightCard with arbitrary valid props using fast-check; assert rendered output contains no light-theme classes (`bg-white`, `bg-gray-50`, `bg-gray-100`, `bg-blue-50`, `text-gray-900`, `text-gray-700`, `text-gray-600`, `text-gray-500`, `border-gray-100`, `border-gray-200`, `border-gray-50`)
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.3 Standardise form control border radius [C2]
    - Audit all `<input>`, `<select>`, `<textarea>` elements across `apps/web/src/`
    - Replace any `rounded-md`, `rounded-lg`, `rounded-2xl`, or `rounded-full` on form controls with `rounded-xl`
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Fix brand accent colour on SettingsToggle [C3]
    - In `components/settings/settings-tabs.tsx`, replace `bg-brand-600` with `bg-brand` in the toggle conditional class
    - _Requirements: 3.1, 3.2_

- [x] 3. Checkpoint — Critical fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. High-priority fixes (H1–H4) — New PageHeader component and token corrections
  - [x] 4.1 Create shared PageHeader component [H1]
    - Create `components/ui/page-header.tsx` with `BreadcrumbItem` and `PageHeaderProps` interfaces
    - Implement breadcrumb trail with navigable links for non-last items and plain text for last item
    - Use Onyx_Palette tokens for all colours; include `aria-label="Breadcrumb"` on nav element
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 4.2 Write property test for PageHeader breadcrumb link correctness
    - **Property 2: PageHeader breadcrumb link correctness**
    - Generate arbitrary breadcrumbs arrays (length ≥ 1) with fast-check; assert all non-last items with href render as `<a>` elements and last item renders as non-interactive text
    - **Validates: Requirements 4.3, 4.4**

  - [x] 4.3 Integrate PageHeader into dashboard pages [H1]
    - Import and render `<PageHeader>` at the top of listings, contacts, deals, and settings pages that currently lack a structured header
    - Pass appropriate breadcrumbs and title props for each page
    - _Requirements: 4.5_

  - [x] 4.4 Enforce minimum text size on ListingCard [H2]
    - In `components/listings/listings-card-grid.tsx`, replace all `text-[9px]` with `text-[11px]`
    - _Requirements: 5.1, 5.2_

  - [x] 4.5 Write property test for ListingCard minimum font size
    - **Property 3: ListingCard minimum font size**
    - Render ListingsCardGrid with arbitrary valid listing data; assert rendered output contains no `text-[9px]`, `text-[10px]`, or any arbitrary font-size class below 11px
    - **Validates: Requirements 5.1, 5.2**

  - [x] 4.6 Fix MobileNav active pill and text size [H3]
    - In `components/layout/mobile-nav.tsx`, add `bg-brand` pill background to active item
    - Replace `text-[10px]` with `text-[11px]` for all navigation labels
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.7 Write property test for MobileNav active state and minimum font size
    - **Property 4: MobileNav active state and minimum font size**
    - Render MobileNav with arbitrary pathname matching a nav item; assert active item has `bg-brand` and no label uses `text-[10px]` or smaller
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 4.8 Fix ChatBackButton radius [H4]
    - In `components/messages/chat-thread.tsx`, replace `rounded-md` with `rounded-xl` on the back button
    - _Requirements: 7.1, 7.2_

- [x] 5. Checkpoint — High-priority fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Medium-priority fixes (M1–M5) — Component rewrites and PillTabs
  - [x] 6.1 Fix TheBrief panel radius [M1]
    - In `components/dashboard/the-brief.tsx`, replace `rounded-3xl` with `rounded-2xl`
    - _Requirements: 8.1, 8.2_

  - [x] 6.2 Replace BuyerFitPanel text indicators with coloured dots [M2]
    - In `components/insights/buyer-fit-panel.tsx`, replace "✓" with `<span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-status-green" />`
    - Replace "!" with `<span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-status-amber" />`
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 6.3 Write property test for BuyerFitPanel dot indicators
    - **Property 5: BuyerFitPanel dot indicators**
    - Render BuyerFitPanel with arbitrary non-empty fitSignals and watchouts arrays; assert indicators are `<span>` elements with `rounded-full` and appropriate status colour, and no "✓" or "!" text content exists
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 6.4 Implement always-visible PipelineDropHint [M3]
    - In `components/pipeline/pipeline-board.tsx`, replace dashed border with solid border
    - Make drop hint always visible in subdued state (`border-onyx-line/50 text-gray-2/60`)
    - Highlight on drag-over (`border-brand/60 bg-brand/5 text-brand`) using `activeId` state
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 6.5 Create shared PillTabs component [M4]
    - Create `components/ui/pill-tabs.tsx` with `Tab` and `PillTabsProps` interfaces
    - Implement controlled tab-switcher with `rounded-pill`, `bg-brand` active state, `role="tablist"` and `aria-selected`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 6.6 Write property test for PillTabs rendering correctness
    - **Property 6: PillTabs rendering correctness**
    - Generate arbitrary tabs arrays and selected value with fast-check; assert every tab has `rounded-pill`, only the selected tab has `bg-brand`, and all others do not
    - **Validates: Requirements 11.2, 11.3, 11.4**

  - [x] 6.7 Replace listings tab switcher with PillTabs [M4]
    - In `components/listings/listings-client-shell.tsx`, replace the existing tab switcher markup with `<PillTabs>` component
    - _Requirements: 11.6_

  - [x] 6.8 Standardise section label tracking [M5]
    - Search all section labels across `apps/web/src/` and replace `tracking-wide`, `tracking-wider`, `tracking-[1.5px]`, `tracking-[1.2px]` with `tracking-label`
    - _Requirements: 12.1, 12.2_

- [x] 7. Checkpoint — Medium-priority fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Low-priority fixes (L1–L2)
  - [x] 8.1 Replace Sparkline hardcoded hex colours with CSS variables [L1]
    - In `components/dashboard/kpi-strip.tsx`, replace `'#FF5A5A'` with `'var(--sparkline-negative)'` and `'#8EFEFF'` with `'var(--sparkline-positive)'` in stroke attributes
    - _Requirements: 13.1, 13.2_

  - [x] 8.2 Write property test for Sparkline CSS variable usage
    - **Property 7: Sparkline CSS variable usage**
    - Render Sparkline with arbitrary data arrays and warn flag; assert stroke attribute references CSS custom properties and contains no inline hex colour literals matching `#[0-9A-Fa-f]{3,8}`
    - **Validates: Requirements 13.1, 13.2**

  - [x] 8.3 Fix Clear Filters link style [L2]
    - In `components/pipeline/pipeline-filter-bar.tsx` and `components/listings/listings-client-shell.tsx`, remove `underline underline-offset-2`, apply `text-brand hover:text-brand/70`
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each priority tier
- Property tests use `fast-check` (already installed) with `vitest` and `@testing-library/react`
- All changes are scoped to `apps/web/src/` — no backend or data model changes
- Design tokens (task 1.1) must be completed first as other tasks depend on the new utility classes and CSS variables

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.4"] },
    { "id": 2, "tasks": ["2.2", "4.1", "4.4", "4.6", "4.8"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.5", "4.7"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.4", "6.5", "6.8"] },
    { "id": 5, "tasks": ["6.3", "6.6", "6.7"] },
    { "id": 6, "tasks": ["8.1", "8.3"] },
    { "id": 7, "tasks": ["8.2"] }
  ]
}
```
