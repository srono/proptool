# Implementation Plan: Pipeline List View

## Overview

This plan implements a toggleable list view for the Pipeline page, complementing the existing Kanban board. The implementation follows the established `ListingsClientShell` pattern: a client shell component orchestrates view mode, filtering, sorting, and conditional rendering. All filtering and sorting is client-side using data already fetched by the server component.

## Tasks

- [x] 1. Create utility functions and hooks
  - [x] 1.1 Create lead field formatting utilities
    - Create `apps/web/src/components/pipeline/utils/format-lead-fields.ts`
    - Implement `formatRelativeActivity(dateStr: string | null): string` — returns "Today" for 0 days elapsed, "{n}d ago" otherwise, "—" for null
    - Implement `formatCreatedDate(dateStr: string): string` — returns DD MMM YYYY format
    - Implement `formatSourceLabel(source: string): string` — maps source key to LEAD_SOURCES display label
    - Implement `formatDealTypeLabel(dealType: string): string` — maps deal_type key to display label
    - _Requirements: 1.5, 1.10, 1.11, 1.4_

  - [x] 1.2 Write property tests for formatting utilities
    - **Property 1: Label mapping round-trip**
    - **Property 2: Relative activity date formatting**
    - **Property 3: Created date formatting**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.10, 1.11**

  - [x] 1.3 Create `usePipelineViewMode` hook
    - Create `apps/web/src/components/pipeline/hooks/use-pipeline-view-mode.ts`
    - Read from localStorage key `pipeline-view-mode` on mount
    - Validate stored value is `'board'` or `'list'`; fall back to `'board'` on invalid/missing/error
    - Overwrite invalid values with `'board'`
    - Expose `viewMode` and `setViewMode`
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 1.4 Write property test for view mode persistence
    - **Property 7: View mode localStorage persistence**
    - **Validates: Requirements 2.6, 2.8**

  - [x] 1.5 Create `usePipelineFilter` hook
    - Create `apps/web/src/components/pipeline/hooks/use-pipeline-filter.ts`
    - Manage filter state: search (debounced 300ms, min 2 chars), stages (multi-select), urgency, dealType, source
    - Implement AND logic across all active filters
    - Implement sort state with default `last_activity` descending
    - Implement sort toggle: click column → ascending; click same → descending; click different → ascending on new
    - Null values sort to end regardless of direction; tie-break by `created_at` descending
    - Custom comparators for urgency (hot=3 > warm=2 > cold=1) and stage (by PIPELINE_STAGES order)
    - Expose `filteredLeads`, `sortedLeads`, `totalCount`, filter setters, `clearAllFilters`, `sort`, `toggleSort`
    - _Requirements: 3.1–3.9, 4.1–4.16_

  - [x] 1.6 Write property tests for filter and sort logic
    - **Property 4: Sort correctness**
    - **Property 5: Filter correctness with AND logic**
    - **Property 6: Filtered count accuracy**
    - **Property 8: Filter preservation across view toggle**
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.8, 3.9, 4.1–4.3, 4.5, 4.7, 4.9, 4.11, 4.12, 4.13, 2.4, 4.17**

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Build UI components
  - [x] 3.1 Create `PipelineViewToggle` component
    - Create `apps/web/src/components/pipeline/pipeline-view-toggle.tsx`
    - Render two icon buttons: LayoutGrid (board) and LayoutList (list) from lucide-react
    - Active mode: `bg-aqua text-onyx`; inactive: `text-gray-2 hover:text-white`
    - Accept `viewMode`, `onToggle`, and optional `disabled` props
    - _Requirements: 2.1_

  - [x] 3.2 Create `PipelineFilterBar` component
    - Create `apps/web/src/components/pipeline/pipeline-filter-bar.tsx`
    - Text search input with magnifying glass icon (controlled, debounce handled by hook)
    - Stage multi-select dropdown (checkboxes for each visible stage)
    - Urgency single-select dropdown (Hot, Warm, Cold)
    - Deal type single-select dropdown (Sale, Resale, Rental, Landlord Rep, Tenant Rep)
    - Source single-select dropdown (from LEAD_SOURCES)
    - "Clear all filters" button
    - Count display: "Showing {filtered} of {total} leads"
    - _Requirements: 4.1, 4.4, 4.6, 4.8, 4.10, 4.13, 4.15_

  - [x] 3.3 Create `PipelineListView` component
    - Create `apps/web/src/components/pipeline/pipeline-list-view.tsx`
    - Render a `<table>` with sortable column headers and sort indicator arrows
    - Columns: Contact Name, Phone, Deal Type, Urgency, Stage, Source, Intent Score, Last Activity, Created Date
    - Use formatting utilities for field display
    - Urgency badge: color-coded (hot: red, warm: amber, cold: blue)
    - Intent score: color-coded (4–5: green, 2–3: amber, 1: red), "—" for null
    - Contact null: "Unknown" name, "—" phone
    - Last activity null: "—"
    - Contact Name truncated with ellipsis at 200px max-width
    - Responsive column visibility: all columns at ≥1024px; Contact Name, Deal Type, Urgency, Stage, Last Activity at 768–1023px
    - Horizontal scroll when content overflows at tablet breakpoint
    - _Requirements: 1.1–1.12, 3.1, 3.6, 6.1, 6.2, 6.4_

  - [x] 3.4 Implement row interaction and indicators
    - Each row is a clickable element navigating to `/leads/{id}` on click
    - Pointer cursor, `role="link"`, `tabIndex={0}`, handles Enter/Space for keyboard navigation
    - Hover state: `hover:bg-brand/[0.06]`
    - Hot indicator: aqua dot (1.5×1.5px rounded circle with glow) + "HOT" label when urgency=hot or intent_score≥4
    - Eligibility risk badge: "ELIG WATCH" chip (red text, red border 40% opacity, red bg 10% opacity) when eligibility_risk=true
    - _Requirements: 5.1–5.6, 5.4, 5.5_

  - [x] 3.5 Write property test for hot indicator and eligibility badge conditions
    - **Property 9: Hot indicator and eligibility badge conditions**
    - **Validates: Requirements 5.4, 5.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate into Pipeline page
  - [x] 5.1 Create `PipelineClientShell` component
    - Create `apps/web/src/components/pipeline/pipeline-client-shell.tsx`
    - Use `usePipelineViewMode`, `usePipelineFilter`, and `useBreakpoint` hooks
    - Render `PipelineViewToggle` (hidden on mobile <768px)
    - Render `PipelineFilterBar` (shared across both views)
    - Conditionally render `PipelineBoard` (with filtered leads) or `PipelineListView` (with sorted leads)
    - Force Board_View on mobile regardless of stored preference (without overwriting localStorage)
    - Reset sort state when toggling from list to board
    - _Requirements: 2.2–2.5, 6.3, 6.5–6.7, 4.17_

  - [x] 5.2 Update Pipeline page to use `PipelineClientShell`
    - Modify `apps/web/src/app/(dashboard)/pipeline/page.tsx`
    - Replace direct `PipelineBoard` rendering with `PipelineClientShell`
    - Pass `leads` and `stages` props to the client shell
    - Remove placeholder "Filters" and "List view" buttons from page header
    - _Requirements: 2.1–2.3_

  - [x] 5.3 Implement empty states
    - When no leads exist at all: show prompt with link to `/leads/new`
    - When filters produce zero results: show message + "Clear all filters" button
    - _Requirements: 1.13, 1.14, 4.16_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Unit and integration tests
  - [x] 7.1 Write unit tests for PipelineListView component
    - Test null contact renders "Unknown" / "—"
    - Test null intent_score renders "—"
    - Test null last_activity_at renders "—"
    - Test empty state when no leads exist
    - Test empty state when filters produce zero results
    - Test view toggle renders with correct active state
    - Test default sort is last_activity descending
    - Test sort indicator only on active column
    - Test row click navigates to `/leads/{id}`
    - Test keyboard activation (Enter/Space) navigates
    - Test responsive column visibility at each breakpoint
    - Test view toggle hidden on mobile
    - Test clear all filters resets all state
    - _Requirements: 1.7–1.9, 1.13, 1.14, 2.1, 3.7, 5.1, 5.6, 6.1, 6.2, 6.6_

  - [x] 7.2 Write integration tests for view mode and filter persistence
    - Test board view receives same filtered leads as list view
    - Test view mode persists across simulated page navigation (localStorage)
    - Test breakpoint transitions update layout without reload
    - _Requirements: 2.4, 2.6, 4.17, 6.5, 6.7_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript, React, Tailwind CSS, and follows existing project patterns (ListingsClientShell, useBreakpoint, etc.)
- All filtering and sorting is client-side — no additional Supabase queries needed
- The existing `PipelineBoard` component interface remains unchanged; it receives filtered leads from the shell

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3"] },
    { "id": 4, "tasks": ["3.4", "3.5"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3"] },
    { "id": 7, "tasks": ["7.1", "7.2"] }
  ]
}
```
