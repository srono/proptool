# Implementation Plan: Listings List View

## Overview

Transform the Listings page from a photo-centric card grid into a data-dense table/list view as the default display mode. Implementation follows a bottom-up approach: utility hooks first, then atomic components, then composition, then integration with the existing page. The existing card grid is preserved as a secondary toggle option.

## Tasks

- [x] 1. Set up testing infrastructure and utility hooks
  - [x] 1.1 Install Vitest, fast-check, and testing dependencies
    - Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `fast-check` to devDependencies
    - Create `vitest.config.ts` with jsdom environment and path aliases matching `tsconfig.json`
    - Add `"test": "vitest --run"` script to `package.json`
    - _Requirements: Testing infrastructure for all subsequent tasks_

  - [x] 1.2 Create `useBreakpoint` hook
    - Create `apps/web/src/components/listings/hooks/use-breakpoint.ts`
    - Implement `useBreakpoint()` returning `'mobile' | 'tablet' | 'desktop'` based on viewport width
    - Use `window.matchMedia` listeners for 768px and 1024px thresholds
    - Initialize with SSR-safe default (`'desktop'`) and hydrate on mount
    - Update within a single animation frame on resize
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 1.3 Create `useViewMode` hook
    - Create `apps/web/src/components/listings/hooks/use-view-mode.ts`
    - Implement `useViewMode()` returning `{ viewMode, setViewMode }`
    - Read from `localStorage` key `"listings-view-mode"`, default to `'list'`
    - Overwrite corrupted/invalid values with `'list'` on read
    - Handle `SecurityError` for private browsing (fall back to in-memory state)
    - Override stored preference to `'card'` when viewport < 768px (use `useBreakpoint`)
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 1.4 Create `useListingsFilter` hook with sorting and filtering logic
    - Create `apps/web/src/components/listings/hooks/use-listings-filter.ts`
    - Implement `FilterState`, `SortState`, and all filter/sort logic as per design
    - Implement `sortListings` function with null-last behavior
    - Implement `filterListings` function with AND composition
    - Implement `toggleSort` state machine (asc → desc → asc cycling, reset on new field)
    - Implement debounced search (300ms, min 2 chars) using `setTimeout`/`clearTimeout`
    - Export `useListingsFilter` hook returning `UseListingsFilterReturn` interface
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.2, 4.3, 4.5, 4.7, 4.9, 4.10, 4.12_

  - [x] 1.5 Create formatting utility functions
    - Create `apps/web/src/components/listings/utils/format-listing.ts`
    - Implement `formatPrice(listing)`: returns `"S$X"` for sale, `"S$X/mo"` for rental, `"—"` for null
    - Implement `formatPsf(listing)`: returns `"S$X psf"` for sale with area > 0, `"—"` otherwise
    - Implement `isExclusivityActive(listing)`: returns boolean based on `is_exclusive` and `exclusivity_expiry`
    - Handle all null/undefined edge cases with dash fallbacks
    - _Requirements: 1.5, 1.6, 1.9, 5.3, 5.4_

- [x] 2. Checkpoint - Ensure hooks and utilities compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement filter bar components
  - [x] 3.1 Create `SearchInput` component
    - Create `apps/web/src/components/listings/filter-bar/search-input.tsx`
    - Render text input with `lucide-react` Search icon
    - Accept `value` and `onChange` props
    - Style with dark theme (bg-onyx-card, border-onyx-line, text-white)
    - _Requirements: 4.2, 4.3_

  - [x] 3.2 Create `DistrictMultiSelect` component
    - Create `apps/web/src/components/listings/filter-bar/district-multi-select.tsx`
    - Render custom dropdown with checkboxes for D01–D28
    - Show selected count as badge when districts are selected
    - Accept `selected` and `onChange` props
    - _Requirements: 4.4, 4.5_

  - [x] 3.3 Create `PropertyTypeDropdown` and `StatusDropdown` components
    - Create `apps/web/src/components/listings/filter-bar/property-type-dropdown.tsx`
    - Create `apps/web/src/components/listings/filter-bar/status-dropdown.tsx`
    - PropertyTypeDropdown options: HDB, Condo, Landed, Commercial
    - StatusDropdown options: Draft, Live, Under Offer, Sold, Rented, Withdrawn
    - Style as single-select dropdowns matching dark theme
    - _Requirements: 4.6, 4.7, 4.8, 4.9_

  - [x] 3.4 Create `FilterBar` composite component
    - Create `apps/web/src/components/listings/filter-bar/filter-bar.tsx`
    - Compose SearchInput, DistrictMultiSelect, PropertyTypeDropdown, StatusDropdown
    - Accept `FilterBarProps` interface from design
    - Include "Clear all" button when any filter is active
    - _Requirements: 4.1, 4.10, 4.12_

- [x] 4. Implement view toggle and table components
  - [x] 4.1 Create `ViewToggle` component
    - Create `apps/web/src/components/listings/view-toggle.tsx`
    - Render two icon buttons (list icon / grid icon) using `lucide-react`
    - Highlight active mode in aqua, inactive in gray
    - Accept `viewMode`, `onToggle`, and optional `disabled` props
    - Disable on mobile breakpoint
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 Create `ListingRow` component
    - Create `apps/web/src/components/listings/listings-table/listing-row.tsx`
    - Render a `<tr>` with cells for each visible column
    - Display status as color-coded badge using existing `STATUS_STYLES` mapping
    - Display listing_type as text label ("Sale" / "Rental")
    - Display exclusivity badge when `isExclusivityActive` returns true
    - Truncate address with ellipsis (`truncate` class)
    - Apply hover state: `hover:border-brand/50` highlight
    - Render with pointer cursor, wrap in navigation to `/listings/{id}`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 5.1, 5.2, 5.3, 5.4_

  - [x] 4.3 Create `ListingsTable` component with sortable headers
    - Create `apps/web/src/components/listings/listings-table/listings-table.tsx`
    - Render `<table>` with sticky header row
    - Implement column visibility based on breakpoint (desktop: all 9, tablet: 7 columns)
    - Render sort indicator arrows on active sort column (up for asc, down for desc)
    - Make sortable column headers clickable, calling `onSort` with field name
    - Use `COLUMNS` configuration from design for column definitions
    - Enable horizontal scrolling on tablet when content overflows
    - _Requirements: 1.2, 3.1, 3.2, 3.3, 3.5, 3.6, 6.1, 6.2, 6.4_

- [x] 5. Compose the client shell and refactor page
  - [x] 5.1 Create `ListingsClientShell` client component
    - Create `apps/web/src/components/listings/listings-client-shell.tsx`
    - Mark as `'use client'`
    - Wire `useViewMode`, `useBreakpoint`, and `useListingsFilter` hooks
    - Render PageHeader with ViewToggle
    - Render FilterBar connected to filter state
    - Render FilterSummary showing "Showing X of Y listings"
    - Conditionally render ListingsTable (list mode + viewport ≥ 768px) or ListingsCardGrid (card mode or viewport < 768px)
    - Render empty state with "Clear all filters" when filtered results are empty
    - Render empty state with "Create new listing" link when no listings exist at all
    - _Requirements: 1.8, 2.1, 2.4, 4.11, 4.13, 6.3_

  - [x] 5.2 Extract existing card grid into `ListingsCardGrid` component
    - Create `apps/web/src/components/listings/listings-card-grid.tsx`
    - Move the existing card grid markup from `page.tsx` into this component
    - Accept `listings: Listing[]` prop
    - Preserve all existing card styling, photo display, badges, and link behavior
    - _Requirements: 2.2_

  - [x] 5.3 Refactor `page.tsx` to use `ListingsClientShell`
    - Keep `page.tsx` as server component for data fetching
    - Remove the inline card grid rendering
    - Pass `listings` array and `activeTab` to `ListingsClientShell`
    - Preserve existing tab links (URL param based)
    - Preserve existing header with "New listing" button
    - _Requirements: 1.1, 2.6_

- [x] 6. Checkpoint - Ensure build passes and manual verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Property-based tests
  - [ ]* 7.1 Write property test for sort ordering correctness
    - **Property 1: Sort ordering correctness**
    - Generate random listing arrays with varied field values using fast-check arbitraries
    - For each sortable field and direction, verify consecutive non-null values are in correct order
    - Verify default sort (no field) produces created_at descending order
    - **Validates: Requirements 1.2, 3.2, 3.3**

  - [ ]* 7.2 Write property test for null values sort to end
    - **Property 2: Null values sort to end**
    - Generate listings with random null/non-null values in sortable fields
    - Verify all null-valued items appear after all non-null items regardless of sort direction
    - **Validates: Requirements 3.8**

  - [ ]* 7.3 Write property test for sort state machine transitions
    - **Property 3: Sort state machine transitions**
    - Generate random sequences of `toggleSort` calls with random field names
    - Verify single click → asc, double click same field → desc, triple → asc
    - Verify clicking different field resets to asc for new field
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

  - [ ]* 7.4 Write property test for filter correctness with AND composition
    - **Property 4: Filter correctness with AND composition**
    - Generate random filter states and listing arrays
    - Verify every item in output satisfies ALL active predicates
    - Verify no item satisfying all predicates is excluded
    - **Validates: Requirements 4.3, 4.5, 4.7, 4.9, 4.10**

  - [ ]* 7.5 Write property test for price and PSF formatting
    - **Property 5: Price and PSF formatting correctness**
    - Generate random prices, rental amounts, and floor areas
    - Verify sale listings produce "S$X" format and "S$X psf" when area > 0
    - Verify rental listings produce "S$X/mo" and "—" for PSF
    - Verify null prices produce "—"
    - **Validates: Requirements 1.5, 1.6, 1.9**

  - [ ]* 7.6 Write property test for view mode localStorage round-trip
    - **Property 6: View mode localStorage round-trip**
    - Generate random valid ViewMode values, verify write then read returns same value
    - Generate random invalid strings, verify read returns 'list' and overwrites stored value
    - **Validates: Requirements 2.5, 2.7**

  - [ ]* 7.7 Write property test for exclusivity badge visibility
    - **Property 7: Exclusivity badge visibility**
    - Generate random combinations of `is_exclusive` (boolean) and `exclusivity_expiry` (null, past date, future date)
    - Verify badge shown if and only if `is_exclusive === true` AND expiry is non-null future date
    - **Validates: Requirements 5.3, 5.4**

- [ ] 8. Integration tests
  - [ ]* 8.1 Write integration tests for listings page
    - Test page load renders ListingsClientShell with fetched data
    - Test tab filtering via URL `?tab=sale` filters correctly
    - Test clicking a listing row navigates to `/listings/{id}`
    - Test responsive breakpoint transitions render correct view (table vs cards)
    - Test view toggle preserves filter state when switching views
    - _Requirements: 1.1, 2.4, 5.1, 6.3_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation uses TypeScript with React/Next.js patterns
- fast-check is the PBT library specified in the design document
- The existing card grid is preserved as-is, just extracted into its own component

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.5"] },
    { "id": 2, "tasks": ["1.3", "1.4"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["3.4", "4.2", "4.3"] },
    { "id": 5, "tasks": ["5.2", "5.1"] },
    { "id": 6, "tasks": ["5.3"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3", "7.5", "7.6", "7.7"] },
    { "id": 8, "tasks": ["7.4", "8.1"] }
  ]
}
```
