import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationListingContext } from '@propagent/shared';

/**
 * Inserts or replaces the follow-up listing context for a conversation.
 * Uses the UNIQUE(tenant_id, contact_id) constraint to upsert —
 * if a row exists for that tenant+contact, updates the listing_id; otherwise inserts.
 */
export async function upsertFollowUpContext(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string,
  listingId: string
): Promise<ConversationListingContext | null> {
  const { data, error } = await supabase
    .from('conversation_listing_context')
    .upsert(
      {
        tenant_id: tenantId,
        contact_id: contactId,
        listing_id: listingId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,contact_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[FollowUpContext] Upsert error:', error);
    return null;
  }

  return data as ConversationListingContext;
}

/**
 * Fetches the current listing context for a tenant+contact pair.
 * Verifies the referenced listing still exists and belongs to the tenant.
 * If the listing has been deleted, clears the context and returns null.
 */
export async function getFollowUpContext(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string
): Promise<ConversationListingContext | null> {
  const { data: context, error } = await supabase
    .from('conversation_listing_context')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .single();

  if (error || !context) {
    return null;
  }

  // Verify the referenced listing still exists and belongs to the tenant
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('id', context.listing_id)
    .eq('tenant_id', tenantId)
    .single();

  if (listingError || !listing) {
    // Listing has been deleted or doesn't belong to tenant — clear context
    await clearFollowUpContext(supabase, tenantId, contactId);
    return null;
  }

  return context as ConversationListingContext;
}

/**
 * Removes the follow-up context for the given tenant+contact pair.
 */
export async function clearFollowUpContext(
  supabase: SupabaseClient,
  tenantId: string,
  contactId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversation_listing_context')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId);

  if (error) {
    console.error('[FollowUpContext] Clear error:', error);
  }
}
