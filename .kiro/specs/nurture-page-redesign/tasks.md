# Implementation Plan: Nurture Page Redesign

## Overview

This plan transforms the existing nurture page from a flat task list into a comprehensive outreach management dashboard. The implementation proceeds in layers: data model and utilities first, then custom hooks, then UI components (bottom-up from atomic to composite), and finally page-level wiring and integration. The sidebar redesign is handled as a parallel track since it lives in the shared dashboard layout.

## Tasks

- [x] 1. Extend data model and create utility functions
  - [x] 1.1 Extend NurtureTaskRow type to EnrichedNurtureTask
    - Add new fields to `apps/web/src/lib/nurture/types.ts`: `contact_phone`, `owned_property_label`, `owned_property_town`, `owned_property_type`, `owned_property_flat_type`, `mop_date`, `playbook_steps` (array of `PlaybookStepStatus`)
    - Add `PlaybookStepStatus` interface with `step_number`, `title`, `channel`, `status`
    - Add `FilterState` interface with `activePill`, `playbookFilter`, `consentFilter`, `myTasksOnly`, `groupBy`
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 1.2 Create urgency utility module
    - Create `apps/web/src/lib/nurture/urgency.ts` with functions: `classifyUrgency`, `computeStatsCounts`, `formatRelativeActivity`, `formatSingaporePhone`, `getContactInitials`, `groupTasksByUrgency`, `groupTasksByPlaybook`, `filterTasks`
    - `classifyUrgency(dueAt: string)` — classify as overdue/today/upcoming using Asia/Singapore timezone
    - `computeStatsCounts(tasks)` — count pending tasks by urgency category
    - `formatRelativeActivity(dateStr)` — return "Xh ago", "Xd ago", or short date
    - `formatSingaporePhone(phone)` — format as "+65 XXXX XXXX" or return "–"
    - `getContactInitials(name)` — extract max 2 uppercase chars from name
    - `groupTasksByUrgency(tasks)` — group non-snoozed tasks by urgency, sorted by due_at ascending
    - `groupTasksByPlaybook(tasks)` — group by playbook name alphabetically, sorted by due_at ascending within
    - `filterTasks(tasks, filters)` — apply AND logic for all active filters
    - _Requirements: 2.2, 2.3, 2.4, 3.10, 4.2, 4.3, 5.2, 5.3, 9.2, 9.3, 9.4_

  - [x] 1.3 Write property tests for urgency utilities
    - Create `apps/web/src/lib/nurture/__tests__/urgency.property.test.ts`
    - **Property 1: Stats computation partitions all pending tasks into urgency categories**
    - **Property 3: Urgency grouping places tasks correctly and maintains sort order**
    - **Property 4: Playbook grouping produces alphabetically sorted sections with internal sort**
    - **Property 5: Contact initials extraction**
    - **Property 6: Relative time formatting follows format rules**
    - **Property 8: Singapore phone number formatting**
    - **Validates: Requirements 2.2, 2.3, 2.4, 4.2, 4.3, 4.5, 4.8, 5.2, 5.3, 9.2, 9.3, 9.4**

  - [x] 1.4 Write property tests for filter logic
    - Create `apps/web/src/lib/nurture/__tests__/filters.property.test.ts`
    - **Property 2: Filter AND logic produces correct subset**
    - **Validates: Requirements 3.10, 3.11**

- [x] 2. Create custom hooks
  - [x] 2.1 Implement useNurtureFilters hook
    - Create `apps/web/src/hooks/use-nurture-filters.ts`
    - Manage filter state: `activePill`, `playbookFilter`, `consentFilter`, `myTasksOnly`, `groupBy`
    - Expose setters for each filter and a `clearFilters` method that resets all to defaults
    - _Requirements: 3.1, 3.6, 3.7, 3.8, 3.10, 3.11, 4.1_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement atomic UI components
  - [x] 4.1 Create PageHeader component
    - Create `apps/web/src/components/nurture/page-header.tsx`
    - Render title "Nurture" (Figtree 26px bold white), subtitle (Inter 13px gray-2)
    - Render "Playbooks" ghost button and "+ New Playbook" primary button (aqua bg, onyx text)
    - Wire navigation to playbooks management and new playbook creation pages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Create StatsStrip component
    - Create `apps/web/src/components/nurture/stats-strip.tsx`
    - Render three clickable stat tiles: Overdue (red), Due Today (amber), Upcoming (gray)
    - Accept `overdueCount`, `todayCount`, `upcomingCount`, `activeFilter`, `onFilterChange` props
    - Clicking active tile deactivates filter; clicking inactive tile activates it
    - Display "999+" for counts exceeding 999
    - _Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 4.3 Create FilterBar component
    - Create `apps/web/src/components/nurture/filter-bar.tsx`
    - Render pill tabs: All, Overdue, Today, Upcoming, Snoozed (one active at a time)
    - Style active pills with urgency colors (red/amber/gray); inactive with transparent bg + onyx-line border
    - Render Playbook dropdown, Consent dropdown, My Tasks toggle, task count label
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.12_

  - [x] 4.4 Create TaskGroup component
    - Create `apps/web/src/components/nurture/task-group.tsx`
    - Render collapsible section with header: group name (bold) + count in parentheses
    - Default expanded; hidden when count is 0
    - Click header to collapse/expand
    - _Requirements: 4.1, 4.4, 4.5, 4.7_

  - [x] 4.5 Redesign TaskRow component
    - Rewrite `apps/web/src/components/nurture/nurture-task-row.tsx` to match new layout
    - Add urgency color bar (4px left strip: red/amber/gray)
    - Add contact avatar (32px circular badge with initials)
    - Render contact info: name, formatted phone, property summary (type · town)
    - Render action details: channel icon, channel label, action title, last activity (relative time)
    - Render due date badge with urgency-colored background
    - Render consent chip with colored segments
    - Render action buttons: primary channel, snooze, mark-done
    - Disable primary channel + mark-done buttons for red consent (40% opacity, not-allowed cursor)
    - Truncate overflow text with ellipsis + tooltip
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 4.6 Write unit tests for TaskRow component
    - Create `apps/web/src/components/nurture/__tests__/nurture-task-row.test.tsx`
    - Test urgency color bar rendering for each urgency level
    - Test consent-disabled states (red badge disables buttons)
    - Test text truncation classes applied
    - _Requirements: 5.1, 5.7, 5.9_

- [x] 5. Implement panel components
  - [x] 5.1 Enhance DetailPanel component
    - Rewrite `apps/web/src/components/nurture/detail-panel.tsx` to match new design
    - Contact header: avatar (initials badge), full name, consent chip
    - Quick Actions: WhatsApp button (navigate to message thread), Call button (tel: deep-link)
    - Contact Info section: phone, email (dash if missing)
    - Owned Property section: type, label, town, flat type, MOP date (hidden if no data)
    - Consent section: opt-in status, dates, source, purpose, expiry
    - Playbook Progress: vertical timeline with done/pending/upcoming step statuses
    - "+ Create Ad-Hoc Task" button at bottom
    - 300ms slide-in/out transition
    - Disable quick actions for red consent
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_

  - [x] 5.2 Write unit tests for DetailPanel
    - Create `apps/web/src/components/nurture/__tests__/detail-panel.test.tsx`
    - Test all sections render with valid data
    - Test conditional hiding (no property, no playbook, no email)
    - Test disabled quick actions for red consent
    - Test slide transition classes
    - _Requirements: 6.1, 6.10, 6.11, 6.12, 6.13_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Redesign sidebar
  - [x] 7.1 Refactor Sidebar component
    - Rewrite `apps/web/src/components/layout/sidebar.tsx` with grouped navigation
    - Define `NAV_GROUPS` data structure with Daily, Clients, Properties, Tools sections
    - Render 15px SVG stroke icons with opacity states (45% default, 75% hover, 100% active with aqua)
    - Use 10px border-radius for nav items
    - Uppercase section labels: 10px, font-weight 700, letter-spacing 0.09em, gray-1
    - Group separators: 1px border-top onyx-line, 2px margin-top, 8px padding-top
    - Active state: brand-blue tinted bg, brand-blue border, white text
    - Badge styling: onyx-raised bg + gray-2 text (default), aqua-tinted bg + aqua text (active)
    - Footer: user avatar, name, CEA number, settings gear icon button
    - Fixed width 232px, onyx background, 1px right border onyx-line
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [x] 7.2 Write unit tests for Sidebar
    - Create `apps/web/src/components/layout/__tests__/sidebar.test.tsx`
    - Test grouped navigation renders all sections
    - Test active state styling
    - Test badge count rendering
    - Test footer with settings gear
    - _Requirements: 11.1, 11.5, 11.6, 11.8_

- [x] 8. Wire page together with state management and actions
  - [x] 8.1 Rewrite NurturePage with new component composition
    - Rewrite `apps/web/src/app/(dashboard)/nurture/page.tsx`
    - Integrate `useNurtureFilters` hook
    - Compose: PageHeader → StatsStrip → FilterBar → TaskGroup(s) → TaskRow(s) → DetailPanel
    - Compute urgency counts from tasks using `computeStatsCounts`
    - Apply filters using `filterTasks` utility
    - Group tasks using `groupTasksByUrgency` or `groupTasksByPlaybook` based on filter state
    - Wire StatsStrip tile clicks to FilterBar pill tab activation
    - Wire TaskRow clicks to DetailPanel open
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.6_

  - [x] 8.2 Implement task actions (WhatsApp, Call, Snooze, Mark Done)
    - Wire WhatsApp button to navigate to `/messages/{contact_id}?nurture_task={task_id}`
    - Wire Call button to `tel:` deep-link with formatted phone number
    - Wire Snooze button to snooze dialog → PATCH task status to "snoozed" with new due date
    - Wire Mark Done button to PATCH task status to "done" with fade-out transition
    - Implement consent warning dialog for yellow consent (confirm/cancel before action)
    - Disable WhatsApp, Call, Mark Done for red consent
    - Update stats and task list on successful action without page reload
    - Handle action failures with inline error on affected TaskRow
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x] 8.3 Implement empty, loading, and error states
    - Loading state: centered spinner with "Loading tasks…" label
    - Empty state (no filters): icon, "No nurture tasks yet" heading, subtitle, "+ Create Playbook" button
    - Filtered empty state: "No tasks match your filters" message, "Clear Filters" button
    - Error state: error message, "Retry" button that re-triggers fetch
    - Persistent error (3 consecutive failures): message suggesting try again later, Retry remains available
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 9. Design system compliance pass
  - [x] 9.1 Apply design system tokens and accessibility
    - Audit all new components for design system compliance
    - Ensure onyx (#0F0F0F) page bg, onyx-card (#1A1A1A) card surfaces
    - Ensure brand blue (#2859F7) for primary interactive, aqua (#8EFEFF) for accents
    - Ensure Figtree for headings, Inter for body text
    - Ensure 14px border-radius for pills/badges/buttons, 16px for cards/panels
    - Ensure onyx-line (#2A2A2A) for borders and dividers
    - Ensure consistent status colors (red/amber/green)
    - Add focus-visible indicators: 2px solid brand blue outline, 2px offset
    - Verify color contrast ratios (4.5:1 for small text, 3:1 for large text)
    - Add 150ms hover transitions on interactive elements
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 10. Fix nurture tasks API to return enriched contact fields
  - [x] 10.1 Update API route to select and map enriched contact fields
    - File: `apps/web/src/app/api/nurture/tasks/route.ts`
    - Add `phone`, `owned_property_flat_type`, `mop_date`, `segment_tags`, `email` to the Supabase `contacts!inner(...)` select clause
    - Add `last_activity_date` (from `contacts.last_contacted_at` or similar) to the select
    - In the response mapping, populate the `EnrichedNurtureTask` extension fields:
      - `contact_phone: contact.phone ?? null`
      - `owned_property_label: contact.owned_property_label ?? null`
      - `owned_property_town: contact.owned_property_town ?? null`
      - `owned_property_type: contact.owned_property_type ?? 'none'`
      - `owned_property_flat_type: contact.owned_property_flat_type ?? null`
      - `mop_date: contact.mop_date ?? null`
      - `segment_tags: []` (or fetch from a segments join if available)
      - `last_activity_date: contact.last_contacted_at ?? null`
      - `playbook_steps: null` (or fetch from playbook_steps join if available)
    - Also populate `next_action_title` from the playbook step title (join `playbook_steps` by `step_id` if available)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 5.2, 5.3, 6.4, 6.5_
    - **Root cause**: The API currently selects `owned_property_type`, `owned_property_label`, `owned_property_town` from contacts but only uses them to build a summary string. It does NOT select `phone`, `owned_property_flat_type`, or `mop_date`, and does NOT map any of these fields to the response object as individual properties.

- [ ] 11. Implement contact subgrouping within task list sections
  - [ ] 11.1 Create groupTasksByContact utility function
    - File: `apps/web/src/lib/nurture/urgency.ts`
    - Add `groupTasksByContact(tasks: EnrichedNurtureTask[]): Map<string, EnrichedNurtureTask[]>` function
    - Groups tasks by `contact_id`, preserving the original sort order within each contact group
    - _Requirements: 4.9_

  - [ ] 11.2 Create ContactTaskGroup component
    - File: `apps/web/src/components/nurture/contact-task-group.tsx`
    - **Single task per contact**: Render as a single combined row (contact info + task details in one row) — same as current TaskRow layout
    - **Multiple tasks per contact**: Render a contact header row showing avatar, name, phone, property summary, consent chip, and a task count badge. Below it, render compact sub-rows showing each task's action title, channel icon, due date badge, playbook name, and action buttons (primary channel, snooze, mark done)
    - Sub-rows are indented with left padding to visually nest under the contact header
    - Clicking the contact header row opens the Detail Panel for that contact
    - _Requirements: 4.9, 4.10, 4.11_

  - [ ] 11.3 Wire ContactTaskGroup into NurturePage
    - File: `apps/web/src/app/(dashboard)/nurture/page.tsx`
    - Within each TaskGroup section, call `groupTasksByContact` on the group's tasks
    - For each contact group, render a `ContactTaskGroup` component instead of individual `NurtureTaskRowComponent` rows
    - Pass all action handlers (onOpenWhatsApp, onCall, onSnooze, onMarkDone, onRowClick) through
    - _Requirements: 4.9, 4.10, 4.11_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The sidebar redesign (task 7) is independent of the nurture page components and can be developed in parallel
- The existing `NurtureTaskRow` type in `types.ts` is extended (not replaced) to maintain backward compatibility with other consumers
- The hooks directory (`apps/web/src/hooks/`) does not exist yet and will be created during task 2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "7.1"] },
    { "id": 2, "tasks": ["1.3", "1.4", "4.1", "4.2", "4.3", "4.4", "7.2"] },
    { "id": 3, "tasks": ["4.5", "5.1"] },
    { "id": 4, "tasks": ["4.6", "5.2"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["10.1"] },
    { "id": 9, "tasks": ["11.1"] },
    { "id": 10, "tasks": ["11.2"] },
    { "id": 11, "tasks": ["11.3"] }
  ]
}
```
