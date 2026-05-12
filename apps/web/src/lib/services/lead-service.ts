import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Contact,
  Lead,
  LeadSource,
  DealType,
  Urgency,
  LeadCategory,
  PipelineStage,
  DuplicateDetectionResult,
} from '@agentos/shared';
import { resolveContact, updateLatestSource } from './contact-service';
import type { ContactCreateData } from './contact-service';

// --- Types for service inputs ---

export interface LeadCreateData {
  tenant_id: string;
  phone: string;
  full_name: string;
  email?: string | null;
  source: LeadSource;
  deal_type: DealType;
  urgency?: Urgency;
  lead_category?: LeadCategory;
  lead_title?: string | null;
  origin_listing_id?: string | null;
  ad_campaign_id?: string | null;
  ad_set_id?: string | null;
  ad_creative_id?: string | null;
  ad_purpose?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  move_in_by?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
  nationality?: string | null;
  pr_status?: string | null;
  linkedin_url?: string | null;
  whatsapp_optin?: boolean;
  consent_source?: string | null;
  consent_given_at?: string | null;
  primary_agent_id?: string | null;
}

export interface LeadCreateResult {
  lead: Lead;
  contact: Contact;
  duplicateDetection: DuplicateDetectionResult;
}

// Terminal stages that close a lead
const TERMINAL_STAGES: PipelineStage[] = ['closed_won', 'closed_lost'];

// --- Lead Service ---

/**
 * Create a new lead with full contact resolution and duplicate detection.
 *
 * Flow:
 * 1. Resolve contact by normalized phone (reuse existing or create new)
 * 2. Update contact's latest source
 * 3. Check for duplicate leads (same category within 14 days)
 * 4. Create the lead with is_active=true and opened_at=now
 *
 * Returns the created lead, resolved contact, and duplicate detection result.
 */
export async function createLead(
  supabase: SupabaseClient,
  data: LeadCreateData
): Promise<LeadCreateResult> {
  // 1. Resolve contact (find existing or create new)
  const contactData: ContactCreateData = {
    tenant_id: data.tenant_id,
    full_name: data.full_name,
    phone: data.phone,
    email: data.email ?? null,
    source: data.source,
    nationality: data.nationality ?? null,
    pr_status: data.pr_status ?? null,
    linkedin_url: data.linkedin_url ?? null,
    whatsapp_optin: data.whatsapp_optin ?? false,
    consent_source: data.consent_source ?? null,
    consent_given_at: data.consent_given_at ?? null,
    primary_agent_id: data.primary_agent_id ?? null,
  };

  const contact = await resolveContact(
    supabase,
    data.tenant_id,
    data.phone,
    contactData
  );

  // 2. Update contact's latest source
  await updateLatestSource(supabase, contact.id, data.source);

  // 3. Check for duplicates
  const duplicateDetection = await checkDuplicates(
    supabase,
    contact.id,
    data.lead_category ?? 'buyer',
    data.deal_type
  );

  // 4. Create the lead with is_active=true and opened_at=now
  const now = new Date().toISOString();

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: data.tenant_id,
      contact_id: contact.id,
      assigned_to: data.assigned_to ?? null,
      status: 'new_lead' as PipelineStage,
      source: data.source,
      deal_type: data.deal_type,
      urgency: data.urgency ?? 'warm',
      lead_title: data.lead_title ?? null,
      lead_category: data.lead_category ?? 'buyer',
      is_active: true,
      opened_at: now,
      closed_at: null,
      close_reason: null,
      origin_listing_id: data.origin_listing_id ?? null,
      duplicate_of_lead_id: duplicateDetection.existingLead?.id ?? null,
      ad_campaign_id: data.ad_campaign_id ?? null,
      ad_set_id: data.ad_set_id ?? null,
      ad_creative_id: data.ad_creative_id ?? null,
      ad_purpose: data.ad_purpose ?? null,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max ?? null,
      move_in_by: data.move_in_by ?? null,
      notes: data.notes ?? null,
      created_at: now,
      last_activity_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[LeadService] createLead error:', error);
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  return {
    lead: lead!,
    contact,
    duplicateDetection,
  };
}

/**
 * Update a lead's pipeline stage.
 * Requires close_reason when moving to terminal stages (closed_won, closed_lost).
 * The database trigger handles setting is_active=false and closed_at automatically.
 */
export async function updateStage(
  supabase: SupabaseClient,
  leadId: string,
  stage: PipelineStage,
  closeReason?: string
): Promise<Lead> {
  // Validate: close_reason is required for terminal stages
  if (TERMINAL_STAGES.includes(stage) && !closeReason) {
    throw new Error(
      `close_reason is required when moving to ${stage}. Provide a reason for closing the lead.`
    );
  }

  const updateData: Record<string, unknown> = {
    status: stage,
    last_activity_at: new Date().toISOString(),
  };

  // Set close_reason for terminal stages
  if (TERMINAL_STAGES.includes(stage)) {
    updateData.close_reason = closeReason;
  }

  // Clear close_reason when reopening (moving away from terminal)
  if (!TERMINAL_STAGES.includes(stage)) {
    updateData.close_reason = null;
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)
    .select()
    .single();

  if (error) {
    console.error('[LeadService] updateStage error:', error);
    throw new Error(`Failed to update lead stage: ${error.message}`);
  }

  return lead!;
}

/**
 * Attach activity data to an existing lead without creating a new lead.
 * Used when an agent chooses "attach to existing" during duplicate detection.
 * Updates the lead's last_activity_at and appends notes if provided.
 */
export async function attachToExistingLead(
  supabase: SupabaseClient,
  leadId: string,
  activityData: {
    notes?: string;
    source?: string;
    ad_campaign_id?: string;
    ad_set_id?: string;
    ad_creative_id?: string;
  }
): Promise<Lead> {
  const now = new Date().toISOString();

  // Fetch current lead to append notes
  const { data: currentLead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (fetchError) {
    console.error('[LeadService] attachToExistingLead fetch error:', fetchError);
    throw new Error(`Failed to fetch lead: ${fetchError.message}`);
  }

  const updateData: Record<string, unknown> = {
    last_activity_at: now,
  };

  // Append notes if provided
  if (activityData.notes) {
    const existingNotes = currentLead?.notes ?? '';
    const separator = existingNotes ? '\n---\n' : '';
    updateData.notes = `${existingNotes}${separator}[${now}] ${activityData.notes}`;
  }

  // Update ad tracking if provided (latest source wins)
  if (activityData.ad_campaign_id) {
    updateData.ad_campaign_id = activityData.ad_campaign_id;
  }
  if (activityData.ad_set_id) {
    updateData.ad_set_id = activityData.ad_set_id;
  }
  if (activityData.ad_creative_id) {
    updateData.ad_creative_id = activityData.ad_creative_id;
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)
    .select()
    .single();

  if (error) {
    console.error('[LeadService] attachToExistingLead error:', error);
    throw new Error(`Failed to attach to existing lead: ${error.message}`);
  }

  return lead!;
}

/**
 * Get all leads for a contact in reverse chronological order (newest first).
 */
export async function getLeadsByContact(
  supabase: SupabaseClient,
  contactId: string
): Promise<Lead[]> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[LeadService] getLeadsByContact error:', error);
    throw new Error(`Failed to fetch leads for contact: ${error.message}`);
  }

  return leads ?? [];
}

/**
 * Get only active leads (is_active=true) for a contact in reverse chronological order.
 */
export async function getActiveLeadsByContact(
  supabase: SupabaseClient,
  contactId: string
): Promise<Lead[]> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[LeadService] getActiveLeadsByContact error:', error);
    throw new Error(`Failed to fetch active leads for contact: ${error.message}`);
  }

  return leads ?? [];
}

// --- Duplicate Detection ---

/**
 * Check for potential duplicate leads for a contact.
 * A duplicate is detected when:
 * - The contact has an active lead with the same lead_category
 * - That lead was created within the past 14 days
 *
 * Also builds a context banner with lead history counts.
 */
export async function checkDuplicates(
  supabase: SupabaseClient,
  contactId: string,
  leadCategory: string,
  dealType: string
): Promise<DuplicateDetectionResult> {
  // Fetch all leads for this contact to build context
  const { data: allLeads, error: allLeadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (allLeadsError) {
    console.error('[LeadService] checkDuplicates error:', allLeadsError);
    // Return safe default — no duplicate detected
    return {
      isDuplicate: false,
      contextBanner: {
        pastLeadsCount: 0,
        closedDealsCount: 0,
        activeLeadsCount: 0,
      },
    };
  }

  const leads = allLeads ?? [];

  // Build context banner counts
  const pastLeadsCount = leads.length;
  const closedDealsCount = leads.filter(
    (l) => l.status === 'closed_won'
  ).length;
  const activeLeadsCount = leads.filter((l) => l.is_active === true).length;

  // Check for duplicate: active lead with same category created within 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const potentialDuplicate = leads.find(
    (l) =>
      l.is_active === true &&
      l.lead_category === leadCategory &&
      new Date(l.created_at) >= fourteenDaysAgo
  );

  if (potentialDuplicate) {
    return {
      isDuplicate: true,
      reason: `Active lead with same category "${leadCategory}" created within the past 14 days`,
      existingLead: potentialDuplicate as Lead,
      contextBanner: {
        pastLeadsCount,
        closedDealsCount,
        activeLeadsCount,
      },
    };
  }

  return {
    isDuplicate: false,
    contextBanner: {
      pastLeadsCount,
      closedDealsCount,
      activeLeadsCount,
    },
  };
}


