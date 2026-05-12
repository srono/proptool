# Requirements Document

## Introduction

This specification covers 14 UI/UX design-system consistency fixes for the PropTool web application. The fixes enforce a dark-first colour palette, standardised border radii, minimum text sizes, correct accent colours, consistent section-label tracking, and the introduction of two new shared components (PageHeader and PillTabs). Fixes are prioritised into Critical (C), High (H), Medium (M), and Low (L) tiers.

## Glossary

- **App**: The PropTool Next.js 15 web application located at `apps/web/src/`
- **Design_System**: The set of colour tokens, radii, typography, and component conventions defined in `globals.css` and `tailwind.config.ts`
- **AreaInsightCard**: The component in `area-insight-card.tsx` that renders neighbourhood insight data
- **FormControl**: Any `<input>`, `<select>`, or `<textarea>` element rendered within the App
- **SettingsToggle**: The toggle switch components rendered in `settings-tabs.tsx`
- **PageHeader**: A new shared component that renders a breadcrumb trail and page title at the top of each page
- **ListingCard**: The card component rendered in `listings-card-grid.tsx`
- **MobileNav**: The bottom navigation bar rendered in `mobile-nav.tsx`
- **ChatBackButton**: The back-navigation button rendered in `chat-thread.tsx`
- **TheBrief**: The brief summary panel rendered in `the-brief.tsx`
- **BuyerFitPanel**: The buyer-fit scoring panel rendered in `buyer-fit-panel.tsx`
- **PipelineDropHint**: The drop-target indicator rendered at the bottom of each pipeline column in `pipeline-board.tsx`
- **PillTabs**: A new shared generic controlled tab-switcher component that renders pill-shaped tab buttons
- **SectionLabel**: Any uppercase label used as a section heading or group title within the App
- **Sparkline**: The inline SVG sparkline chart rendered in `kpi-strip.tsx`
- **ClearFiltersLink**: The "Clear filters" interactive text link rendered in `pipeline-filter-bar.tsx` and `listings-client-shell.tsx`
- **Onyx_Palette**: The dark-first colour tokens: onyx, onyx-card, onyx-raised, onyx-line, brand, brand-deep, aqua, gray-2, status-red, status-amber, status-green

## Requirements

### Requirement 1 — Dark Theme Rewrite for AreaInsightCard [C1]

**User Story:** As a user, I want the AreaInsightCard to use the dark colour palette, so that the component is visually consistent with the rest of the App.

#### Acceptance Criteria

1. THE AreaInsightCard SHALL use only Onyx_Palette background tokens (onyx, onyx-card, onyx-raised) and SHALL NOT use any light-theme backgrounds (bg-white, bg-gray-50, bg-gray-100, or equivalent).
2. THE AreaInsightCard SHALL use light foreground text colours (text-white, text-gray-2, or equivalent Onyx_Palette tokens) and SHALL NOT use dark foreground colours (text-gray-900, text-gray-700, or equivalent).
3. THE AreaInsightCard SHALL use onyx-line for any internal borders or dividers.

### Requirement 2 — Form Control Radius Standardisation [C2]

**User Story:** As a user, I want all form inputs and selects to have a consistent border radius, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE App SHALL apply `rounded-xl` border radius to every FormControl (input, select, textarea) rendered within the App.
2. THE App SHALL NOT apply `rounded-md`, `rounded-lg`, `rounded-2xl`, or `rounded-full` to any FormControl.

### Requirement 3 — Brand Accent Colour Correction [C3]

**User Story:** As a user, I want interactive accent colours to use the correct brand token, so that the design system is applied consistently.

#### Acceptance Criteria

1. THE SettingsToggle SHALL use `bg-brand` as the active-state background colour.
2. THE SettingsToggle SHALL NOT use `bg-brand-600` or any other non-token brand variant.

### Requirement 4 — Shared PageHeader Component [H1]

**User Story:** As a user, I want a consistent page header with breadcrumbs and a title on every page, so that I always know where I am in the App.

#### Acceptance Criteria

1. THE PageHeader SHALL render a breadcrumb trail displaying the navigation path (e.g. "Dashboard / Listings / Edit") followed by the current page title.
2. THE PageHeader SHALL accept a breadcrumbs prop (array of label/href pairs) and a title prop (string).
3. WHEN a breadcrumb segment is not the last item, THE PageHeader SHALL render the segment as a navigable link.
4. WHEN a breadcrumb segment is the last item, THE PageHeader SHALL render the segment as plain non-interactive text.
5. THE PageHeader SHALL be rendered on every page within the dashboard layout that currently lacks a structured header.
6. THE PageHeader SHALL use Onyx_Palette tokens for all backgrounds and text colours.

### Requirement 5 — Minimum Text Size Enforcement on ListingCard [H2]

**User Story:** As a user, I want all text in listing cards to be legible, so that I can read property details without straining.

#### Acceptance Criteria

1. THE ListingCard SHALL use a minimum font size of `text-[11px]` for all rendered text.
2. THE ListingCard SHALL NOT use `text-[9px]` or any font size below 11px.

### Requirement 6 — Mobile Nav Active Pill Background [H3]

**User Story:** As a user, I want the active navigation item on mobile to be clearly highlighted, so that I can identify the current section.

#### Acceptance Criteria

1. WHEN a navigation item is active, THE MobileNav SHALL render the active item with a `bg-brand` pill background.
2. THE MobileNav SHALL use a minimum font size of `text-[11px]` for navigation labels.
3. THE MobileNav SHALL NOT use `text-[10px]` or any font size below 11px for navigation labels.

### Requirement 7 — Chat Back Button Radius [H4]

**User Story:** As a user, I want the chat back button to match the design system radius conventions, so that the interface is visually consistent.

#### Acceptance Criteria

1. THE ChatBackButton SHALL use `rounded-xl` border radius.
2. THE ChatBackButton SHALL NOT use `rounded-md` or any other non-standard radius value.

### Requirement 8 — TheBrief Panel Radius [M1]

**User Story:** As a user, I want the brief panel to use the correct card radius, so that panels look uniform across the App.

#### Acceptance Criteria

1. THE TheBrief SHALL use `rounded-2xl` border radius.
2. THE TheBrief SHALL NOT use `rounded-3xl` or any other non-standard card radius value.

### Requirement 9 — BuyerFitPanel Coloured Dots [M2]

**User Story:** As a user, I want buyer-fit indicators to use coloured dots instead of text characters, so that the UI avoids emoji-like iconography.

#### Acceptance Criteria

1. THE BuyerFitPanel SHALL render status indicators as coloured dot elements (w-1.5 h-1.5 rounded-full with appropriate status colour).
2. THE BuyerFitPanel SHALL NOT render "✓", "!", or any text character as a status indicator.
3. THE BuyerFitPanel SHALL use `status-green` for positive indicators and `status-amber` or `status-red` for warning or negative indicators.

### Requirement 10 — Pipeline Drop Hint [M3]

**User Story:** As a user, I want to see where I can drop a card in the pipeline, so that drag-and-drop interactions are intuitive.

#### Acceptance Criteria

1. THE PipelineDropHint SHALL be always visible as a subtle solid-border placeholder at the bottom of each pipeline column.
2. THE PipelineDropHint SHALL use a solid border style (not dashed).
3. WHEN a dragged item hovers over the PipelineDropHint, THE PipelineDropHint SHALL visually highlight to indicate an active drop target (e.g. increased border opacity or background change).
4. WHILE no drag interaction is occurring, THE PipelineDropHint SHALL remain visible in a subdued/low-contrast state.
5. THE PipelineDropHint SHALL use Onyx_Palette tokens for border and background colours.

### Requirement 11 — Shared PillTabs Component [M4]

**User Story:** As a user, I want tab switchers across the App to look and behave identically, so that navigation patterns are predictable.

#### Acceptance Criteria

1. THE PillTabs SHALL be a fully generic controlled component that accepts an array of tab objects (each containing at minimum a label and a value) and a value prop plus an onChange callback.
2. THE PillTabs SHALL render each tab as a pill-shaped button using `rounded-pill` border radius.
3. WHEN a tab is selected, THE PillTabs SHALL apply `bg-brand` to the active tab.
4. WHEN a tab is not selected, THE PillTabs SHALL render the tab in a subdued style using Onyx_Palette tokens.
5. THE PillTabs SHALL be reusable across listings, pipeline, and any future pages without modification.
6. THE App SHALL replace the existing listings tab switcher with the shared PillTabs component.

### Requirement 12 — Section Label Tracking Standardisation [M5]

**User Story:** As a user, I want section labels to have consistent letter spacing, so that the typography feels uniform.

#### Acceptance Criteria

1. THE App SHALL apply `tracking-[0.05em]` letter spacing to every SectionLabel.
2. THE App SHALL NOT use `tracking-[1.5px]`, `tracking-[1.2px]`, or any other non-standard tracking value for SectionLabel elements.

### Requirement 13 — Sparkline CSS Variable Colours [L1]

**User Story:** As a user, I want sparkline colours to adapt to theme changes, so that the charts remain legible across contexts.

#### Acceptance Criteria

1. THE Sparkline SHALL reference CSS custom properties (variables) for stroke and fill colours instead of hardcoded hex values.
2. THE Sparkline SHALL NOT contain any inline hex colour literals (e.g. `#3B82F6`, `#10B981`).

### Requirement 14 — Clear Filters Link Style [L2]

**User Story:** As a user, I want the "Clear filters" link to match the App's link styling conventions, so that interactive text is styled consistently.

#### Acceptance Criteria

1. THE ClearFiltersLink SHALL NOT render with a text-decoration underline.
2. THE ClearFiltersLink SHALL use `text-brand` or equivalent Onyx_Palette accent colour to indicate interactivity.
3. WHEN the user hovers over the ClearFiltersLink, THE ClearFiltersLink SHALL provide a visible hover state (e.g. opacity change or colour shift) without adding an underline.
