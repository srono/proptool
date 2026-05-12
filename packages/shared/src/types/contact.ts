import type { Lead } from './lead';

export type LeadType = 'buyer' | 'seller' | 'landlord' | 'tenant' | 'co_broke_agent';
export type ConsentSource = 'form' | 'whatsapp' | 'manual';
export type ContactStatus = 'active' | 'inactive' | 'archived' | 'do_not_contact';
export type ChannelPreference = 'whatsapp' | 'sms' | 'email' | 'phone';

/**
 * Contact represents a permanent person-level record storing identity,
 * communication details, consent, and long-term relationship context.
 */
export interface Contact {
  // Identity fields
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  nationality: string | null;
  pr_status: string | null;
  linkedin_url: string | null;

  // Consent and compliance fields
  whatsapp_optin: boolean;
  consent_given_at: string | null;
  consent_source: ConsentSource | null;
  data_retention_expiry: string | null;

  // Relationship management fields
  primary_agent_id: string | null;
  contact_status: ContactStatus;
  last_contacted_at: string | null;
  last_inbound_at: string | null;
  source_first: string | null;
  source_latest: string | null;
  channel_preference: ChannelPreference | null;
  relationship_tags: string[];

  // Legacy fields (kept for backward compatibility)
  source: string;
  lead_type: LeadType;
  cea_number: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Contact with all linked leads included.
 * Used for the Contact Profile View.
 */
export interface ContactWithLeads extends Contact {
  leads: Lead[];
}

/**
 * Contact search result including active leads summary.
 * Used when searching contacts by name or phone.
 */
export interface ContactSearchResult {
  contact: Contact;
  active_leads_count: number;
  active_leads: Lead[];
}

/**
 * PDPA data export covering all exportable data for a contact.
 * Used for Singapore PDPA compliance data subject access requests.
 */
export interface PDPAExport {
  contact: Contact;
  leads: Lead[];
  messages: Array<{
    id: string;
    lead_id: string | null;
    direction: string;
    channel: string;
    body: string;
    media_url: string | null;
    sent_at: string;
  }>;
  tasks: Array<{
    id: string;
    lead_id: string | null;
    title: string;
    due_at: string;
    completed_at: string | null;
    priority: string;
    created_at: string;
  }>;
  buyer_requirements: Array<{
    id: string;
    lead_id: string;
    districts: string[];
    property_types: string[];
    budget_min: number | null;
    budget_max: number | null;
    bedrooms_min: number | null;
    deal_type: string | null;
    timeline: string | null;
  }>;
  viewings: Array<{
    id: string;
    lead_id: string;
    listing_id: string;
    scheduled_at: string;
    status: string;
    attended: boolean | null;
    feedback_notes: string | null;
  }>;
  deals: Array<{
    id: string;
    lead_id: string;
    deal_type: string;
    status: string;
    agreed_price: number | null;
    commission_amount: number | null;
    created_at: string;
  }>;
  exported_at: string;
}
