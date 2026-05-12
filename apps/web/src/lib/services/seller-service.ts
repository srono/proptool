import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lead } from '@agentos/shared';

// --- Types for service outputs ---

export interface AttachSellerResult {
  success: boolean;
  sellerLead: Lead | null;
  leadCreationError: string | null;
}

// --- Seller Service ---

/**
 * Attach a seller contact to a listing and auto-create a seller lead.
 *
 * Flow:
 * 1. Update the listing's seller_contact_id
 * 2. Check if an active seller lead already exists for this contact + listing
 * 3. If no existing lead, create a new one with lead_category='seller', status='new_lead'
 *
 * If lead creation fails, the listing association is still saved.
 */
export async function attachSeller(
  supabase: SupabaseClient,
  listingId: string,
  contactId: string,
  tenantId: string
): Promise<AttachSellerResult> {
  // 1. Update listing with seller_contact_id
  const { error: updateError } = await supabase
    .from('listings')
    .update({ seller_contact_id: contactId })
    .eq('id', listingId);

  if (updateError) {
    console.error('[SellerService] attachSeller update error:', updateError);
    throw new Error(`Failed to attach seller to listing: ${updateError.message}`);
  }

  // 2. Check for existing active seller lead
  const { data: existingLead, error: lookupError } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .eq('origin_listing_id', listingId)
    .eq('lead_category', 'seller')
    .eq('is_active', true)
    .maybeSingle();

  if (lookupError) {
    console.error('[SellerService] attachSeller lead lookup error:', lookupError);
    return {
      success: true,
      sellerLead: null,
      leadCreationError: `Failed to check existing leads: ${lookupError.message}`,
    };
  }

  // If lead already exists, reuse it
  if (existingLead) {
    return {
      success: true,
      sellerLead: existingLead as Lead,
      leadCreationError: null,
    };
  }

  // 3. Create new seller lead
  const now = new Date().toISOString();

  const { data: newLead, error: createError } = await supabase
    .from('leads')
    .insert({
      tenant_id: tenantId,
      contact_id: contactId,
      status: 'new_lead',
      source: 'manual',
      deal_type: 'sale',
      urgency: 'warm',
      lead_category: 'seller',
      is_active: true,
      opened_at: now,
      origin_listing_id: listingId,
      created_at: now,
      last_activity_at: now,
    })
    .select()
    .single();

  if (createError) {
    console.error('[SellerService] attachSeller lead creation error:', createError);
    return {
      success: true,
      sellerLead: null,
      leadCreationError: `Failed to create seller lead: ${createError.message}`,
    };
  }

  return {
    success: true,
    sellerLead: newLead as Lead,
    leadCreationError: null,
  };
}

/**
 * Remove the seller from a listing by clearing seller_contact_id.
 * Does NOT modify any leads — the seller lead is retained as-is.
 */
export async function removeSeller(
  supabase: SupabaseClient,
  listingId: string
): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ seller_contact_id: null })
    .eq('id', listingId);

  if (error) {
    console.error('[SellerService] removeSeller error:', error);
    throw new Error(`Failed to remove seller from listing: ${error.message}`);
  }
}

/**
 * Change the seller on a listing from one contact to another.
 * Retains the old seller's lead unchanged and creates a new seller lead for the new contact.
 */
export async function changeSeller(
  supabase: SupabaseClient,
  listingId: string,
  newContactId: string,
  tenantId: string
): Promise<AttachSellerResult> {
  // Clear the old seller (lead is retained)
  await removeSeller(supabase, listingId);

  // Attach the new seller (creates new lead if needed)
  return attachSeller(supabase, listingId, newContactId, tenantId);
}

/**
 * Search contacts by name or phone number.
 * Returns up to 20 matching results regardless of existing lead categories.
 */
export async function searchContacts(
  supabase: SupabaseClient,
  query: string
): Promise<Array<{ id: string; full_name: string; phone: string; email: string | null }>> {
  const searchTerm = `%${query}%`;

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, full_name, phone, email')
    .or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
    .limit(20);

  if (error) {
    console.error('[SellerService] searchContacts error:', error);
    throw new Error(`Failed to search contacts: ${error.message}`);
  }

  return contacts ?? [];
}

/**
 * Mark a viewing as seller-updated.
 * Sets seller_updated=true and seller_updated_at to the current timestamp.
 */
export async function markViewingSellerUpdated(
  supabase: SupabaseClient,
  viewingId: string
): Promise<void> {
  const { error } = await supabase
    .from('viewings')
    .update({
      seller_updated: true,
      seller_updated_at: new Date().toISOString(),
    })
    .eq('id', viewingId);

  if (error) {
    console.error('[SellerService] markViewingSellerUpdated error:', error);
    throw new Error(`Failed to mark viewing as seller-updated: ${error.message}`);
  }
}

/**
 * Get the count of completed viewings for a listing where seller has not been updated.
 */
export async function getPendingSellerUpdateCount(
  supabase: SupabaseClient,
  listingId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('viewings')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', 'completed')
    .eq('seller_updated', false);

  if (error) {
    console.error('[SellerService] getPendingSellerUpdateCount error:', error);
    throw new Error(`Failed to get pending seller update count: ${error.message}`);
  }

  return count ?? 0;
}
