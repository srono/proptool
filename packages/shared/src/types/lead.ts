export type LeadSource =
  | 'facebook_ad'
  | 'instagram_ad'
  | 'portal'
  | 'whatsapp'
  | 'referral'
  | 'open_house'
  | 'web_form'
  | 'manual';

export type DealType = 'sale' | 'resale' | 'rental' | 'landlord_rep' | 'tenant_rep';
export type Urgency = 'hot' | 'warm' | 'cold';
export type ResidencyStatus = 'citizen' | 'pr' | 'ep' | 'other';
export type PropertyOwnership = 'none' | 'hdb' | 'private' | 'multiple';
export type TimelineDeclared = '0_3mo' | '3_6mo' | '6_12mo' | 'exploring';

export type PipelineStage =
  | 'new_lead'
  | 'contacted'
  | 'qualified'
  | 'viewing_booked'
  | 'viewing_done'
  | 'negotiating'
  | 'otp_loi_issued'
  | 'closed_won'
  | 'closed_lost'
  | 'nurture';

export interface Lead {
  id: string;
  tenant_id: string;
  contact_id: string;
  assigned_to: string | null;
  status: PipelineStage;
  source: LeadSource;
  ad_campaign_id: string | null;
  ad_set_id: string | null;
  ad_creative_id: string | null;
  ad_purpose: string | null;
  deal_type: DealType;
  urgency: Urgency;
  budget_min: number | null;
  budget_max: number | null;
  move_in_by: string | null;
  notes: string | null;

  // Qualification fields
  residency_status: ResidencyStatus | null;
  property_ownership: PropertyOwnership | null;
  eligibility_risk: boolean;
  eligibility_flag_reason: string | null;
  intent_score: number | null; // 1-5
  time_on_form_seconds: number | null;
  timeline_declared: TimelineDeclared | null;

  // Verification fields
  paynow_verified: boolean;
  paynow_name_match: boolean | null;
  paynow_registered_name: string | null;
  verification_score: number | null; // 1-3 (low/medium/high)
  pre_viewing_checklist: PreViewingChecklist | null;

  created_at: string;
  last_activity_at: string;
}

export interface PreViewingChecklist {
  residency_confirmed: boolean;
  eligibility_confirmed: boolean;
  financing_discussed: boolean;
  existing_property_understood: boolean;
  decision_maker_confirmed: boolean;
  timeline_genuine: boolean;
  paynow_verified: boolean;
}

export interface BuyerRequirement {
  id: string;
  tenant_id: string;
  contact_id: string;
  lead_id: string;
  districts: string[]; // D01-D28
  property_types: string[];
  hdb_types: string[];
  tenure_preference: string | null;
  budget_min: number | null;
  budget_max: number | null;
  min_sqft: number | null;
  max_sqft: number | null;
  bedrooms_min: number | null;
  deal_type: DealType | null;
  timeline: string | null;
  additional_notes: string | null;
}
