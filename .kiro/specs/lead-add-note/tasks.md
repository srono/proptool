# Implementation Plan: Lead Add Note

## Overview

This plan implements the note-taking capability on the lead detail page. The approach follows the design: a new `NoteDialog` client component triggered from `ActionButtons`, a new API route for persistence, and modifications to the `Timeline` and `LeadDetailPage` to support optimistic updates. Pure utility functions are extracted for testability and property-based testing.

## Tasks

- [x] 1. Create utility functions and types
  - [x] 1.1 Create note utility functions
    - Create `apps/web/src/app/(dashboard)/leads/[id]/note-utils.ts`
    - Implement `enforceCharLimit(input: string, max?: number): string` — truncates at 2000 Unicode code points
    - Implement `isNoteValid(input: string): boolean` — returns true if at least one non-whitespace character
    - Implement `trimNoteBody(input: string): string` — trims leading/trailing whitespace, preserves internal
    - Implement `formatTimelineLabel(type: string, direction: string): string` — returns "NOTE" for notes (no direction), "{TYPE} · {direction}" for others
    - Implement `sortTimelineItems(items: TimelineItem[]): TimelineItem[]` — sorts descending by timestamp
    - Export the `TimelineItem` interface from this file
    - _Requirements: 2.3, 2.4, 2.6, 3.1, 4.1, 4.4, 5.3, 5.4_

  - [x] 1.2 Write property tests for note utilities
    - Create `apps/web/src/app/(dashboard)/leads/[id]/__tests__/note-properties.test.ts`
    - **Property 1: Character Limit Enforcement** — For any Unicode string, output ≤ 2000 code points; identity for short strings; first-2000 for long strings
    - **Property 2: Whitespace-Only Validation** — Returns false for whitespace-only, true for strings with ≥1 non-whitespace char
    - **Property 3: Trim Preserves Internal Whitespace** — Trimmed result has no leading/trailing whitespace; internal chars unchanged
    - **Property 4: Note Timeline Rendering Format** — For type='note', label contains "NOTE" and no direction indicator
    - **Property 5: Timeline Chronological Sort** — Output sorted descending by timestamp regardless of input order
    - Use `fast-check` with `{ numRuns: 100 }` for each property
    - **Validates: Requirements 2.3, 2.4, 2.6, 3.1, 3.5, 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4**

- [x] 2. Implement the API route
  - [x] 2.1 Create POST /api/messages/notes route
    - Create `apps/web/src/app/api/messages/notes/route.ts`
    - Authenticate user via Supabase session; return 401 if unauthenticated
    - Parse and validate request body: `lead_id`, `contact_id`, `body` (all required)
    - Trim body and reject if empty after trim (400)
    - Resolve `tenant_id` from authenticated user metadata
    - Insert row into `messages` table with `channel = 'note'`, `direction = 'outbound'`, `status = 'delivered'`, `sent_at = new Date().toISOString()`
    - Update `leads.last_activity_at` to current timestamp
    - Return 201 with the inserted message row
    - Return 500 on database errors
    - _Requirements: 3.1, 3.7_

  - [x] 2.2 Write integration tests for the API route
    - Create `apps/web/src/app/api/messages/notes/__tests__/route.test.ts`
    - Test 401 when unauthenticated
    - Test 400 when body is missing or whitespace-only
    - Test 201 with correct message shape (channel='note', direction='outbound')
    - Test that `leads.last_activity_at` is updated
    - _Requirements: 3.1, 3.7_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the NoteDialog component
  - [x] 4.1 Create the NoteDialog component
    - Create `apps/web/src/app/(dashboard)/leads/[id]/note-dialog.tsx`
    - Implement modal overlay with black 50% opacity backdrop
    - Implement focus trap (Tab/Shift+Tab cycle within dialog)
    - Auto-focus textarea on open
    - Close on Escape key, backdrop click, or close button (X icon)
    - Return focus to trigger button on close
    - Add ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing heading
    - Display "Add Note" heading
    - Render multi-line textarea with min height of 4 lines, vertically resizable
    - Show placeholder "Write a note..." when empty
    - Enforce 2000-character limit using `enforceCharLimit` from note-utils
    - Show character count "{current}/2000" only when content is non-empty; hide when empty
    - Disable save button when content is whitespace-only (opacity 0.5)
    - Enable save button when content has at least one non-whitespace character
    - On save: POST to `/api/messages/notes` with `lead_id`, `contact_id`, `body`
    - Show "Saving..." text and disable button + textarea during save
    - Implement 15-second timeout via AbortController
    - On success: call `onSaved` callback with new note, close dialog
    - On failure: show error message inline, re-enable controls
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 5.1, 5.2, 5.3, 5.4_

  - [x] 4.2 Write unit tests for NoteDialog
    - Create `apps/web/src/app/(dashboard)/leads/[id]/__tests__/note-dialog.test.tsx`
    - Test dialog opens on trigger
    - Test correct ARIA attributes
    - Test Escape key closes dialog
    - Test backdrop click closes dialog
    - Test close button (X) closes dialog
    - Test auto-focus on textarea
    - Test placeholder shown when empty
    - Test character count hidden when empty, visible when non-empty
    - Test save button disabled when empty/whitespace-only
    - Test save button shows "Saving..." during request
    - Test textarea disabled during save
    - Test error message shown on API failure
    - Test timeout error after 15 seconds
    - Test dialog closes on successful save
    - _Requirements: 1.1–1.7, 2.1–2.6, 3.2–3.6, 3.8, 5.1–5.4_

- [x] 5. Integrate components into the lead detail page
  - [x] 5.1 Create LeadClientSection wrapper component
    - Create `apps/web/src/app/(dashboard)/leads/[id]/lead-client-section.tsx`
    - This client component wraps `ActionButtons` and `Timeline`
    - Holds mutable `timelineItems` state initialized from server-rendered data
    - Implements `onNoteSaved` callback that prepends new note to timeline state
    - Passes `onNoteSaved` to `ActionButtons` and `items` to `Timeline`
    - _Requirements: 3.2, 4.5_

  - [x] 5.2 Modify ActionButtons to support NoteDialog
    - Update `apps/web/src/app/(dashboard)/leads/[id]/action-buttons.tsx`
    - Add `contactId` and `onNoteSaved` props to the interface
    - Add state for dialog open/close
    - Replace the placeholder `onClick` alert with state toggle to open `NoteDialog`
    - Render `NoteDialog` component when open, passing `leadId`, `contactId`, `onSaved`, `onClose`
    - _Requirements: 1.1_

  - [x] 5.3 Modify Timeline to render notes correctly
    - Update `apps/web/src/app/(dashboard)/leads/[id]/timeline.tsx`
    - Convert to client component (`'use client'`)
    - Use `formatTimelineLabel` from note-utils for the type/direction label
    - For items with `type = 'note'`: display "NOTE" label without direction indicator
    - Preserve `whitespace-pre-wrap` for note body to maintain line breaks
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.4 Modify LeadDetailPage to use LeadClientSection
    - Update `apps/web/src/app/(dashboard)/leads/[id]/page.tsx`
    - Import and render `LeadClientSection` in place of direct `ActionButtons` and `Timeline` usage
    - Pass `contactId`, `leadId`, `phone`, `contactName`, `linkedinUrl`, and `timelineItems` as props
    - _Requirements: 3.2, 4.5_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `messages` table is reused — no database migration is needed
- The `fast-check` library is already available in devDependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1", "5.3"] },
    { "id": 3, "tasks": ["5.2", "5.4"] }
  ]
}
```
