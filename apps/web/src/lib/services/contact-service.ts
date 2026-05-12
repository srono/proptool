import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Contact,
  ContactWithLeads,
  ContactSearchResult,
} from '@agentos/shared';

// --- Types for service inputs ---

export interface ContactCreateData {
  tenant_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  source: string;
  lead_type?: string;
  nationality?: string | null;
  pr_status?: string | null;
  linkedin_url?: string | null;
  whatsapp_optin?: boolean;
  consent_source?: string | null;
  consent_given_at?: string | null;
  channel_preference?: string | null;
  primary_agent_id?: string | null;
}

export interface ContactUpdateData {
  full_name?: string;
  phone?: string;
  email?: string | null;
  nationality?: string | null;
  pr_status?: string | null;
  linkedin_url?: string | null;
  whatsapp_optin?: boolean;
  consent_source?: string | null;
  consent_given_at?: string | null;
  data_retention_expiry?: string | null;
  primary_agent_id?: string | null;
  contact_status?: string;
  channel_preference?: string | null;
  relationship_tags?: string[];
}

// --- Phone normalization ---

/**
 * Normalize a phone number:
 * - Strip all non-digit characters (except leading +)
 * - For Singapore numbers (8 digits), prefix with +65
 * - For numbers starting with 65 and 10 digits long, prefix with +
 * - Otherwise ensure + prefix
 */
export function normalizePhone(raw: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = raw.replace(/[\s\-()]/g, '');

  // If it already starts with +, strip the + and work with digits
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');

  if (digits.startsWith('65') && digits.length === 10) {
    // Singapore number with country code but no +
    return '+' + digits;
  } else if (digits.length === 8 && !digits.startsWith('0')) {
    // Singapore local number (8 digits)
    return '+65' + digits;
  } else if (hasPlus) {
    return '+' + digits;
  } else {
    return '+' + digits;
  }
}

// --- Contact Service ---

/**
 * Resolve a contact by normalized phone number within a tenant.
 * If found, returns the existing contact.
 * If not found, creates a new contact with source_first and source_latest set.
 */
export async function resolveContact(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
  data: ContactCreateData
): Promise<Contact> {
  const normalizedPhone = normalizePhone(phone);

  // Search for existing contact by tenant + normalized phone
  const existing = await findByPhone(supabase, tenantId, normalizedPhone);

  if (existing) {
    return existing;
  }

  // Create new contact with normalized phone
  return createContact(supabase, {
    ...data,
    phone: normalizedPhone,
    tenant_id: tenantId,
  });
}

/**
 * Find a contact by tenant_id and normalized phone number.
 */
export async function findByPhone(
  supabase: SupabaseClient,
  tenantId: string,
  normalizedPhone: string
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('phone', normalizedPhone)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected
    console.error('[ContactService] findByPhone error:', error);
  }

  return data ?? null;
}

/**
 * Create a new contact with source_first and source_latest set from the provided source.
 */
export async function createContact(
  supabase: SupabaseClient,
  data: ContactCreateData
): Promise<Contact> {
  const now = new Date().toISOString();

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id: data.tenant_id,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email ?? null,
      source: data.source,
      lead_type: data.lead_type ?? 'buyer',
      nationality: data.nationality ?? null,
      pr_status: data.pr_status ?? null,
      linkedin_url: data.linkedin_url ?? null,
      whatsapp_optin: data.whatsapp_optin ?? false,
      consent_source: data.consent_source ?? null,
      consent_given_at: data.consent_given_at ?? null,
      channel_preference: data.channel_preference ?? null,
      primary_agent_id: data.primary_agent_id ?? null,
      contact_status: 'active',
      source_first: data.source,
      source_latest: data.source,
      relationship_tags: [],
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('[ContactService] createContact error:', error);
    throw new Error(`Failed to create contact: ${error.message}`);
  }

  return contact!;
}

/**
 * Partial update of a contact record. Sets updated_at automatically.
 */
export async function updateContact(
  supabase: SupabaseClient,
  id: string,
  data: Partial<ContactUpdateData>
): Promise<Contact> {
  const { data: contact, error } = await supabase
    .from('contacts')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ContactService] updateContact error:', error);
    throw new Error(`Failed to update contact: ${error.message}`);
  }

  return contact!;
}

/**
 * Fetch a contact with all linked leads, deals, and messages.
 * Returns a ContactWithLeads object with full relationship data.
 */
export async function getContact(
  supabase: SupabaseClient,
  id: string
): Promise<ContactWithLeads> {
  // Fetch the contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (contactError) {
    console.error('[ContactService] getContact error:', contactError);
    throw new Error(`Failed to fetch contact: ${contactError.message}`);
  }

  // Fetch all linked leads (reverse chronological)
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_id', id)
    .order('created_at', { ascending: false });

  if (leadsError) {
    console.error('[ContactService] getContact leads error:', leadsError);
    throw new Error(`Failed to fetch leads: ${leadsError.message}`);
  }

  return {
    ...contact!,
    leads: leads ?? [],
  } as ContactWithLeads;
}

/**
 * Update the last_inbound_at timestamp for a contact.
 * Called when an inbound message or enquiry is received.
 */
export async function updateLastInbound(
  supabase: SupabaseClient,
  contactId: string
): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({
      last_inbound_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  if (error) {
    console.error('[ContactService] updateLastInbound error:', error);
  }
}

/**
 * Update the source_latest field for a contact.
 * Called when a new lead is created from a new source.
 */
export async function updateLatestSource(
  supabase: SupabaseClient,
  contactId: string,
  source: string
): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({
      source_latest: source,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  if (error) {
    console.error('[ContactService] updateLatestSource error:', error);
  }
}

/**
 * Search contacts by name or phone within a tenant.
 * Returns contacts with their active leads.
 */
export async function searchContacts(
  supabase: SupabaseClient,
  tenantId: string,
  query: string
): Promise<ContactSearchResult[]> {
  // Search by name (ilike) or phone (exact or partial match)
  const searchTerm = `%${query}%`;

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[ContactService] searchContacts error:', error);
    throw new Error(`Failed to search contacts: ${error.message}`);
  }

  if (!contacts || contacts.length === 0) {
    return [];
  }

  // For each contact, fetch active leads
  const results: ContactSearchResult[] = await Promise.all(
    contacts.map(async (contact) => {
      const { data: activeLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return {
        contact: contact as Contact,
        active_leads_count: activeLeads?.length ?? 0,
        active_leads: (activeLeads ?? []) as ContactSearchResult['active_leads'],
      };
    })
  );

  return results;
}
