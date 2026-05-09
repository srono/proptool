-- PropAgent SG — Initial Database Schema
-- Multi-tenant with Row-Level Security (RLS)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cea_registration_number TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'team')),
  subscription_status TEXT NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings_json JSONB NOT NULL DEFAULT '{
    "data_retention_years": 5,
    "daily_digest_time": "08:30",
    "default_currency": "SGD"
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'agent')),
  avatar_url TEXT,
  cea_licence_number TEXT,
  cea_licence_expiry DATE,
  agency_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  whatsapp_optin BOOLEAN NOT NULL DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  consent_source TEXT CHECK (consent_source IN ('form', 'whatsapp', 'manual')),
  source TEXT NOT NULL DEFAULT 'manual',
  lead_type TEXT NOT NULL DEFAULT 'buyer' CHECK (lead_type IN ('buyer', 'seller', 'landlord', 'tenant', 'co_broke_agent')),
  cea_number TEXT,
  nationality TEXT,
  pr_status TEXT,
  linkedin_url TEXT,
  data_retention_expiry DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_phone ON contacts(tenant_id, phone);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'new_lead' CHECK (status IN (
    'new_lead', 'contacted', 'qualified', 'viewing_booked', 'viewing_done',
    'negotiating', 'otp_loi_issued', 'closed_won', 'closed_lost', 'nurture'
  )),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'facebook_ad', 'instagram_ad', 'portal', 'whatsapp', 'referral', 'open_house', 'web_form', 'manual'
  )),
  ad_campaign_id TEXT,
  ad_set_id TEXT,
  ad_creative_id TEXT,
  ad_purpose TEXT,
  deal_type TEXT NOT NULL DEFAULT 'sale' CHECK (deal_type IN ('sale', 'resale', 'rental', 'landlord_rep', 'tenant_rep')),
  urgency TEXT NOT NULL DEFAULT 'warm' CHECK (urgency IN ('hot', 'warm', 'cold')),
  budget_min NUMERIC,
  budget_max NUMERIC,
  move_in_by DATE,
  notes TEXT,

  -- Qualification fields
  residency_status TEXT CHECK (residency_status IN ('citizen', 'pr', 'ep', 'other')),
  property_ownership TEXT CHECK (property_ownership IN ('none', 'hdb', 'private', 'multiple')),
  eligibility_risk BOOLEAN NOT NULL DEFAULT false,
  eligibility_flag_reason TEXT,
  intent_score SMALLINT CHECK (intent_score BETWEEN 1 AND 5),
  time_on_form_seconds INTEGER,
  timeline_declared TEXT CHECK (timeline_declared IN ('0_3mo', '3_6mo', '6_12mo', 'exploring')),

  -- Verification fields
  paynow_verified BOOLEAN NOT NULL DEFAULT false,
  paynow_name_match BOOLEAN,
  paynow_registered_name TEXT,
  verification_score SMALLINT CHECK (verification_score BETWEEN 1 AND 3),
  pre_viewing_checklist JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_contact ON leads(contact_id);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_last_activity ON leads(tenant_id, last_activity_at DESC);

-- ============================================================
-- BUYER REQUIREMENTS
-- ============================================================
CREATE TABLE buyer_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  districts TEXT[] DEFAULT '{}',
  property_types TEXT[] DEFAULT '{}',
  hdb_types TEXT[] DEFAULT '{}',
  tenure_preference TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  min_sqft NUMERIC,
  max_sqft NUMERIC,
  bedrooms_min SMALLINT,
  deal_type TEXT,
  timeline TEXT,
  additional_notes TEXT
);

CREATE INDEX idx_buyer_req_tenant ON buyer_requirements(tenant_id);
CREATE INDEX idx_buyer_req_lead ON buyer_requirements(lead_id);

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  district TEXT NOT NULL, -- D01-D28
  property_type TEXT NOT NULL CHECK (property_type IN ('hdb', 'condo', 'landed', 'commercial')),
  hdb_type TEXT CHECK (hdb_type IN ('2room', '3room', '4room', '5room', 'executive')),
  tenure TEXT NOT NULL CHECK (tenure IN ('freehold', '99yr', '999yr')),
  floor_area_sqft NUMERIC NOT NULL,
  asking_price NUMERIC,
  psf NUMERIC GENERATED ALWAYS AS (
    CASE WHEN floor_area_sqft > 0 AND asking_price IS NOT NULL
      THEN ROUND(asking_price / floor_area_sqft, 2)
      ELSE NULL
    END
  ) STORED,
  asking_rental NUMERIC,
  listing_status TEXT NOT NULL DEFAULT 'draft' CHECK (listing_status IN ('draft', 'live', 'under_offer', 'sold', 'rented', 'withdrawn')),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'rental')),
  floor TEXT,
  unit_number TEXT,
  completion_year INTEGER,
  media_urls TEXT[] DEFAULT '{}',
  description TEXT,
  is_exclusive BOOLEAN NOT NULL DEFAULT false,
  exclusivity_expiry DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_tenant ON listings(tenant_id);
CREATE INDEX idx_listings_district ON listings(tenant_id, district);
CREATE INDEX idx_listings_status ON listings(tenant_id, listing_status);
CREATE INDEX idx_listings_type ON listings(tenant_id, property_type, listing_type);

-- ============================================================
-- VIEWINGS
-- ============================================================
CREATE TABLE viewings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_mins INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  attended BOOLEAN,
  feedback_notes TEXT,
  buyer_interest_level SMALLINT CHECK (buyer_interest_level BETWEEN 1 AND 5),
  objections TEXT,
  seller_updated BOOLEAN NOT NULL DEFAULT false,
  next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_viewings_tenant ON viewings(tenant_id);
CREATE INDEX idx_viewings_scheduled ON viewings(tenant_id, scheduled_at);
CREATE INDEX idx_viewings_lead ON viewings(lead_id);

-- ============================================================
-- DEALS
-- ============================================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id),
  deal_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'negotiating' CHECK (status IN (
    'negotiating', 'otp_issued', 'otp_signed', 'exercised', 'completed', 'fallen_through'
  )),
  offer_price NUMERIC,
  agreed_price NUMERIC,
  commission_pct NUMERIC,
  commission_amount NUMERIC,
  co_broke_agent_id UUID REFERENCES contacts(id),
  co_broke_split_pct NUMERIC,
  otp_date DATE,
  exercise_deadline DATE,
  completion_date DATE,
  documents TEXT[] DEFAULT '{}',
  notes TEXT,
  closed_lost_reason TEXT CHECK (closed_lost_reason IN ('price', 'location', 'timing', 'co_broke_lost', 'client_changed_mind', 'other')),
  commission_payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (commission_payment_status IN ('unpaid', 'partial', 'received')),
  commission_received_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_tenant ON deals(tenant_id);
CREATE INDEX idx_deals_status ON deals(tenant_id, status);
CREATE INDEX idx_deals_lead ON deals(lead_id);

-- ============================================================
-- MESSAGES (WhatsApp communication log)
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  wa_number_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email', 'note')),
  body TEXT NOT NULL,
  media_url TEXT,
  wa_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_contact ON messages(contact_id, sent_at DESC);
CREATE INDEX idx_messages_lead ON messages(lead_id);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  deal_id UUID REFERENCES deals(id),
  assigned_to UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_due ON tasks(tenant_id, due_at) WHERE completed_at IS NULL;
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to) WHERE completed_at IS NULL;

-- ============================================================
-- CAMPAIGNS (Meta ad campaigns)
-- ============================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  page_id TEXT NOT NULL,
  ad_account_id TEXT,
  campaign_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  leads_count INTEGER NOT NULL DEFAULT 0,
  budget NUMERIC,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);

-- ============================================================
-- STAMP DUTY RATES (Rules engine — admin-editable)
-- ============================================================
CREATE TABLE stamp_duty_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duty_type TEXT NOT NULL CHECK (duty_type IN ('BSD', 'ABSD')),
  buyer_profile TEXT NOT NULL CHECK (buyer_profile IN ('citizen', 'pr', 'foreigner', 'entity', 'trust')),
  property_count TEXT NOT NULL CHECK (property_count IN ('1st', '2nd', '3rd_plus')),
  price_band_min NUMERIC NOT NULL DEFAULT 0,
  price_band_max NUMERIC, -- NULL = no upper limit
  rate_pct NUMERIC NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE -- NULL = currently active
);

CREATE INDEX idx_stamp_duty_active ON stamp_duty_rates(duty_type, effective_from)
  WHERE effective_to IS NULL;

-- ============================================================
-- WA NUMBERS (WhatsApp Business numbers per tenant)
-- ============================================================
CREATE TABLE wa_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  bsp_account_id TEXT,
  display_name TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  routing_mode TEXT NOT NULL DEFAULT 'direct' CHECK (routing_mode IN ('direct', 'round_robin', 'availability', 'keyword')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_numbers_tenant ON wa_numbers(tenant_id);

-- Add FK from messages to wa_numbers
ALTER TABLE messages
  ADD CONSTRAINT fk_messages_wa_number
  FOREIGN KEY (wa_number_id) REFERENCES wa_numbers(id);

-- ============================================================
-- ELIGIBILITY RULES (Singapore property purchase matrix)
-- ============================================================
CREATE TABLE eligibility_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_profile TEXT NOT NULL CHECK (buyer_profile IN ('citizen', 'pr', 'foreigner', 'entity', 'trust')),
  property_type TEXT NOT NULL CHECK (property_type IN ('hdb', 'condo', 'landed', 'commercial')),
  property_count TEXT NOT NULL CHECK (property_count IN ('1st', '2nd', '3rd_plus')),
  eligible BOOLEAN NOT NULL,
  restriction_note TEXT,
  absd_rate_pct NUMERIC NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_eligibility_rules ON eligibility_rules(buyer_profile, property_type, property_count);

-- ============================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Enable RLS on all tenant-scoped tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies (tenant isolation)
CREATE POLICY "tenant_isolation" ON contacts FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON leads FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON buyer_requirements FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON listings FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON viewings FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON deals FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON messages FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON tasks FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON campaigns FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_isolation" ON wa_numbers FOR ALL USING (tenant_id = public.get_tenant_id());
CREATE POLICY "users_own_row" ON users FOR ALL USING (id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
