import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketingAssetRecord } from './ad-copy-types';

const MAX_RECORDS = 50;

/**
 * Fetches saved marketing asset records for a listing.
 * Returns at most 50 records ordered by created_at descending (most recent first).
 */
export async function getSavedRecords(
  supabase: SupabaseClient,
  listingId: string
): Promise<MarketingAssetRecord[]> {
  const { data, error } = await supabase
    .from('listing_marketing_assets')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
    .limit(MAX_RECORDS);

  if (error) {
    console.error('[SavedRecords] Query error:', error);
    return [];
  }

  return (data ?? []) as MarketingAssetRecord[];
}

/**
 * Pure sorting/limiting utility for property testing.
 * Takes an array of records and returns at most 50, sorted by created_at descending.
 */
export function sortAndLimitRecords(
  records: MarketingAssetRecord[]
): MarketingAssetRecord[] {
  return [...records]
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    })
    .slice(0, MAX_RECORDS);
}
