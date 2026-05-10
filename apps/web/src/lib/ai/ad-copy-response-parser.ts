import type { CopyVariant, CopyVariantType } from './ad-copy-types';

/**
 * Maximum character limits for each variant type.
 */
const VARIANT_MAX_LENGTHS: Record<CopyVariantType, number> = {
  primary_caption: 2000,
  short_headline: 100,
  cta_line: 150,
  short_form: 280,
  instagram_caption: 2200,
  whatsapp_promo: 1000,
  hashtags: 5000, // No strict char limit for hashtags; validated by count instead
};

/**
 * The required variant types that must be present in every valid response.
 * Hashtags are conditionally required based on the includeHashtags flag.
 */
const REQUIRED_VARIANT_TYPES: CopyVariantType[] = [
  'primary_caption',
  'short_headline',
  'cta_line',
  'short_form',
  'instagram_caption',
  'whatsapp_promo',
];

const MIN_HASHTAG_COUNT = 5;
const MAX_HASHTAG_COUNT = 15;

export type ParseAdCopyResult =
  | { success: true; variants: CopyVariant[] }
  | { success: false; error: string };

/**
 * Parses a raw JSON response from the LLM into typed CopyVariant[].
 *
 * Validates:
 * - JSON is parseable
 * - Response contains an array of variants (either top-level or under a "variants" key)
 * - Each required variant type is present
 * - Each variant's content respects its max character limit
 * - Hashtag count is between 5 and 15 (when includeHashtags is true)
 *
 * Returns a structured success/error result.
 */
export function parseAdCopyResponse(
  rawJson: string,
  includeHashtags: boolean
): ParseAdCopyResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, error: 'Invalid JSON response from AI model' };
  }

  // Accept either a top-level array or an object with a "variants" array
  let rawVariants: unknown[];
  if (Array.isArray(parsed)) {
    rawVariants = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'variants' in parsed &&
    Array.isArray((parsed as Record<string, unknown>).variants)
  ) {
    rawVariants = (parsed as Record<string, unknown>).variants as unknown[];
  } else {
    return { success: false, error: 'Response is not an array of variants' };
  }

  const variants: CopyVariant[] = [];
  const seenTypes = new Set<CopyVariantType>();

  for (const item of rawVariants) {
    if (item === null || typeof item !== 'object') {
      continue;
    }

    const obj = item as Record<string, unknown>;

    // Validate type field
    if (typeof obj.type !== 'string') {
      continue;
    }

    const type = obj.type as CopyVariantType;
    const allValidTypes: CopyVariantType[] = [...REQUIRED_VARIANT_TYPES, 'hashtags'];
    if (!allValidTypes.includes(type)) {
      continue;
    }

    // Skip hashtags variant if not requested
    if (type === 'hashtags' && !includeHashtags) {
      continue;
    }

    // Validate content field
    if (typeof obj.content !== 'string' || obj.content.trim().length === 0) {
      return {
        success: false,
        error: `Variant "${type}" has empty or missing content`,
      };
    }

    const content = obj.content;

    // Validate character limit for non-hashtag types
    if (type !== 'hashtags') {
      const maxLength = VARIANT_MAX_LENGTHS[type];
      if (content.length > maxLength) {
        return {
          success: false,
          error: `Variant "${type}" exceeds maximum length of ${maxLength} characters (got ${content.length})`,
        };
      }
    }

    // Validate hashtag count
    if (type === 'hashtags') {
      const hashtags = content
        .split(/\s+/)
        .filter((tag) => tag.startsWith('#') && tag.length > 1);
      if (hashtags.length < MIN_HASHTAG_COUNT || hashtags.length > MAX_HASHTAG_COUNT) {
        return {
          success: false,
          error: `Hashtag count must be between ${MIN_HASHTAG_COUNT} and ${MAX_HASHTAG_COUNT} (got ${hashtags.length})`,
        };
      }
    }

    // Determine platform from variant or default
    const platform =
      typeof obj.platform === 'string' &&
      ['facebook', 'instagram', 'whatsapp', 'generic'].includes(obj.platform)
        ? (obj.platform as CopyVariant['platform'])
        : 'generic';

    const maxLength = VARIANT_MAX_LENGTHS[type];

    variants.push({
      type,
      platform,
      content,
      max_length: maxLength,
    });

    seenTypes.add(type);
  }

  // Validate all required variant types are present
  const missingTypes = REQUIRED_VARIANT_TYPES.filter((t) => !seenTypes.has(t));
  if (missingTypes.length > 0) {
    return {
      success: false,
      error: `Missing required variant types: ${missingTypes.join(', ')}`,
    };
  }

  // Validate hashtags variant is present when required
  if (includeHashtags && !seenTypes.has('hashtags')) {
    return {
      success: false,
      error: 'Missing required variant type: hashtags',
    };
  }

  return { success: true, variants };
}
