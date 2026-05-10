import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseAdCopyResponse } from '../ad-copy-response-parser';
import type { CopyVariantType } from '../ad-copy-types';

/**
 * Required variant types and their maximum character lengths.
 */
const REQUIRED_VARIANTS: Record<Exclude<CopyVariantType, 'hashtags'>, number> = {
  primary_caption: 2000,
  short_headline: 100,
  cta_line: 150,
  short_form: 280,
  instagram_caption: 2200,
  whatsapp_promo: 1000,
};

const REQUIRED_VARIANT_TYPES = Object.keys(REQUIRED_VARIANTS) as Exclude<CopyVariantType, 'hashtags'>[];

const VALID_PLATFORMS = ['facebook', 'instagram', 'whatsapp', 'generic'] as const;

/**
 * Generates a valid content string for a given variant type,
 * respecting the max character limit.
 */
function contentArbForType(type: Exclude<CopyVariantType, 'hashtags'>): fc.Arbitrary<string> {
  const maxLen = REQUIRED_VARIANTS[type];
  return fc.string({ minLength: 1, maxLength: maxLen }).filter((s) => s.trim().length > 0);
}

/**
 * Generates a valid hashtag string with a count between 5 and 15 inclusive.
 */
const hashtagContentArb = fc
  .integer({ min: 5, max: 15 })
  .chain((count) =>
    fc
      .array(
        fc.string({ minLength: 2, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
        { minLength: count, maxLength: count }
      )
      .map((tags) => tags.map((t) => `#${t}`).join(' '))
  );

/**
 * Generates a complete valid response JSON with all required variant types.
 */
const validResponseArb = fc
  .tuple(
    ...REQUIRED_VARIANT_TYPES.map((type) =>
      fc.tuple(
        fc.constant(type),
        contentArbForType(type),
        fc.constantFrom(...VALID_PLATFORMS)
      )
    )
  )
  .map((tuples) =>
    tuples.map(([type, content, platform]) => ({
      type,
      platform,
      content,
    }))
  );

/**
 * Generates a complete valid response JSON wrapped in a { variants: [...] } object.
 */
const validWrappedResponseArb = validResponseArb.map((variants) => ({
  variants,
}));

describe('Feature: listing-ad-copy-assistant, Property 5: Response Parser Variant Completeness', () => {
  /**
   * **Validates: Requirements 4.7, 4.8**
   *
   * For any valid JSON response containing all required variant types with content
   * within character limits, the parser SHALL produce exactly the required variant
   * types with correct max_length values.
   */
  it('produces exactly the required variant types with correct max lengths for valid input', () => {
    fc.assert(
      fc.property(validResponseArb, (variants) => {
        const rawJson = JSON.stringify(variants);
        const result = parseAdCopyResponse(rawJson, false);

        expect(result.success).toBe(true);
        if (!result.success) return;

        // Exactly 6 required variant types
        expect(result.variants).toHaveLength(REQUIRED_VARIANT_TYPES.length);

        // Each required type is present exactly once
        const typeSet = new Set(result.variants.map((v) => v.type));
        for (const requiredType of REQUIRED_VARIANT_TYPES) {
          expect(typeSet.has(requiredType)).toBe(true);
        }

        // Each variant has the correct max_length
        for (const variant of result.variants) {
          const expectedMaxLength = REQUIRED_VARIANTS[variant.type as Exclude<CopyVariantType, 'hashtags'>];
          expect(variant.max_length).toBe(expectedMaxLength);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.7, 4.8**
   *
   * For any valid JSON response wrapped in a { variants: [...] } object,
   * the parser SHALL produce the same correct result.
   */
  it('produces correct variant types from wrapped { variants: [...] } format', () => {
    fc.assert(
      fc.property(validWrappedResponseArb, (wrappedResponse) => {
        const rawJson = JSON.stringify(wrappedResponse);
        const result = parseAdCopyResponse(rawJson, false);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.variants).toHaveLength(REQUIRED_VARIANT_TYPES.length);

        const typeSet = new Set(result.variants.map((v) => v.type));
        for (const requiredType of REQUIRED_VARIANT_TYPES) {
          expect(typeSet.has(requiredType)).toBe(true);
        }

        for (const variant of result.variants) {
          const expectedMaxLength = REQUIRED_VARIANTS[variant.type as Exclude<CopyVariantType, 'hashtags'>];
          expect(variant.max_length).toBe(expectedMaxLength);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.7, 4.8**
   *
   * For any valid response with content at or below the max character limit,
   * the parser SHALL accept the content without error.
   */
  it('accepts content at any length up to the maximum for each variant type', () => {
    // Generate content at exactly the max length for each type
    const maxLengthResponseArb = fc
      .tuple(
        ...REQUIRED_VARIANT_TYPES.map((type) => {
          const maxLen = REQUIRED_VARIANTS[type];
          return fc
            .integer({ min: 1, max: maxLen })
            .map((len) => ({
              type,
              platform: 'generic',
              content: 'x'.repeat(len),
            }));
        })
      );

    fc.assert(
      fc.property(maxLengthResponseArb, (variants) => {
        const rawJson = JSON.stringify(variants);
        const result = parseAdCopyResponse(rawJson, false);

        expect(result.success).toBe(true);
        if (!result.success) return;

        for (const variant of result.variants) {
          expect(variant.content.length).toBeLessThanOrEqual(
            REQUIRED_VARIANTS[variant.type as Exclude<CopyVariantType, 'hashtags'>]
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.7, 4.8**
   *
   * When includeHashtags is true and the response contains a valid hashtag variant
   * with 5-15 hashtags, the parser SHALL accept it and include it in the result.
   */
  it('validates hashtag count between 5 and 15 inclusive when includeHashtags is true', () => {
    fc.assert(
      fc.property(validResponseArb, hashtagContentArb, (variants, hashtagContent) => {
        const withHashtags = [
          ...variants,
          { type: 'hashtags', platform: 'generic', content: hashtagContent },
        ];
        const rawJson = JSON.stringify(withHashtags);
        const result = parseAdCopyResponse(rawJson, true);

        expect(result.success).toBe(true);
        if (!result.success) return;

        // Should have 7 variants (6 required + hashtags)
        expect(result.variants).toHaveLength(REQUIRED_VARIANT_TYPES.length + 1);

        // Hashtags variant should be present
        const hashtagVariant = result.variants.find((v) => v.type === 'hashtags');
        expect(hashtagVariant).toBeDefined();

        // Verify the hashtag count is valid (5-15)
        const hashtags = hashtagVariant!.content
          .split(/\s+/)
          .filter((tag) => tag.startsWith('#') && tag.length > 1);
        expect(hashtags.length).toBeGreaterThanOrEqual(5);
        expect(hashtags.length).toBeLessThanOrEqual(15);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.7, 4.8**
   *
   * When includeHashtags is true and the hashtag count is outside 5-15,
   * the parser SHALL reject the response.
   */
  it('rejects hashtag count outside 5-15 range', () => {
    // Generate invalid hashtag counts (below 5 or above 15)
    const invalidHashtagCountArb = fc.oneof(
      fc.integer({ min: 0, max: 4 }),
      fc.integer({ min: 16, max: 25 })
    );

    const invalidHashtagContentArb = invalidHashtagCountArb.map((count) => {
      if (count === 0) return 'no hashtags here';
      return Array.from({ length: count }, (_, i) => `#tag${i}`).join(' ');
    });

    fc.assert(
      fc.property(validResponseArb, invalidHashtagContentArb, (variants, hashtagContent) => {
        const withHashtags = [
          ...variants,
          { type: 'hashtags', platform: 'generic', content: hashtagContent },
        ];
        const rawJson = JSON.stringify(withHashtags);
        const result = parseAdCopyResponse(rawJson, true);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Hashtag count must be between 5 and 15');
        }
      }),
      { numRuns: 100 }
    );
  });
});
