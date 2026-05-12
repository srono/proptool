import type { SupabaseClient } from '@supabase/supabase-js';
import type { Contact, Lead, PDPAExport } from '@agentos/shared';

// --- PDPA Compliance Service ---

/**
 * Export all personal data for a contact (PDPA data subject access request).
 *
 * Gathers: contact record, all linked leads, messages, tasks,
 * buyer_requirements, viewings (via lead_ids), and deals (via lead_ids).
 *
 * Validates: Requirements 11.1
 */
export async function exportContactData(
  supabase: SupabaseClient,
  contactId: string
): Promise<PDPAExport> {
  // 1. Fetch the contact record
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (contactError) {
    console.error('[PDPAService] exportContactData contact error:', contactError);
    throw new Error(`Failed to fetch contact: ${contactError.message}`);
  }

  // 2. Fetch all linked leads
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (leadsError) {
    console.error('[PDPAService] exportContactData leads error:', leadsError);
    throw new Error(`Failed to fetch leads: ${leadsError.message}`);
  }

  const leadIds = (leads ?? []).map((l: Lead) => l.id);

  // 3. Fetch all messages for this contact
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, lead_id, direction, channel, body, media_url, sent_at')
    .eq('contact_id', contactId)
    .order('sent_at', { ascending: false });

  if (messagesError) {
    console.error('[PDPAService] exportContactData messages error:', messagesError);
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }

  // 4. Fetch all tasks for this contact
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, lead_id, title, due_at, completed_at, priority, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (tasksError) {
    console.error('[PDPAService] exportContactData tasks error:', tasksError);
    throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  }

  // 5. Fetch buyer_requirements for this contact
  const { data: buyerRequirements, error: brError } = await supabase
    .from('buyer_requirements')
    .select('id, lead_id, districts, property_types, budget_min, budget_max, bedrooms_min, deal_type, timeline')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (brError) {
    console.error('[PDPAService] exportContactData buyer_requirements error:', brError);
    throw new Error(`Failed to fetch buyer requirements: ${brError.message}`);
  }

  // 6. Fetch viewings via lead_ids
  let viewings: PDPAExport['viewings'] = [];
  if (leadIds.length > 0) {
    const { data: viewingsData, error: viewingsError } = await supabase
      .from('viewings')
      .select('id, lead_id, listing_id, scheduled_at, status, attended, feedback_notes')
      .in('lead_id', leadIds)
      .order('scheduled_at', { ascending: false });

    if (viewingsError) {
      console.error('[PDPAService] exportContactData viewings error:', viewingsError);
      throw new Error(`Failed to fetch viewings: ${viewingsError.message}`);
    }

    viewings = viewingsData ?? [];
  }

  // 7. Fetch deals via lead_ids
  let deals: PDPAExport['deals'] = [];
  if (leadIds.length > 0) {
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('id, lead_id, deal_type, status, agreed_price, commission_amount, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('[PDPAService] exportContactData deals error:', dealsError);
      throw new Error(`Failed to fetch deals: ${dealsError.message}`);
    }

    deals = dealsData ?? [];
  }

  return {
    contact: contact as Contact,
    leads: (leads ?? []) as Lead[],
    messages: messages ?? [],
    tasks: tasks ?? [],
    buyer_requirements: buyerRequirements ?? [],
    viewings,
    deals,
    exported_at: new Date().toISOString(),
  };
}

/**
 * Anonymise a contact's personally identifiable information.
 *
 * Replaces PII fields with anonymised placeholders:
 * - full_name → "[ANONYMISED]"
 * - phone → "[ANONYMISED]"
 * - email → null
 * - nationality → null
 * - pr_status → null
 * - linkedin_url → null
 *
 * Sets contact_status to "archived" and clears data_retention_expiry.
 *
 * Also anonymises all linked message bodies and clears media_url.
 *
 * CRITICAL: Does NOT delete lead, deal, or task records — only anonymises
 * PII on the contact and message bodies.
 *
 * Validates: Requirements 11.2, 11.3, 11.4, 11.5
 */
export async function anonymiseContact(
  supabase: SupabaseClient,
  contactId: string
): Promise<void> {
  // 1. Anonymise the contact record PII fields
  const { error: contactError } = await supabase
    .from('contacts')
    .update({
      full_name: '[ANONYMISED]',
      phone: '[ANONYMISED]',
      email: null,
      nationality: null,
      pr_status: null,
      linkedin_url: null,
      contact_status: 'archived',
      data_retention_expiry: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  if (contactError) {
    console.error('[PDPAService] anonymiseContact contact error:', contactError);
    throw new Error(`Failed to anonymise contact: ${contactError.message}`);
  }

  // 2. Anonymise all linked messages (replace body, clear media_url)
  await anonymiseContactMessages(supabase, contactId);

  // NOTE: Lead, deal, and task records are intentionally preserved (not deleted).
  // This preserves aggregate business data with anonymised references.
}

/**
 * Anonymise all messages linked to a contact.
 *
 * Sets body to "[anonymised]" and media_url to null for all messages
 * where contact_id matches.
 *
 * Validates: Requirements 11.3
 */
export async function anonymiseContactMessages(
  supabase: SupabaseClient,
  contactId: string
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({
      body: '[anonymised]',
      media_url: null,
    })
    .eq('contact_id', contactId);

  if (error) {
    console.error('[PDPAService] anonymiseContactMessages error:', error);
    throw new Error(`Failed to anonymise messages: ${error.message}`);
  }
}

/**
 * Flag contacts whose data retention has expired and are not yet archived.
 *
 * Queries contacts where data_retention_expiry < NOW() and contact_status != 'archived'.
 * These contacts should be reviewed by their primary agent before anonymisation.
 *
 * Validates: Requirements 11.6
 */
export async function flagExpiredRetention(
  supabase: SupabaseClient
): Promise<Contact[]> {
  const now = new Date().toISOString();

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .lt('data_retention_expiry', now)
    .neq('contact_status', 'archived')
    .order('data_retention_expiry', { ascending: true });

  if (error) {
    console.error('[PDPAService] flagExpiredRetention error:', error);
    throw new Error(`Failed to query expired retention contacts: ${error.message}`);
  }

  return (contacts ?? []) as Contact[];
}
