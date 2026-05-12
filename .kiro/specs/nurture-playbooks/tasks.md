# Implementation Plan: Nurture Playbooks

## Overview

This plan implements the Nurture Playbooks feature for PropAgent SG — a systematic outreach module enabling property agents to nurture contacts through predefined sequences of touchpoints. Implementation proceeds from database schema through library logic, API routes, UI components, the Edge Function task generator, and analytics. Each task builds incrementally on prior work, with property-based tests validating correctness properties from the design.

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create SQL migration extending contacts table and creating playbooks, playbook_steps, nurture_tasks, and message_templates tables
    - Add columns to contacts: owned_property_type, owned_property_label, owned_property_town, owned_property_flat_type, owned_property_key_collection_date, mop_date, mop_date_manual_override, channel_preference
    - Create playbooks table with unique constraint on (tenant_id, name)
    - Create playbook_steps table with foreign key to playbooks
    - Create nurture_tasks table with deduplication unique index on (contact_id, playbook_id, step_id) WHERE step_id IS NOT NULL
    - Create message_templates table
    - Add all CHECK constraints, indexes, RLS policies as specified in design
    - Create the evaluate_segment RPC function
    - Create the snoozed task reactivation pg_cron job
    - _Requirements: 1.1, 1.6, 1.7, 2.8, 5.7, 5.9, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.5_

  - [x] 1.2 Create Supabase RPC function for segment evaluation
    - Implement evaluate_segment PL/pgSQL function as defined in design
    - Support AND logic across all filter conditions
    - Handle null field values by excluding the contact
    - Support contact fields and lead field conditions via EXISTS subquery
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 2. Core library types and Zod schemas
  - [x] 2.1 Create `apps/web/src/lib/nurture/types.ts` with TypeScript types and Zod validation schemas
    - Define PlaybookStep, SegmentDefinition, FilterCondition, CreatePlaybookRequest, CreateTemplateRequest interfaces
    - Define TaskStatus type and NurtureTaskRow interface
    - Create Zod schemas: playbookStepSchema, segmentDefinitionSchema, createPlaybookSchema, createTemplateSchema, taskStatusUpdateSchema
    - Validate steps_json (1-50 steps, offset_days -365 to 365, channel enum, title max 80 chars)
    - Validate template body max 2000 chars, name max 100 chars
    - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.6, 3.7, 13.1, 14.1, 14.5_

  - [x] 2.2 Write property test for playbook steps validation (Property 2)
    - **Property 2: Playbook Steps Validation**
    - Generate arbitrary arrays and verify validation accepts iff: 1-50 elements, each with offset_days in [-365, 365], channel in {whatsapp, email, call, task_only}, title length 1-80
    - File: `apps/web/src/lib/nurture/__tests__/steps-validation.property.test.ts`
    - **Validates: Requirements 2.4, 3.7**

- [x] 3. MOP date computation
  - [x] 3.1 Implement `apps/web/src/lib/nurture/mop-calculator.ts`
    - Implement computeMopDate function as specified in design
    - Use date-fns addYears for 5-year computation
    - Handle all cases: non-HDB → null, manual override → preserve, HDB with key date → compute
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Write property test for MOP date computation (Property 1)
    - **Property 1: MOP Date Computation**
    - Generate arbitrary MopInput values and verify all four cases from the property definition
    - File: `apps/web/src/lib/nurture/__tests__/mop-calculator.property.test.ts`
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

- [x] 4. Task status transitions
  - [x] 4.1 Implement `apps/web/src/lib/nurture/task-transitions.ts`
    - Implement isValidTransition function with the state machine: pending→{done,skipped,snoozed}, snoozed→{pending}, done→{}, skipped→{}
    - Implement validateSnoozeDate function: at least 1 day future, at most 90 days
    - _Requirements: 5.1, 5.4, 5.8_

  - [x] 4.2 Write property test for task status transitions (Property 9)
    - **Property 9: Task Status Transitions**
    - Generate arbitrary (from, to) status pairs and verify transition succeeds iff pair is in valid set
    - File: `apps/web/src/lib/nurture/__tests__/task-transitions.property.test.ts`
    - **Validates: Requirements 5.1, 5.8**

  - [x] 4.3 Write property test for snooze date validation (Property 10)
    - **Property 10: Snooze Date Validation**
    - Generate arbitrary dates and verify acceptance iff date is ≥1 day and ≤90 days from now
    - File: `apps/web/src/lib/nurture/__tests__/snooze-validation.property.test.ts`
    - **Validates: Requirements 5.4**

- [x] 5. Template resolution and validation
  - [x] 5.1 Implement `apps/web/src/lib/nurture/template-resolver.ts`
    - Implement resolveTemplate function: replace {{placeholder}} patterns with context values
    - Implement validateTemplatePlaceholders function: reject unsupported placeholder names
    - Support placeholders: contact_name, owned_property_label, owned_property_town, mop_date, agent_name, trigger_date
    - Track missing fields (null/empty context values)
    - _Requirements: 8.1, 13.2, 13.3, 13.4, 13.8_

  - [x] 5.2 Write property test for template placeholder resolution (Property 11)
    - **Property 11: Template Placeholder Resolution**
    - Generate arbitrary template strings with supported placeholders and context values; verify no remaining {{...}} patterns for supported names and missing_fields matches null/empty context values
    - File: `apps/web/src/lib/nurture/__tests__/template-resolver.property.test.ts`
    - **Validates: Requirements 8.1, 13.3, 13.4**

  - [x] 5.3 Write property test for template placeholder validation (Property 12)
    - **Property 12: Template Placeholder Validation**
    - Generate arbitrary template bodies with mix of valid/invalid placeholders; verify rejection iff any unsupported placeholder name exists
    - File: `apps/web/src/lib/nurture/__tests__/template-validation.property.test.ts`
    - **Validates: Requirements 13.2, 13.8**

- [x] 6. Consent badge computation
  - [x] 6.1 Implement `apps/web/src/lib/nurture/consent.ts`
    - Implement computeConsentBadge function as specified in design
    - Handle red conditions: whatsapp_optin false + whatsapp channel, channel_preference none, expired data_retention, DNC + call channel
    - Handle yellow condition: optin true but ad_purpose mismatch
    - Default to green
    - _Requirements: 6.3, 10.4, 10.7, 10.8_

  - [x] 6.2 Write property test for consent badge computation (Property 13)
    - **Property 13: Consent Badge Computation**
    - Generate arbitrary ConsentInput values and verify badge matches the priority rules (red > yellow > green)
    - File: `apps/web/src/lib/nurture/__tests__/consent-badge.property.test.ts`
    - **Validates: Requirements 6.3, 10.4, 10.8**

- [x] 7. Checkpoint - Core library validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Step ordering and touch date computation
  - [x] 8.1 Implement step display ordering utility in `apps/web/src/lib/nurture/types.ts` or a dedicated helper
    - Sort steps by offset_days ascending, then by sort_order for ties
    - _Requirements: 3.5_

  - [x] 8.2 Write property test for step display ordering (Property 3)
    - **Property 3: Step Display Ordering**
    - Generate arbitrary step arrays and verify sorted output satisfies: A before B implies A.offset_days < B.offset_days OR (equal offset_days AND A.sort_order < B.sort_order)
    - File: `apps/web/src/lib/nurture/__tests__/step-ordering.property.test.ts`
    - **Validates: Requirements 3.5**

  - [x] 8.3 Write property test for touch date computation (Property 4)
    - **Property 4: Touch Date Computation**
    - Generate arbitrary trigger dates and offset_days values; verify touch_date = trigger_date + offset_days calendar days
    - File: `apps/web/src/lib/nurture/__tests__/touch-date.property.test.ts`
    - **Validates: Requirements 3.2, 4.4, 4.8**

- [x] 9. Segment evaluation and consent exclusion logic
  - [x] 9.1 Implement `apps/web/src/lib/nurture/segment-evaluator.ts` for client-side segment preview
    - Implement client-side filter matching for segment preview UI
    - Apply AND logic across all conditions
    - Handle null fields as non-matching
    - _Requirements: 12.4, 12.5, 12.6_

  - [x] 9.2 Write property test for segment evaluation AND logic (Property 5)
    - **Property 5: Segment Evaluation AND Logic**
    - Generate arbitrary filter conditions and contact data; verify contact included iff ALL conditions satisfied, null fields exclude, empty conditions include all
    - File: `apps/web/src/lib/nurture/__tests__/segment-evaluation.property.test.ts`
    - **Validates: Requirements 4.2, 12.4, 12.5, 12.6**

  - [x] 9.3 Write property test for consent-based task exclusion (Property 6)
    - **Property 6: Consent-Based Task Exclusion**
    - Generate arbitrary contact consent fields and step channels; verify exclusion iff whatsapp_optin false + whatsapp channel, OR channel_preference none, OR expired data_retention
    - File: `apps/web/src/lib/nurture/__tests__/consent-exclusion.property.test.ts`
    - **Validates: Requirements 4.3, 10.1, 10.2, 10.3**

- [x] 10. Analytics computation logic
  - [x] 10.1 Implement `apps/web/src/lib/nurture/analytics.ts`
    - Implement response rate calculation: contacts with inbound message within 7 days / total WhatsApp tasks done
    - Implement deal attribution logic: deal attributed if contact has completed task within 180 days before deal creation
    - Build query helpers for funnel and performance reports
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.2 Write property test for response rate calculation (Property 14)
    - **Property 14: Response Rate Calculation**
    - Generate arbitrary sets of completed tasks and inbound messages; verify rate = (unique contacts with reply within 7 days) / (total done WhatsApp tasks), zero when denominator is zero
    - File: `apps/web/src/lib/nurture/__tests__/response-rate.property.test.ts`
    - **Validates: Requirements 11.3**

  - [x] 10.3 Write property test for deal attribution (Property 15)
    - **Property 15: Deal Attribution**
    - Generate arbitrary deals and completed tasks; verify attribution iff matching contact_id AND task completed_at within 180 days before deal created_at
    - File: `apps/web/src/lib/nurture/__tests__/deal-attribution.property.test.ts`
    - **Validates: Requirements 11.4**

- [x] 11. Checkpoint - Library layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. API routes - Playbook CRUD
  - [x] 12.1 Create `apps/web/src/app/api/nurture/playbooks/route.ts` (GET list, POST create)
    - GET: fetch playbooks for tenant with pagination
    - POST: validate with Zod schema, create playbook, synchronise playbook_steps
    - Enforce unique name per tenant (handle 409 conflict)
    - Validate trigger_field against allowed date fields
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 15.5, 15.6_

  - [x] 12.2 Create `apps/web/src/app/api/nurture/playbooks/[id]/route.ts` (GET, PATCH, DELETE)
    - GET: fetch single playbook with steps
    - PATCH: update name, description, segment, trigger_field, steps_json, active status; re-sync playbook_steps on steps change
    - DELETE: guard against deletion when pending/snoozed tasks exist (409)
    - _Requirements: 2.6, 2.7, 2.9, 2.10, 2.11, 15.3, 15.4_

  - [x] 12.3 Write property test for playbook steps synchronisation (Property 16)
    - **Property 16: Playbook Steps Synchronisation Round-Trip**
    - Generate arbitrary valid steps_json arrays; verify after sync, playbook_steps rows match exactly with correct sort_order
    - File: `apps/web/src/lib/nurture/__tests__/steps-sync.property.test.ts`
    - **Validates: Requirements 15.2, 15.3**

  - [x] 12.4 Write property test for playbook deletion guard (Property 17)
    - **Property 17: Playbook Deletion Guard**
    - Generate arbitrary playbooks with varying task statuses; verify deletion rejected iff any task has status pending or snoozed
    - File: `apps/web/src/lib/nurture/__tests__/deletion-guard.property.test.ts`
    - **Validates: Requirements 2.11, 14.7**

- [x] 13. API routes - Template CRUD
  - [x] 13.1 Create `apps/web/src/app/api/nurture/templates/route.ts` (GET list, POST create)
    - GET: fetch templates for tenant
    - POST: validate with Zod schema, validate placeholders, create template
    - Reject unsupported placeholders with 400 error
    - _Requirements: 13.1, 13.2, 13.5, 13.8_

  - [x] 13.2 Create `apps/web/src/app/api/nurture/templates/[id]/route.ts` (GET, PATCH, DELETE)
    - GET: fetch single template
    - PATCH: validate placeholders, warn if referenced by active step
    - DELETE: prevent if referenced by active playbook step (409)
    - _Requirements: 13.6, 13.7_

- [x] 14. API routes - Nurture tasks
  - [x] 14.1 Create `apps/web/src/app/api/nurture/tasks/route.ts` (GET list, POST ad-hoc task)
    - GET: fetch tasks with filters (playbook_id, status, assigned_to, consent_status), pagination, join contact data
    - POST: create ad-hoc task (step_id null), validate due_at ≥ today, title max 80 chars
    - _Requirements: 6.10, 6.11, 7.4, 14.3_

  - [x] 14.2 Create `apps/web/src/app/api/nurture/tasks/[id]/route.ts` (PATCH status transitions)
    - Validate transition using isValidTransition
    - Handle done: set completed_at
    - Handle skipped: set completed_at
    - Handle snoozed: validate snooze date, update due_at
    - Reject invalid transitions with 400
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.8_

  - [x] 14.3 Create `apps/web/src/app/api/nurture/tasks/[id]/prepare/route.ts` (GET resolved template)
    - Fetch task, step, template, and contact data
    - Resolve template placeholders using resolveTemplate
    - Re-check consent at execution time
    - Return resolved message, consent status, and missing fields
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 10.6_

- [x] 15. API routes - Segments and Analytics
  - [x] 15.1 Create `apps/web/src/app/api/nurture/segments/preview/route.ts` (POST)
    - Accept segment_definition_json, call evaluate_segment RPC
    - Return matching contact count and sample contacts
    - _Requirements: 12.1, 12.9_

  - [x] 15.2 Create `apps/web/src/app/api/nurture/analytics/funnel/route.ts` and `performance/route.ts`
    - Funnel: total contacts per playbook, tasks created vs completed, deals from nurtured contacts
    - Performance: per-playbook tasks completed, response rate, deals won, net commission
    - Support date range filtering with presets (7d, 30d, 90d, custom max 365d)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 16. Checkpoint - API layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. UI Components - Nurture task list and row
  - [x] 17.1 Create `apps/web/src/components/nurture/nurture-task-list.tsx` and `nurture-task-row.tsx`
    - Display task list with columns: contact name, owned property summary, segment tags, next action (title + due date), last activity, consent badge
    - Order by due_at ascending (overdue first)
    - Include action buttons: Open WhatsApp, Call, View contact, Snooze, Mark done
    - Disable WhatsApp/Call buttons when consent badge is red
    - _Requirements: 6.2, 6.4, 6.9, 6.10_

  - [x] 17.2 Create `apps/web/src/components/nurture/consent-badge.tsx`
    - Render 🟢/🟡/🔴 badge based on computeConsentBadge result
    - _Requirements: 6.3, 10.4_

  - [x] 17.3 Create `apps/web/src/components/nurture/snooze-dialog.tsx`
    - Date picker constrained to 1-90 days from today
    - On confirm, PATCH task status to snoozed with new due_at
    - _Requirements: 6.7, 5.4_

  - [x] 17.4 Create `apps/web/src/components/nurture/consent-warning-dialog.tsx`
    - Non-dismissible dialog showing consent gap reason
    - Require explicit confirm or cancel before proceeding
    - _Requirements: 10.5_

- [x] 18. UI Components - Detail panel and playbook timeline
  - [x] 18.1 Create `apps/web/src/components/nurture/detail-panel.tsx`
    - Show upcoming playbook steps timeline, consent details, owned property summary
    - Button to create ad-hoc task
    - Display separate timeline per playbook when contact is in multiple playbooks
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 18.2 Create `apps/web/src/components/nurture/playbook-timeline.tsx`
    - Visualise completed steps (with date), current pending step (highlighted), future steps with computed due dates
    - _Requirements: 7.2_

- [x] 19. UI Components - Playbook management forms
  - [x] 19.1 Create `apps/web/src/components/nurture/playbook-form.tsx`
    - Form for creating/editing playbooks: name, description, trigger_field selector, target_ad_purpose
    - Client-side validation with Zod schemas
    - _Requirements: 2.1, 2.9_

  - [x] 19.2 Create `apps/web/src/components/nurture/step-editor.tsx`
    - Drag-and-drop step list editor
    - Each step: offset_days input, channel selector, template_id selector, title input
    - Validate step constraints inline (offset range, title length, max 50 steps)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 19.3 Create `apps/web/src/components/nurture/segment-builder.tsx`
    - Visual filter builder for segment_definition_json
    - Support contact and lead field conditions with appropriate operators
    - Max 10 conditions
    - Preview matching contacts count via segments/preview API
    - _Requirements: 12.1, 12.2, 12.3, 12.9_

- [x] 20. UI Components - Template management
  - [x] 20.1 Create `apps/web/src/components/nurture/template-form.tsx`
    - Form for creating/editing templates: name, channel, body with placeholder insertion
    - Validate placeholders on save, show error for unsupported ones
    - _Requirements: 13.1, 13.2, 13.8_

  - [x] 20.2 Create `apps/web/src/components/nurture/template-preview.tsx`
    - Show template with resolved placeholders using sample contact data
    - Highlight missing/empty fields with visual indicator
    - _Requirements: 13.3, 13.4_

- [x] 21. UI Components - Analytics
  - [x] 21.1 Create `apps/web/src/components/nurture/analytics-funnel.tsx` and `analytics-performance.tsx`
    - Funnel chart: contacts → tasks created → tasks completed → deals
    - Performance table: per-playbook metrics (completed, response rate, deals won, commission)
    - Date range selector with presets
    - Empty state when no data
    - _Requirements: 11.1, 11.2, 11.6, 11.7_

- [x] 22. Page routes - Nurture view and sub-pages
  - [x] 22.1 Create `apps/web/src/app/(dashboard)/nurture/page.tsx` (main nurture task list view)
    - Integrate nurture-task-list component
    - Add filter controls (playbook, status, assigned agent, consent status)
    - Empty state explaining how to create a playbook
    - _Requirements: 6.1, 6.11, 6.12_

  - [x] 22.2 Create `apps/web/src/app/(dashboard)/nurture/playbooks/page.tsx`, `new/page.tsx`, and `[id]/page.tsx`
    - Playbook list page with active/inactive toggle
    - New playbook page with playbook-form and step-editor
    - Edit playbook page with existing data pre-filled
    - _Requirements: 2.1, 2.6, 2.9_

  - [x] 22.3 Create `apps/web/src/app/(dashboard)/nurture/templates/page.tsx` and `new/page.tsx`
    - Template list page
    - New/edit template page with template-form and template-preview
    - _Requirements: 13.1, 13.6, 13.7_

  - [x] 22.4 Create `apps/web/src/app/(dashboard)/nurture/analytics/page.tsx`
    - Integrate analytics-funnel and analytics-performance components
    - Date range controls
    - _Requirements: 11.1, 11.5, 11.7_

- [x] 23. Checkpoint - UI layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 24. Supabase Edge Function - Task Generator
  - [x] 24.1 Create `supabase/functions/task-generator/index.ts`
    - Implement the task generator algorithm as specified in design
    - Fetch active playbooks, evaluate segments via RPC, compute touch dates
    - Apply PDPA exclusions (whatsapp_optin, channel_preference, data_retention_expiry)
    - Deduplicate via upsert with ON CONFLICT DO NOTHING
    - Assign tasks to lead's assigned_to or playbook's created_by
    - Set channel from step (task_only → note)
    - Error handling: log per-contact errors, continue processing
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [x] 24.2 Write property test for task deduplication (Property 7)
    - **Property 7: Task Deduplication**
    - Generate arbitrary sequences of task generation inputs; verify at most one task per (contact_id, playbook_id, step_id) where step_id is not null
    - File: `apps/web/src/lib/nurture/__tests__/task-dedup.property.test.ts`
    - **Validates: Requirements 4.6, 14.4**

  - [x] 24.3 Write property test for task assignment priority (Property 8)
    - **Property 8: Task Assignment Priority**
    - Generate arbitrary contacts with/without lead assignments; verify assigned_to = lead.assigned_to if exists, else playbook.created_by
    - File: `apps/web/src/lib/nurture/__tests__/task-assignment.property.test.ts`
    - **Validates: Requirements 4.7**

- [x] 25. WhatsApp and Call channel execution wiring
  - [x] 25.1 Wire WhatsApp execution flow
    - On "Open WhatsApp": call prepare API, navigate to /messages/:contactId with prefill query param
    - Handle template unavailable: navigate with empty composer + inline notice
    - On message send: mark task done, log activity
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 25.2 Wire Call execution flow
    - On "Call": deep-link to device dialer with contact phone
    - On return: prompt for call outcome notes
    - On log + mark done: record activity timeline entry
    - Handle missing phone number: disable call action with message
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 26. Integration wiring and navigation
  - [x] 26.1 Add nurture tab to dashboard navigation
    - Add "Nurture" link to the dashboard sidebar/navigation alongside existing routes
    - Wire detail panel open on contact row click
    - Wire consent warning dialog before executing tasks with yellow/red badges
    - _Requirements: 6.1, 10.5_

  - [x] 26.2 Write integration tests for end-to-end flows
    - Test: create playbook → activate → task generator creates tasks → view in nurture list
    - Test: consent withdrawal → badge updates → actions disabled
    - Test: playbook deactivation → no new tasks, existing preserved
    - _Requirements: 2.7, 4.1, 10.7, 12.7, 12.8_

- [x] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (17 properties total)
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Vitest + fast-check for property-based testing
- All API routes enforce RLS via Supabase client with user session
- The Edge Function (task-generator) uses an admin client since it runs via pg_cron

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "4.3", "5.2", "5.3", "6.2", "8.1", "9.1", "10.1"] },
    { "id": 4, "tasks": ["8.2", "8.3", "9.2", "9.3", "10.2", "10.3"] },
    { "id": 5, "tasks": ["12.1", "13.1", "14.1"] },
    { "id": 6, "tasks": ["12.2", "12.3", "12.4", "13.2", "14.2", "14.3", "15.1", "15.2"] },
    { "id": 7, "tasks": ["17.1", "17.2", "17.3", "17.4", "18.1", "18.2"] },
    { "id": 8, "tasks": ["19.1", "19.2", "19.3", "20.1", "20.2", "21.1"] },
    { "id": 9, "tasks": ["22.1", "22.2", "22.3", "22.4", "24.1"] },
    { "id": 10, "tasks": ["24.2", "24.3", "25.1", "25.2"] },
    { "id": 11, "tasks": ["26.1", "26.2"] }
  ]
}
```
