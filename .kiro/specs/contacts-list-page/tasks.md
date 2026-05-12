# Implementation Plan: Contacts List Page

## Overview

Implement a dedicated `/contacts` route in the PropTool CRM dashboard that displays a searchable, filterable list of contacts. The page follows the hybrid server/client pattern established by the Listings page — server-rendered initial data fetch with client-side filtering. Components include a server page component, a client shell managing filter state, contact cards with navigation, pure utility functions, and sidebar integration.

## Tasks

- [x] 1. Create core types and pure utility functions
  - [x] 1.1 Create the `ContactListItem` interface and utility functions
    - Create file `apps/web/src/components/contacts/contacts-types.ts` with `ContactListItem` interface (fields: `id`, `full_name`, `phone`, `contact_status`, `last_contacted_at`, `last_inbound_at`, `updated_at`) and `ContactStatus` type
    - Create file `apps/web/src/components/contacts/utils.ts` with:
      - `getLastActivityDate(lastContactedAt, lastInboundAt): Date | null` — returns the more recent of the two timestamps, or null if both null
      - `formatLastActivity(lastContactedAt, lastInboundAt): string` — returns formatted date string ("d Mon YYYY") or "—"
      - `filterBySearch(contacts, term): ContactListItem[]` — case-insensitive partial match on full_name or normalized phone digits
      - `filterByStatus(contacts, status): ContactListItem[]` — exact match on contact_status, pass-through for "all"
      - `filterContacts(contacts, searchTerm, statusFilter): ContactListItem[]` — combines both filters and caps at 50
    - Reuse existing `normalizePhone` from `@/lib/services/contact-service` for phone digit extraction
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.2, 4.2, 4.3, 4.5, 6.1_

  - [x] 1.2 Write property test: sort order preserved (Property 1)
    - **Property 1: Contacts are ordered by descending updated_at**
    - Verify that `filterContacts` preserves the input ordering (server provides pre-sorted data)
    - **Validates: Requirements 2.1**

  - [x] 1.3 Write property test: last activity computation (Property 2)
    - **Property 2: Last activity is the more recent of last_contacted_at and last_inbound_at**
    - For any pair of nullable date strings, `getLastActivityDate` returns the later one or null if both null
    - **Validates: Requirements 2.2, 2.3**

  - [x] 1.4 Write property test: display cap (Property 3)
    - **Property 3: Display is capped at 50 contacts**
    - For any input size, `filterContacts` output length never exceeds 50
    - **Validates: Requirements 2.5, 4.5**

  - [x] 1.5 Write property test: search correctness (Property 4)
    - **Property 4: Search results match the search term**
    - Every contact in `filterBySearch` output has full_name (case-insensitive) or normalized phone containing the search term
    - **Validates: Requirements 3.2**

  - [x] 1.6 Write property test: status filter correctness (Property 5)
    - **Property 5: Status filter returns only matching contacts**
    - Every contact in `filterByStatus` output has matching contact_status (or any status when "all")
    - **Validates: Requirements 4.2, 4.3**

  - [x] 1.7 Write property test: combined filter (Property 6)
    - **Property 6: Combined filter satisfies both constraints**
    - Every contact in `filterContacts` output satisfies both search and status predicates simultaneously
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [x] 2. Add Contacts link to sidebar navigation
  - [x] 2.1 Update sidebar `navItems` array to include Contacts entry
    - Add `{ href: '/contacts', label: 'Contacts', badgeKey: null }` to the `navItems` array in `apps/web/src/components/layout/sidebar.tsx`
    - Position after "Deals" and before "Insights" (the `{ href: '/tools', label: 'Insights' }` entry)
    - Active state is already handled by existing `pathname.startsWith(item.href)` logic
    - _Requirements: 1.3_

- [x] 3. Implement ContactCard component
  - [x] 3.1 Create the `ContactCard` component
    - Create file `apps/web/src/components/contacts/contact-card.tsx`
    - Render as a Next.js `<Link>` element with `href="/contacts/{contact.id}"`
    - Display: full name, phone number, status badge (colored pill using status color map), last activity date via `formatLastActivity`
    - Apply hover border highlight: `hover:border-brand/50 transition-colors`
    - Ensure accessible name derived from contact's `full_name` (aria-label on the Link)
    - Use status color mapping consistent with existing patterns (active=green, inactive=gray, archived=amber, do_not_contact=red)
    - _Requirements: 2.2, 2.3, 5.1, 5.2, 5.3_

  - [x] 3.2 Write property test: card links and accessible name (Property 7)
    - **Property 7: Contact cards link to correct profile with accessible name**
    - For any contact, rendered card links to `/contacts/{contact.id}` and has accessible name containing `full_name`
    - **Validates: Requirements 5.1, 5.2**

  - [x] 3.3 Write unit tests for ContactCard
    - Test that link href is `/contacts/{id}`
    - Test that "—" is displayed when both activity dates are null
    - Test hover border class is present
    - Test status badge renders with correct color class
    - **Validates: Requirements 5.1, 5.2, 5.3, 2.2, 2.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ContactsClientShell with search and status filtering
  - [x] 5.1 Create the `ContactsClientShell` client component
    - Create file `apps/web/src/components/contacts/contacts-client-shell.tsx`
    - Mark as `'use client'`
    - Accept `contacts: ContactListItem[]` prop
    - Manage state: `searchTerm` (string), `activeStatus` (string, default "all")
    - Render page header with title "Contacts" and subtitle (max 60 chars)
    - Render search input: controlled, `maxLength={100}`, with aria-label "Search contacts"
    - Render status filter tabs: All, Active, Inactive, Archived, Do Not Contact — styled as pill tabs matching existing pattern
    - Apply `filterContacts(contacts, searchTerm, activeStatus)` to compute displayed list
    - Render `ContactCard` for each filtered contact
    - Render distinct empty states: "No contacts yet" (zero contacts prop) vs "No contacts match your filters" (filters active, no results)
    - Keep search and filter controls visible even when results are empty
    - _Requirements: 1.2, 2.4, 3.1, 3.3, 3.4, 4.1, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.4_

  - [x] 5.2 Write unit tests for ContactsClientShell
    - Test search input has maxLength=100 and aria-label
    - Test status filter defaults to "All" on initial load
    - Test all 5 status tabs render
    - Test "No contacts yet" empty state when contacts array is empty
    - Test "No contacts match" state when filters produce no results
    - Test that search and filter controls remain visible in empty filter state
    - **Validates: Requirements 2.4, 3.1, 3.4, 4.1, 4.4, 7.2, 7.4**

- [x] 6. Create the server page component and wire everything together
  - [x] 6.1 Create the contacts list page server component
    - Create file `apps/web/src/app/(dashboard)/contacts/page.tsx`
    - Export metadata `{ title: 'Contacts' }`
    - Use `createClient()` from `@/lib/supabase/server` to fetch contacts
    - Select fields: `id, full_name, phone, contact_status, last_contacted_at, last_inbound_at, updated_at`
    - Order by `updated_at` descending, limit 50
    - Pass fetched contacts to `<ContactsClientShell />`
    - Let errors propagate to the existing dashboard `error.tsx` boundary
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.5, 7.1, 7.3_

  - [x] 6.2 Write integration tests for the contacts page
    - Test that page renders within dashboard layout
    - Test that sidebar "Contacts" link has correct href and active state on `/contacts`
    - Test that metadata title is "Contacts"
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–7)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation follows existing project patterns
- Authentication redirect (Req 1.4) is handled by existing dashboard layout middleware
- Error boundary (Req 7.3) is handled by existing `apps/web/src/app/(dashboard)/error.tsx`
- Loading state (Req 7.1) is handled by existing `apps/web/src/app/(dashboard)/loading.tsx`
- Mobile navigation (Req 1.1) is handled by existing dashboard layout — no changes to mobile-nav needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1"] },
    { "id": 4, "tasks": ["6.2"] }
  ]
}
```
