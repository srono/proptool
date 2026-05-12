# Design Document — UI/UX Consistency Fixes

## Architecture Overview

This feature applies 14 targeted fixes to enforce design-system consistency across the PropTool web application. The changes span three categories:

1. **Token corrections** — Replacing hardcoded values or incorrect tokens with the canonical Onyx_Palette and design-system tokens
2. **New shared components** — Introducing `PageHeader` and `PillTabs` as reusable UI primitives in `components/ui/`
3. **Component rewrites** — Full dark-theme rewrite of `AreaInsightCard` and structural changes to `BuyerFitPanel` and `PipelineDropHint`

All changes are scoped to `apps/web/src/` and touch only presentational layers (Tailwind classes, CSS variables, component markup). No data models, API routes, or business logic are affected.

---

## Components

### 1. Design Token Additions

**File: `tailwind.config.ts`**

```typescript
// Add to theme.extend.letterSpacing
letterSpacing: {
  label: '0.05em',
}
```

**File: `globals.css`**

```css
:root {
  /* existing vars... */
  --status-red: #FF5A5A;
  --sparkline-positive: var(--aqua);
  --sparkline-negative: var(--status-red);
}
```

These additions provide the `tracking-label` utility and CSS custom properties for sparkline colours, enabling theme-aware colour references.

---

### 2. AreaInsightCard Dark Rewrite [C1]

**File:** `components/insights/area-insight-card.tsx`

Full replacement of all light-theme classes with Onyx_Palette equivalents:

| Current (light) | Replacement (dark) |
|---|---|
| `bg-white` | `bg-onyx-card` |
| `border-gray-200` | `border-onyx-line` |
| `text-gray-900` | `text-white` |
| `text-gray-700` | `text-gray-3` |
| `text-gray-600` | `text-gray-2` |
| `text-gray-500` | `text-gray-2` |
| `text-gray-400` | `text-gray-2` |
| `hover:bg-gray-50` | `hover:bg-onyx-raised` |
| `bg-blue-50` | `bg-brand/10` |
| `text-blue-800` | `text-brand` |
| `text-blue-700` | `text-brand/80` |
| `border-gray-100` | `border-onyx-line` |
| `border-gray-50` | `border-onyx-line` |
| `bg-brand-600` | `bg-brand` |
| `hover:bg-brand-700` | `hover:bg-brand-deep` |
| `text-brand-600` | `text-brand` |
| `text-brand-500` | `text-aqua` |
| `text-amber-700` | `text-status-amber` |

The component structure and logic remain unchanged — only className strings are modified.

---

### 3. Form Control Radius [C2]

**Scope:** All `<input>`, `<select>`, `<textarea>` elements across the app.

Current state: Most form controls already use `rounded-xl` (verified in `settings-tabs.tsx`, `pipeline-filter-bar.tsx`). The fix targets any remaining instances using `rounded-lg` or `rounded-md` on form elements.

**Approach:** Search-and-replace audit of all form control className attributes. No new component needed — this is a class-level correction.

---

### 4. Brand Accent Correction [C3]

**File:** `components/settings/settings-tabs.tsx` (NotificationsTab toggle buttons)

```typescript
// Before
prefs[item.key] ? 'bg-brand-600' : 'bg-onyx-raised'

// After
prefs[item.key] ? 'bg-brand' : 'bg-onyx-raised'
```

Single token replacement in the toggle switch conditional class.

---

### 5. PageHeader Component [H1]

**File:** `components/ui/page-header.tsx` (new)

```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
}

export function PageHeader({ breadcrumbs, title }: PageHeaderProps) {
  return (
    <div className="space-y-1">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-gray-2">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-1">/</span>}
              {isLast || !crumb.href ? (
                <span className="text-gray-2">{crumb.label}</span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-gray-2 hover:text-white transition-colors"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          );
        })}
      </nav>
      <h1 className="text-lg font-display font-bold text-white">{title}</h1>
    </div>
  );
}
```

**Integration:** Import and render at the top of each dashboard page that currently lacks a structured header (listings, contacts, deals, settings, etc.).

---

### 6. ListingCard Minimum Text Size [H2]

**File:** `components/listings/listings-card-grid.tsx`

Replace all `text-[9px]` occurrences with `text-[11px]`:

```typescript
// Before
<p className="text-[9px] text-gray-2 mt-0.5">

// After
<p className="text-[11px] text-gray-2 mt-0.5">
```

---

### 7. MobileNav Active Pill + Text Size [H3]

**File:** `components/layout/mobile-nav.tsx`

Changes:
1. Add `bg-brand` pill background to active item (wrap label in a pill container)
2. Replace `text-[10px]` with `text-[11px]`

```typescript
// Active item rendering — after
<span
  className={cn(
    'px-2.5 py-1 rounded-pill text-[11px] font-semibold transition-colors',
    isActive ? 'bg-brand text-white' : 'text-gray-2'
  )}
>
  {item.label}
</span>
```

The dot indicator above the label is removed in favour of the pill background as the active state indicator.

---

### 8. Chat Back Button Radius [H4]

**File:** `components/messages/chat-thread.tsx`

```typescript
// Before
className="lg:hidden p-1 -ml-1 rounded-md hover:bg-onyx-card text-gray-2"

// After
className="lg:hidden p-1 -ml-1 rounded-xl hover:bg-onyx-card text-gray-2"
```

---

### 9. TheBrief Panel Radius [M1]

**File:** `components/dashboard/the-brief.tsx`

```typescript
// Before
<div className="relative rounded-3xl p-7 overflow-hidden ...">

// After
<div className="relative rounded-2xl p-7 overflow-hidden ...">
```

---

### 10. BuyerFitPanel Coloured Dots [M2]

**File:** `components/insights/buyer-fit-panel.tsx`

Replace text character indicators with dot elements:

```typescript
// Before (fit signals)
<span className="shrink-0 mt-0.5">✓</span>

// After (fit signals)
<span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-status-green" />

// Before (watchouts)
<span className="shrink-0 mt-0.5">!</span>

// After (watchouts)
<span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-status-amber" />
```

---

### 11. Pipeline Drop Hint [M3]

**File:** `components/pipeline/pipeline-board.tsx`

Replace the current dashed-border drop hint with an always-visible solid-border element that highlights on drag-over:

```typescript
// Before
<div className="border border-dashed border-onyx-line rounded-[14px] p-3 text-center text-gray-2 text-[11px]">
  + drag here
</div>

// After — pass isDragging state to control highlight
<div
  className={cn(
    'border border-onyx-line rounded-[14px] p-3 text-center text-[11px] transition-colors',
    activeId !== null
      ? 'border-brand/60 bg-brand/5 text-brand'
      : 'border-onyx-line/50 text-gray-2/60'
  )}
>
  Drop here
</div>
```

Key changes:
- `border-dashed` → `border` (solid by default)
- Always visible in subdued state (`border-onyx-line/50 text-gray-2/60`)
- Highlights when any card is being dragged (`border-brand/60 bg-brand/5`)

---

### 12. PillTabs Component [M4]

**File:** `components/ui/pill-tabs.tsx` (new)

```typescript
interface Tab {
  label: string;
  value: string;
}

interface PillTabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillTabs({ tabs, value, onChange, className }: PillTabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 bg-onyx-card border border-onyx-line rounded-pill p-1',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
            tab.value === value
              ? 'bg-brand text-white'
              : 'text-gray-2 hover:text-white'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

**Integration:** Replace the existing tab switcher in `listings-client-shell.tsx` (and `settings-tabs.tsx` tab navigation) with `<PillTabs>`.

---

### 13. Section Label Tracking [M5]

**Scope:** All uppercase section labels across the app.

Current state: Labels use various tracking values (`tracking-wide`, `tracking-wider`, `tracking-[1.5px]`). The fix standardises all to `tracking-label` (which maps to `0.05em` via the new tailwind config entry).

**Approach:** After adding `letterSpacing.label` to tailwind config, search-and-replace all section label tracking classes with `tracking-label`.

---

### 14. Sparkline CSS Variables [L1]

**File:** `components/dashboard/kpi-strip.tsx`

```typescript
// Before
stroke={warn ? '#FF5A5A' : '#8EFEFF'}

// After
stroke={warn ? 'var(--sparkline-negative)' : 'var(--sparkline-positive)'}
```

---

### 15. Clear Filters Link Style [L2]

**Files:** `components/pipeline/pipeline-filter-bar.tsx`, `components/listings/listings-client-shell.tsx`

```typescript
// Before (pipeline-filter-bar.tsx)
className="text-sm text-gray-2 hover:text-white transition-colors underline underline-offset-2"

// After
className="text-sm text-brand hover:text-brand/70 transition-colors"

// Before (listings-client-shell.tsx)
className="mt-4 text-sm text-aqua hover:text-white transition-colors underline underline-offset-2"

// After
className="mt-4 text-sm text-brand hover:text-brand/70 transition-colors"
```

---

## Data Models

No data model changes. All fixes are purely presentational.

---

## Interfaces

### New Component APIs

```typescript
// PageHeader
interface BreadcrumbItem {
  label: string;
  href?: string;
}
interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
}

// PillTabs
interface Tab {
  label: string;
  value: string;
}
interface PillTabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}
```

---

## Error Handling

No new error states are introduced. All changes are visual/presentational. Components retain their existing error handling and loading states.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: AreaInsightCard dark-theme exclusivity

*For any* valid `AreaInsightCard` props (with or without insights data), the rendered HTML output SHALL contain no light-theme CSS classes — specifically no `bg-white`, `bg-gray-50`, `bg-gray-100`, `bg-blue-50`, `text-gray-900`, `text-gray-700`, `text-gray-600`, `text-gray-500`, `border-gray-100`, `border-gray-200`, or `border-gray-50`.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: PageHeader breadcrumb link correctness

*For any* breadcrumbs array with length ≥ 1, the PageHeader SHALL render all non-last items with an href as navigable `<a>` elements, and SHALL render the last item as plain non-interactive text (not wrapped in an anchor element).

**Validates: Requirements 4.3, 4.4**

### Property 3: ListingCard minimum font size

*For any* valid listing data, the rendered `ListingsCardGrid` output SHALL NOT contain `text-[9px]`, `text-[10px]`, or any Tailwind arbitrary font-size class with a value below 11px.

**Validates: Requirements 5.1, 5.2**

### Property 4: MobileNav active state and minimum font size

*For any* pathname that matches a navigation item, the MobileNav SHALL render that item with `bg-brand` applied, and SHALL use `text-[11px]` or larger for all navigation labels (no `text-[10px]` or smaller).

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: BuyerFitPanel dot indicators

*For any* non-empty combination of `fitSignals` and `watchouts` arrays, the BuyerFitPanel SHALL render status indicators as `<span>` elements with `rounded-full` and appropriate status colour classes (`bg-status-green` for fit signals, `bg-status-amber` for watchouts), and SHALL NOT render the characters "✓" or "!" as indicator text content.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 6: PillTabs rendering correctness

*For any* valid tabs array and selected value, the PillTabs component SHALL render every tab with `rounded-pill` class, SHALL apply `bg-brand` exclusively to the tab whose value matches the selected value, and SHALL render all other tabs without `bg-brand`.

**Validates: Requirements 11.2, 11.3, 11.4**

### Property 7: Sparkline CSS variable usage

*For any* valid sparkline data array and warn flag, the rendered Sparkline SVG `stroke` attribute SHALL reference a CSS custom property (`var(--sparkline-positive)` or `var(--sparkline-negative)`) and SHALL NOT contain any inline hex colour literal (matching pattern `#[0-9A-Fa-f]{3,8}`).

**Validates: Requirements 13.1, 13.2**
