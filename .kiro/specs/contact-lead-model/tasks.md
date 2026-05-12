# Implementation Tasks

## Task 1: Database Schema Migration — Contacts Enhancement

### Description
Add relationship management fields to the existing contacts table and create necessary indexes.

### Files to modify
- `supabase/migrations/YYYYMMDD_contact_lead_model.sql` (create)

### Acceptance criteria
- Requirement 1: Criteria 1, 2, 3, 4, 5

### Steps
- [x] 1.1 Create migration file with ALTER TABLE statements adding: primary_agent_id, contact_status, last_contacted_at, last_inbound_at, source_first, source_latest, channel_preference, relationship_tags
- [x] 1.2 Add CHECK constraint for contact_status enum (active, inactive, archived, do_not_contact)
- [x] 1.3 Add CHECK constraint for channel_preference enum (whatsapp, sms, email, phone)
- [x] 1.4 Add index on contacts(tenant_id, contact_status) and contacts(primary_agent_id)
- [x] 1.5 Add backfill SQL to populate source_first and source_latest from existing source column
- [x] 1.6 Verify unique constraint on (tenant_id, phone) already exists; add if missing

---

## Task 2: Database Schema Migration — Leads Enhancement

### Description
Add opportunity-lifecycle fields to the existing leads table, create triggers for is_active management and contact_id immutability.

### Files to modify
- `supabase/migrations/YYYYMMDD_contact_lead_model.sql` (append)

### Acceptance criteria
- Requirement 2: Criteria 1, 2, 3, 4, 5, 6
- Requirement 12: Criteria 5

### Steps
- [x] 2.1 Add columns: lead_title, lead_category, is_active, opened_at, closed_at, close_reason, origin_listing_id, duplicate_of_lead_id
- [x] 2.2 Add CHECK constraint for lead_category enum (buyer, seller, landlord, tenant, co_broke, nurture)
- [x] 2.3 Add FK constraints for origin_listing_id (references listings) and duplicate_of_lead_id (self-reference to leads)
- [x] 2.4 Create trigger function handle_lead_stage_change() to auto-set is_active=false and closed_at on terminal stages
- [x] 2.5 Create trigger function prevent_contact_id_change() to reject contact_id updates
- [x] 2.6 Add backfill SQL: set is_active=false for closed leads, set opened_at=created_at, derive lead_category from deal_type
- [x] 2.7 Add indexes: idx_leads_active(contact_id, is_active), idx_leads_category(tenant_id, lead_category), idx_leads_opened(tenant_id, opened_at DESC)

---

## Task 3: Database Schema Migration — Tasks Enhancement

### Description
Add optional contact_id column to tasks table for contact-level task support.

### Files to modify
- `supabase/migrations/YYYYMMDD_contact_lead_model.sql` (append)

### Acceptance criteria
- Requirement 10: Criteria 1, 2

### Steps
- [x] 3.1 Add contact_id column to tasks table with FK reference to contacts(id)
- [x] 3.2 Add index on tasks(contact_id)
- [x] 3.3 Add backfill SQL to populate contact_id from lead's contact_id for existing tasks

---

## Task 4: TypeScript Type Definitions

### Description
Create/update TypeScript type definitions for the enhanced Contact and Lead models.

### Files to modify
- `lib/types/contact.ts` (create)
- `lib/types/lead.ts` (create or update existing)

### Acceptance criteria
- Requirement 1: Criteria 1, 2, 3
- Requirement 2: Criteria 1, 2

### Steps
- [x] 4.1 Create Contact type with all fields: identity, consent, relationship management
- [x] 4.2 Create ContactWithLeads type extending Contact with leads array
- [x] 4.3 Create ContactSearchResult type with contact + active leads summary
- [x] 4.4 Update Lead type to include lead_title, lead_category, is_active, opened_at, closed_at, close_reason, origin_listing_id, duplicate_of_lead_id
- [x] 4.5 Create DuplicateWarning type and DuplicateDetectionResult type
- [x] 4.6 Create PDPAExport type covering all exportable data

---

## Task 5: Contact Service — Resolution and CRUD

### Description
Implement the Contact Service with phone-based resolution, CRUD operations, and relationship tracking.

### Files to modify
- `lib/services/contact-service.ts` (create)

### Acceptance criteria
- Requirement 3: Criteria 1, 2, 3, 4, 5
- Requirement 1: Criteria 6

### Steps
- [x] 5.1 Implement resolveContact() — normalize phone, search by tenant+phone, reuse or create
- [x] 5.2 Implement findByPhone() — query contacts by tenant_id and normalized phone
- [x] 5.3 Implement createContact() — insert with source_first and source_latest set
- [x] 5.4 Implement updateContact() — partial update with updated_at
- [x] 5.5 Implement getContact() — fetch contact with all linked leads, deals, messages
- [x] 5.6 Implement updateLastInbound() and updateLatestSource() helper methods
- [x] 5.7 Implement searchContacts() — search by name or phone, return contact + active leads

---

## Task 6: Lead Service — Creation with Contact Resolution

### Description
Implement the Lead Service that integrates contact resolution and duplicate detection into lead creation.

### Files to modify
- `lib/services/lead-service.ts` (create or update existing)

### Acceptance criteria
- Requirement 3: Criteria 1, 2, 3
- Requirement 4: Criteria 4, 5, 6
- Requirement 5: Criteria 1, 3, 4

### Steps
- [x] 6.1 Implement createLead() — call resolveContact first, then check duplicates, then create lead with is_active=true and opened_at=now
- [x] 6.2 Implement updateStage() — handle close_reason requirement for terminal stages
- [x] 6.3 Implement attachToExistingLead() — link activity data to existing lead without creating new
- [x] 6.4 Implement getLeadsByContact() — all leads for a contact in reverse chronological order
- [x] 6.5 Implement getActiveLeadsByContact() — only is_active=true leads
- [x] 6.6 Integrate with existing webhook handlers (Meta, WhatsApp) to use new createLead flow

---

## Task 7: Duplicate Detection Engine

### Description
Implement the duplicate detection logic that warns agents about potential duplicate leads.

### Files to modify
- `lib/services/duplicate-detection.ts` (create)

### Acceptance criteria
- Requirement 4: Criteria 1, 2, 3
- Requirement 5: Criteria 2

### Steps
- [x] 7.1 Implement detect() — query active leads for contact, check same category within 14 days
- [x] 7.2 Build context banner data: count past leads, closed deals, active leads for the contact
- [x] 7.3 Determine isDuplicate flag based on: same lead_category + same deal_type + created within 14 days
- [x] 7.4 Return DuplicateDetectionResult with contextBanner and optional potentialDuplicate lead

---

## Task 8: PDPA Compliance Service

### Description
Implement PDPA data export and anonymisation operations at the contact level.

### Files to modify
- `lib/services/pdpa-service.ts` (create)

### Acceptance criteria
- Requirement 11: Criteria 1, 2, 3, 4, 5, 6

### Steps
- [x] 8.1 Implement exportContactData() — gather contact, leads, messages, tasks, buyer_requirements, viewings, deals into structured export
- [x] 8.2 Implement anonymiseContact() — replace PII fields with anonymised placeholders, set status to archived
- [x] 8.3 Implement message anonymisation — replace body with "[anonymised]", clear media_url for all contact messages
- [x] 8.4 Implement flagExpiredRetention() — query contacts where data_retention_expiry < now and status != archived
- [x] 8.5 Ensure lead, deal, and task records are preserved (not deleted) during anonymisation

---

## Task 9: Contact Profile View — Page and Layout

### Description
Create the Contact Profile page showing the person hub with all linked data.

### Files to modify
- `apps/web/src/app/(dashboard)/contacts/[id]/page.tsx` (create)

### Acceptance criteria
- Requirement 6: Criteria 1, 2, 3, 4, 5, 6, 7
- Requirement 8: Criteria 4

### Steps
- [x] 9.1 Create page component that fetches contact with all linked data via getContact()
- [x] 9.2 Build header section: full name, phone, email, contact_status badge, primary agent name
- [x] 9.3 Build identity panel: nationality, PR status, LinkedIn link, channel preference
- [x] 9.4 Build consent panel: WhatsApp opt-in, consent timestamp, source, retention expiry
- [x] 9.5 Build leads list component showing all linked leads in reverse chronological order with navigation links to each lead
- [x] 9.6 Build deals summary section aggregated from all leads
- [x] 9.7 Build messages timeline with lead filter dropdown
- [x] 9.8 Build relationship section: tags display, long-term notes

---

## Task 10: Lead Card View — Enhancements

### Description
Enhance the existing lead detail page with lead title, category, parent contact link, and lead-scoped timeline.

### Files to modify
- `apps/web/src/app/(dashboard)/leads/[id]/page.tsx` (modify)
- `apps/web/src/app/(dashboard)/leads/[id]/lead-client-section.tsx` (modify)

### Acceptance criteria
- Requirement 7: Criteria 1, 2, 3, 4, 5

### Steps
- [x] 10.1 Add lead_title and lead_category badge to the lead detail header
- [x] 10.2 Add is_active indicator with closed_at date and close_reason when applicable
- [x] 10.3 Add "View Contact Profile" navigation link to parent contact
- [x] 10.4 Scope timeline to show only events for the current lead (filter by lead_id)
- [x] 10.5 Scope messages to show only messages where lead_id matches current lead

---

## Task 11: Duplicate Detection Banner Component

### Description
Create the UI component that shows duplicate context and presents agent choices during lead creation.

### Files to modify
- `apps/web/src/app/(dashboard)/leads/new/duplicate-banner.tsx` (create)
- `apps/web/src/app/(dashboard)/leads/new/page.tsx` (modify)

### Acceptance criteria
- Requirement 4: Criteria 1, 2, 3, 4, 5

### Steps
- [x] 11.1 Create DuplicateBanner component showing: "Existing contact found: X past leads, Y closed deals, Z active leads"
- [x] 11.2 Add duplicate warning section when potential duplicate detected (same category within 14 days)
- [x] 11.3 Implement three action buttons: "Create New Lead" (default/primary), "Attach to Existing", "Merge into Active"
- [x] 11.4 Integrate banner into lead creation page — trigger duplicate check after phone number is entered
- [x] 11.5 Wire up action handlers: create new calls createLead, attach calls attachToExistingLead

---

## Task 12: Navigation and Search Updates

### Description
Update navigation patterns so inbox/pipeline are lead-first and search returns contacts with active leads.

### Files to modify
- `apps/web/src/app/(dashboard)/leads/page.tsx` (modify)
- `apps/web/src/app/(dashboard)/messages/page.tsx` (modify)

### Acceptance criteria
- Requirement 8: Criteria 1, 2, 3, 5

### Steps
- [x] 12.1 Verify inbox/pipeline views already operate on leads (existing behavior) — no change needed if already correct
- [x] 12.2 Update search functionality to use searchContacts() returning contact + active leads
- [x] 12.3 Update messages view to support contact-first navigation with optional lead filter
- [x] 12.4 Add contact name display in lead list items for context

---

## Task 13: Update Webhook Handlers for Contact Resolution

### Description
Refactor existing Meta and WhatsApp webhook handlers to use the new Contact Service resolution flow.

### Files to modify
- Existing Meta webhook handler file
- Existing WhatsApp webhook handler file

### Acceptance criteria
- Requirement 3: Criteria 1, 2, 3, 4, 5

### Steps
- [x] 13.1 Refactor Meta webhook handler to call contactService.resolveContact() instead of inline find-or-create logic
- [x] 13.2 Refactor WhatsApp webhook handler to call contactService.resolveContact() instead of inline find-or-create logic
- [x] 13.3 Add updateLatestSource() call after contact resolution in both handlers
- [x] 13.4 Add updateLastInbound() call for inbound channels
- [x] 13.5 Integrate duplicate detection into webhook-created leads (auto-create new lead by default for webhooks, store duplicate_of_lead_id if detected)

---

## Task 14: Integration Tests — Contact Resolution and Lead Lifecycle

### Description
Write integration tests verifying contact resolution, lead lifecycle, and duplicate detection.

### Files to modify
- `lib/services/__tests__/contact-service.test.ts` (create)
- `lib/services/__tests__/lead-service.test.ts` (create)
- `lib/services/__tests__/duplicate-detection.test.ts` (create)

### Acceptance criteria
- Requirement 3: Criteria 1, 2, 3
- Requirement 4: Criteria 2, 6
- Requirement 5: Criteria 1, 4
- Requirement 12: Criteria 2, 3, 5

### Steps
- [x] 14.1 Test: creating lead with existing phone reuses contact (no duplicate contact created)
- [x] 14.2 Test: creating lead with new phone creates new contact first
- [x] 14.3 Test: multiple leads for same contact each get unique lead records
- [x] 14.4 Test: moving lead to closed_won sets is_active=false and closed_at
- [x] 14.5 Test: reopening a closed lead sets is_active=true and clears closed_at
- [x] 14.6 Test: duplicate detection triggers for same category within 14 days
- [x] 14.7 Test: duplicate detection does NOT trigger for different categories
- [x] 14.8 Test: contact_id cannot be changed on existing lead (trigger rejects update)
- [x] 14.9 Test: contact survives when all linked leads are deleted/closed

---

## Task 15: Property-Based Tests — Core Invariants

### Description
Write property-based tests for the core data model invariants.

### Files to modify
- `lib/services/__tests__/contact-lead-properties.test.ts` (create)

### Acceptance criteria
- Design: Properties 1, 2, 3, 4, 8, 9, 10

### Steps
- [ ] 15.1 Property test: Contact resolution idempotence — N lead creations with same phone produce exactly 1 contact :pbt
- [x] 15.2 Property test: is_active invariant — for any lead, is_active === (status not in terminal set) :pbt
- [x] 15.3 Property test: Lead lifecycle timestamps — opened_at always set; if !is_active then closed_at >= opened_at :pbt
- [x] 15.4 Property test: Multiple leads independence — updating one lead does not affect sibling leads :pbt
- [x] 15.5 Property test: Message scoping — lead card messages are strict subset of contact messages :pbt
