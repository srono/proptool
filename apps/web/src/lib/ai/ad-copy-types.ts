// --- Generation Parameters ---

export type AdPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'generic';
export type AdTone = 'professional' | 'premium' | 'friendly' | 'urgency' | 'investor' | 'family';
export type AdLength = 'short' | 'medium' | 'long';
export type CtaStyle = 'enquire_now' | 'whatsapp_now' | 'book_viewing' | 'request_details';
export type TargetAudience = 'family' | 'upgrader' | 'investor' | 'tenant' | 'first_time_buyer';

export interface GenerationParams {
  listing_id: string;
  platform: AdPlatform;
  tone: AdTone;
  length: AdLength;
  cta_style: CtaStyle;
  target_audience?: TargetAudience;
  avoid_emojis: boolean;
  include_hashtags: boolean;
}

// --- Generation Response ---

export type CopyVariantType =
  | 'primary_caption'
  | 'short_headline'
  | 'cta_line'
  | 'short_form'
  | 'instagram_caption'
  | 'whatsapp_promo'
  | 'hashtags';

export interface CopyVariant {
  type: CopyVariantType;
  platform: AdPlatform;
  content: string;
  max_length: number;
}

export interface GenerationResponse {
  variants: CopyVariant[];
  model_used: string;
  generated_at: string;
}

// --- Compliance ---

export type ComplianceCategory =
  | 'unsupported_superlative'
  | 'misleading_claim'
  | 'discriminatory_language'
  | 'unverified_factual_claim';

export interface ComplianceWarning {
  phrase: string;
  category: ComplianceCategory;
  message: string;
}

export interface ComplianceResult {
  warnings: ComplianceWarning[];
  scanned_at: string;
}

// --- API Request/Response ---

export interface GenerateAdCopyRequest {
  listing_id: string;
  platform: AdPlatform;
  tone: AdTone;
  length: AdLength;
  cta_style: CtaStyle;
  target_audience?: TargetAudience;
  avoid_emojis: boolean;
  include_hashtags: boolean;
}

export interface GenerateAdCopyResponse {
  variants: CopyVariant[];
  model_used: string;
  generated_at: string;
}

export interface GenerateAdCopyErrorResponse {
  error: string;
  code: 'TIMEOUT' | 'GENERATION_FAILED' | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN';
}

// --- Marketing Asset Record ---

export interface MarketingAssetRecord {
  id: string;
  tenant_id: string;
  listing_id: string;
  asset_type: 'ad_copy' | 'caption' | 'headline' | 'whatsapp_text' | 'hashtags' | 'short_form';
  platform: AdPlatform;
  tone: AdTone;
  target_angle: TargetAudience | null;
  content_text: string;
  compliance_flags: ComplianceWarning[];
  generated_by: 'ai' | 'manual';
  saved_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
