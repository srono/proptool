export type LeadType = 'buyer' | 'seller' | 'landlord' | 'tenant' | 'co_broke_agent';
export type ConsentSource = 'form' | 'whatsapp' | 'manual';

export interface Contact {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  whatsapp_optin: boolean;
  consent_given_at: string | null;
  consent_source: ConsentSource | null;
  source: string;
  lead_type: LeadType;
  cea_number: string | null;
  nationality: string | null;
  pr_status: string | null;
  linkedin_url: string | null;
  data_retention_expiry: string | null;
  created_at: string;
  updated_at: string;
}
