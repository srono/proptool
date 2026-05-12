# Design Document

## Overview

This design implements the Contact vs Lead Object Model separation for PropAgent SG. The core change enriches the existing `contacts` table with relationship-management fields and enriches the existing `leads` table with opportunity-lifecycle fields. It introduces a Contact Resolution service layer, a Duplicate Detection Engine, new UI views (Contact Profile, Lead Card), and PDPA compliance operations. The design builds on the existing Supabase/PostgreSQL schema with RLS, Next.js App Router frontend, and the established patterns from the lead-management-pipeline spec.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                         │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Contact      │ Lead Card    │ Pipeline/    │ Messages           │
│ Profile View │ View         │ Inbox Views  │ View               │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
┌──────▼──────────────▼──────────────▼────────────────▼───────────┐
│                    Server Actions / API Layer                     │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Contact      │ Lead         │ Duplicate    │ PDPA               │
│ Service      │ Service      │ Detection    │ Service            │
│              │              │ Engine       │                    │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
┌──────▼──────────────▼──────────────▼────────────────▼───────────┐
│                    Supabase PostgreSQL + RLS                      │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ contacts     │ leads        │ messages     │ tasks / viewings   │
│ (enhanced)   │ (enhanced)   │              │ / deals            │
└──────────────┴──────────────┴──────────────┴────────────────────┘
```

### Data Flow: Lead Creation with Contact Resolution

```
Enquiry arrives (any source)
       │
       ▼
┌─────────────────┐
│ Normalize phone │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Search contacts by phone    │
│ WHERE tenant_id = current   │
│ AND phone = normalized      │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
    Yes  │  No
    │    │    │
    │    │    ▼
    │    │  ┌──────────────────┐
    │    │  │ Create contact   │
    │    │  └────────┬─────────┘
    │    │           │
    ▼    ▼           ▼
┌─────────────────────────────┐
│ Duplicate Detection Engine  │
│ Check existing active leads │
└────────┬────────────────────┘
         │
    ┌────┴──────────┐
    │ Duplicate?    │
    └────┬──────────┘
    Yes  │  No
    │    │    │
    │    │    ▼
    │    │  ┌──────────────────┐
    │    │  │ Create new lead  │
    │    │  └──────────────────┘
    ▼    │
┌─────────────────────────────┐
│ Show banner + 3 options     │
│ Default: create new lead    │
└─────────────────────────────┘
```

## Database Schema Changes

### Migration: Alter contacts table

```sql
-- Add relationship management fields to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_agent_id UUID REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT 'active'
  CHECK (contact_status IN ('active', 'inactive', 'archived', 'do_not_contact'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_first TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_latest TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS channel_preference TEXT
  CHECK (channel_preference IN ('whatsapp', 'sms', 'email', 'phone'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_tags TEXT[] DEFAULT '{}';

-- Backfill source_first from existing source column
UPDATE contacts SET source_first = source, source_latest = source WHERE source_first IS NULL;

-- Create index for contact status filtering
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(tenant_id, contact_status);
CREATE INDEX IF NOT EXISTS idx_contacts_primary_agent ON contacts(primary_agent_id);
```

### Migration: Alter leads table

```sql
-- Add opportunity-lifecycle fields to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_title TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_category TEXT NOT NULL DEFAULT 'buyer'
  CHECK (lead_category IN ('buyer', 'seller', 'landlord', 'tenant', 'co_broke', 'nurture'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS close_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS origin_listing_id UUID REFERENCES listings(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS duplicate_of_lead_id UUID REFERENCES leads(id);

-- Backfill is_active based on current status
UPDATE leads SET is_active = false WHERE status IN ('closed_won', 'closed_lost');
UPDATE leads SET opened_at = created_at WHERE opened_at IS NULL;
UPDATE leads SET closed_at = last_activity_at WHERE status IN ('closed_won', 'closed_lost') AND closed_at IS NULL;

-- Backfill lead_category from deal_type
UPDATE leads SET lead_category = CASE
  WHEN deal_type IN ('sale', 'resale') THEN 'buyer'
  WHEN deal_type = 'rental' THEN 'tenant'
  WHEN deal_type = 'landlord_rep' THEN 'landlord'
  WHEN deal_type = 'tenant_rep' THEN 'tenant'
  ELSE 'buyer'
END WHERE lead_category = 'buyer' AND deal_type != 'sale';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(contact_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(tenant_id, lead_category);
CREATE INDEX IF NOT EXISTS idx_leads_opened ON leads(tenant_id, opened_at DESC);

-- Trigger: auto-set is_active and closed_at on terminal stage
CREATE OR REPLACE FUNCTION handle_lead_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('closed_won', 'closed_lost') AND OLD.status NOT IN ('closed_won', 'closed_lost') THEN
    NEW.is_active := false;
    NEW.closed_at := NOW();
  ELSIF OLD.status IN ('closed_won', 'closed_lost') AND NEW.status NOT IN ('closed_won', 'closed_lost') THEN
    NEW.is_active := true;
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_stage_change
  BEFORE UPDATE OF status ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_lead_stage_change();

-- Trigger: prevent contact_id change after creation
CREATE OR REPLACE FUNCTION prevent_contact_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.contact_id IS DISTINCT FROM NEW.contact_id THEN
    RAISE EXCEPTION 'Cannot change contact_id on an existing lead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_contact_immutable
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION prevent_contact_id_change();
```

### Migration: Add contact_id to tasks

```sql
-- Add optional contact_id to tasks for contact-level tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Backfill contact_id from lead's contact
UPDATE tasks t SET contact_id = l.contact_id
FROM leads l WHERE t.lead_id = l.id AND t.contact_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
```

## Service Layer Design

### Contact Service (`lib/services/contact-service.ts`)

```typescript
interface ContactService {
  // Resolution
  resolveContact(tenantId: string, phone: string, data: ContactCreateData): Promise<Contact>;
  findByPhone(tenantId: string, normalizedPhone: string): Promise<Contact | null>;
  
  // CRUD
  createContact(data: ContactCreateData): Promise<Contact>;
  updateContact(id: string, data: Partial<ContactUpdateData>): Promise<Contact>;
  getContact(id: string): Promise<ContactWithLeads>;
  
  // Relationship
  updateLastInbound(contactId: string): Promise<void>;
  updateLatestSource(contactId: string, source: string): Promise<void>;
  
  // PDPA
  exportContactData(contactId: string): Promise<PDPAExport>;
  anonymiseContact(contactId: string): Promise<void>;
  flagExpiredRetention(): Promise<Contact[]>;
  
  // Search
  searchContacts(tenantId: string, query: string): Promise<ContactSearchResult[]>;
}
```

### Lead Service (`lib/services/lead-service.ts`)

```typescript
interface LeadService {
  // Creation with contact resolution
  createLead(data: LeadCreateData): Promise<{ lead: Lead; contact: Contact; duplicateWarning?: DuplicateWarning }>;
  
  // Duplicate detection
  checkDuplicates(contactId: string, dealType: string, leadCategory: string): Promise<DuplicateWarning | null>;
  
  // Lifecycle
  updateStage(leadId: string, stage: string, closeReason?: string): Promise<Lead>;
  attachToExistingLead(leadId: string, activityData: any): Promise<void>;
  
  // Queries
  getLeadsByContact(contactId: string): Promise<Lead[]>;
  getActiveLeadsByContact(contactId: string): Promise<Lead[]>;
}

interface DuplicateWarning {
  existingContact: Contact;
  pastLeadsCount: number;
  closedDealsCount: number;
  activeLeadsCount: number;
  potentialDuplicate?: Lead; // Active lead with same category within 14 days
}
```

### Duplicate Detection Engine (`lib/services/duplicate-detection.ts`)

```typescript
interface DuplicateDetectionEngine {
  // Check if a new lead would be a potential duplicate
  detect(params: {
    contactId: string;
    leadCategory: string;
    dealType: string;
    originListingId?: string;
  }): Promise<DuplicateDetectionResult>;
}

interface DuplicateDetectionResult {
  isDuplicate: boolean;
  reason?: string;
  existingLead?: Lead;
  contextBanner: {
    pastLeadsCount: number;
    closedDealsCount: number;
    activeLeadsCount: number;
  };
}
```

## UI Components

### Contact Profile Page (`/contacts/[id]/page.tsx`)

Sections:
1. **Header**: Full name, phone, email, contact_status badge, primary agent
2. **Identity Panel**: Nationality, PR status, LinkedIn, channel preference
3. **Consent Panel**: WhatsApp opt-in, consent timestamp, source, retention expiry
4. **Leads List**: All linked leads in reverse chronological order with status badges
5. **Deals Summary**: Aggregated deals from all leads
6. **Messages Timeline**: Full message history with lead filter dropdown
7. **Tasks**: All tasks across leads + contact-level tasks
8. **Relationship**: Tags, long-term notes

### Lead Card Page (enhanced `/leads/[id]/page.tsx`)

Additions to existing lead detail:
1. **Lead Title + Category badge** in header
2. **Parent Contact link** for navigation to contact profile
3. **Lead-scoped timeline** (only events for this lead)
4. **is_active indicator** with closed_at/close_reason when applicable

### Duplicate Detection Banner Component

```typescript
// Shown during lead creation when existing contact found
interface DuplicateBannerProps {
  contact: Contact;
  pastLeadsCount: number;
  closedDealsCount: number;
  activeLeadsCount: number;
  potentialDuplicate?: Lead;
  onCreateNew: () => void;
  onAttachToExisting: (leadId: string) => void;
  onMerge: (leadId: string) => void;
}
```

## Correctness Properties

### Property 1: Contact Resolution Idempotence
For any sequence of lead creations with the same normalized phone number within a tenant, the number of contact records for that phone number remains exactly 1.

### Property 2: Lead-Contact FK Integrity
For all leads in the system, the contact_id references a valid, existing contact record within the same tenant.

### Property 3: is_active Invariant
For all leads, is_active is true if and only if the lead's status is not in the set {closed_won, closed_lost}.

### Property 4: Contact Immutability on Leads
For any lead, once created, the contact_id field cannot be changed by any update operation.

### Property 5: Duplicate Detection Consistency
For any contact with an active lead of category C created within the last 14 days, creating a new lead with the same category C for that contact triggers a duplicate warning.

### Property 6: PDPA Anonymisation Completeness
After anonymisation of a contact, none of the PII fields (full_name, phone, email, nationality, pr_status, linkedin_url) contain their original values, and all linked message bodies are anonymised.

### Property 7: Message Scoping Correctness
Messages displayed on a Lead Card View are a subset of messages displayed on the parent Contact Profile View. Specifically, Lead Card messages = Contact messages WHERE lead_id = current lead.

### Property 8: Lead Lifecycle Timestamps
For all leads: opened_at is always set and equals created_at. If is_active is false, then closed_at is set and closed_at >= opened_at.

### Property 9: Contact Survival
Closing or deleting all leads for a contact does not delete the contact record itself (contact exists independently of leads).

### Property 10: Multiple Active Leads Independence
Updating the stage, urgency, or qualification of one lead does not affect any other lead belonging to the same contact.

## File Structure

```
lib/
  services/
    contact-service.ts        # Contact CRUD, resolution, PDPA operations
    lead-service.ts           # Lead creation with contact resolution
    duplicate-detection.ts    # Duplicate detection engine
  types/
    contact.ts                # Contact type definitions
    lead.ts                   # Enhanced lead type definitions
app/(dashboard)/
  contacts/
    [id]/
      page.tsx                # Contact Profile View
      contact-leads-list.tsx  # Linked leads component
      contact-messages.tsx    # Messages with lead filter
      contact-timeline.tsx    # Aggregated timeline
  leads/
    [id]/
      page.tsx                # Enhanced Lead Card (add title, category, parent link)
    new/
      page.tsx                # Enhanced with duplicate detection banner
      duplicate-banner.tsx    # Duplicate detection UI component
supabase/
  migrations/
    YYYYMMDD_contact_lead_model.sql  # Schema migration
```

## Migration Strategy

1. **Schema migration** runs first — adds columns with defaults, backfills data
2. **No breaking changes** — existing lead creation flows continue to work; new fields are optional or have defaults
3. **Gradual UI rollout** — Contact Profile View is a new page; Lead Card enhancements are additive
4. **Backfill** — Existing leads get `is_active`, `opened_at`, `lead_category` populated from current data

## Testing Strategy

- **Property-based tests**: Contact resolution idempotence, is_active invariant, contact immutability, duplicate detection, PDPA anonymisation completeness
- **Integration tests**: Full lead creation flow with contact resolution, stage transitions with lifecycle field updates, PDPA export/delete cascade
- **Component tests**: Contact Profile View rendering, Lead Card View rendering, Duplicate Detection Banner interactions
