-- Contact Lead Model — Contacts Enhancement
-- Task 1: Add relationship management fields to the contacts table

-- ============================================================
-- 1.1 ALTER TABLE: Add relationship management columns
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_agent_id UUID REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_first TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_latest TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS channel_preference TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_tags TEXT[] DEFAULT '{}';

-- ============================================================
-- 1.2 CHECK constraint for contact_status enum
-- ============================================================
ALTER TABLE contacts ADD CONSTRAINT chk_contact_status
  CHECK (contact_status IN ('active', 'inactive', 'archived', 'do_not_contact'));

-- ============================================================
-- 1.3 CHECK constraint for channel_preference enum
-- ============================================================
-- Drop the inline CHECK from nurture_playbooks migration if it exists, then add named constraint
DO $$ BEGIN
  ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_channel_preference_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE contacts ADD CONSTRAINT chk_channel_preference
  CHECK (channel_preference IS NULL OR channel_preference IN ('whatsapp', 'sms', 'email', 'phone', 'none'));

-- ============================================================
-- 1.4 Indexes for contact status filtering and primary agent lookup
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(tenant_id, contact_status);
CREATE INDEX IF NOT EXISTS idx_contacts_primary_agent ON contacts(primary_agent_id);

-- ============================================================
-- 1.5 Backfill source_first and source_latest from existing source column
-- ============================================================
UPDATE contacts SET source_first = source, source_latest = source WHERE source_first IS NULL;

-- ============================================================
-- 1.6 Unique constraint on (tenant_id, phone)
-- Already exists in initial schema: UNIQUE(tenant_id, phone)
-- No action needed.
-- ============================================================

-- ============================================================
-- Task 2: Database Schema Migration — Leads Enhancement
-- Add opportunity-lifecycle fields to the existing leads table,
-- create triggers for is_active management and contact_id immutability.
-- ============================================================

-- ============================================================
-- 2.1 Add opportunity-lifecycle columns to leads table
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_title TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_category TEXT NOT NULL DEFAULT 'buyer';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS close_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS origin_listing_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS duplicate_of_lead_id UUID;

-- ============================================================
-- 2.2 CHECK constraint for lead_category enum
-- ============================================================
ALTER TABLE leads ADD CONSTRAINT chk_lead_category
  CHECK (lead_category IN ('buyer', 'seller', 'landlord', 'tenant', 'co_broke', 'nurture'));

-- ============================================================
-- 2.3 FK constraints for origin_listing_id and duplicate_of_lead_id
-- ============================================================
ALTER TABLE leads ADD CONSTRAINT fk_leads_origin_listing
  FOREIGN KEY (origin_listing_id) REFERENCES listings(id);

ALTER TABLE leads ADD CONSTRAINT fk_leads_duplicate_of
  FOREIGN KEY (duplicate_of_lead_id) REFERENCES leads(id);

-- ============================================================
-- 2.4 Trigger function: handle_lead_stage_change()
-- Auto-set is_active=false and closed_at on terminal stages;
-- Auto-set is_active=true and clear closed_at when reopening.
-- ============================================================
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

-- ============================================================
-- 2.5 Trigger function: prevent_contact_id_change()
-- Reject any update that attempts to change contact_id.
-- ============================================================
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

-- ============================================================
-- 2.6 Backfill SQL
-- Set is_active=false for closed leads, set opened_at=created_at,
-- derive lead_category from deal_type.
-- ============================================================
UPDATE leads SET is_active = false WHERE status IN ('closed_won', 'closed_lost');
UPDATE leads SET opened_at = created_at WHERE opened_at IS NULL;
UPDATE leads SET closed_at = last_activity_at WHERE status IN ('closed_won', 'closed_lost') AND closed_at IS NULL;

UPDATE leads SET lead_category = CASE
  WHEN deal_type IN ('sale', 'resale') THEN 'buyer'
  WHEN deal_type = 'rental' THEN 'tenant'
  WHEN deal_type = 'landlord_rep' THEN 'landlord'
  WHEN deal_type = 'tenant_rep' THEN 'tenant'
  ELSE 'buyer'
END WHERE lead_category = 'buyer' AND deal_type != 'sale';

-- ============================================================
-- 2.7 Indexes for leads enhancement
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(contact_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(tenant_id, lead_category);
CREATE INDEX IF NOT EXISTS idx_leads_opened ON leads(tenant_id, opened_at DESC);

-- ============================================================
-- Task 3: Database Schema Migration — Tasks Enhancement
-- Add optional contact_id column to tasks table for contact-level task support.
-- ============================================================

-- ============================================================
-- 3.1 Add contact_id column to tasks table with FK reference to contacts(id)
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- ============================================================
-- 3.2 Add index on tasks(contact_id)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);

-- ============================================================
-- 3.3 Backfill contact_id from lead's contact_id for existing tasks
-- ============================================================
UPDATE tasks t SET contact_id = l.contact_id
FROM leads l WHERE t.lead_id = l.id AND t.contact_id IS NULL;
