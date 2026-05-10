import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdPlatform,
  AdTone,
  ComplianceWarning,
  MarketingAssetRecord,
  TargetAudience,
} from './ad-copy-types';

export interface SaveMarketingAssetParams {
  tenant_id: string;
  listing_id: string;
  asset_type: MarketingAssetRecord['asset_type'];
  platform: AdPlatform;
  tone: AdTone;
  target_angle: TargetAudience | null;
  content_text: string;
  compliance_flags: ComplianceWarning[];
  generated_by: 'ai' | 'manual';
  saved_by: string;
}

export interface SaveResult {
  success: boolean;
  record?: MarketingAssetRecord;
  error?: string;
}

export interface MarkAsUsedResult {
  success: boolean;
  error?: string;
}

/**
 * Saves a marketing asset record to the database.
 * Inserts a new row into listing_marketing_assets with all required fields.
 */
export async function saveMarketingAsset(
  supabase: SupabaseClient,
  params: SaveMarketingAssetParams
): Promise<SaveResult> {
  const { data, error } = await supabase
    .from('listing_marketing_assets')
    .insert({
      tenant_id: params.tenant_id,
      listing_id: params.listing_id,
      asset_type: params.asset_type,
      platform: params.platform,
      tone: params.tone,
      target_angle: params.target_angle,
      content_text: params.content_text,
      compliance_flags: params.compliance_flags,
      generated_by: params.generated_by,
      saved_by: params.saved_by,
    })
    .select()
    .single();

  if (error) {
    console.error('[MarketingAsset] Save error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, record: data as MarketingAssetRecord };
}

/**
 * Marks a marketing asset as used by setting the published_at timestamp.
 */
export async function markAsUsed(
  supabase: SupabaseClient,
  recordId: string
): Promise<MarkAsUsedResult> {
  const publishedAt = new Date().toISOString();

  const { error } = await supabase
    .from('listing_marketing_assets')
    .update({ published_at: publishedAt })
    .eq('id', recordId);

  if (error) {
    console.error('[MarketingAsset] Mark as used error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
