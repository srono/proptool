import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseSuggestionResponse } from '../response-parser';

const VALID_CATEGORIES = ['greeting', 'scheduling', 'listing_info', 'follow_up', 'general'] as const;

describe('Feature: ai-reply-suggestions, Property 1: LLM Response Validation Pipeline', () => {
  /**
   * **Validates: Requirements 1.5, 1.8, 6.6, 10.6, 10.8**
   *
   * (a) If the string is not valid JSON, the parser SHALL return an empty array.
   */
  it('(a) invalid JSON returns empty array', () => {
    const nonJsonArb = fc.string().filter((s) => {
      try {
        JSON.parse(s);
        return false;
      } catch {
        return true;
      }
    });

    fc.assert(
      fc.property(nonJsonArb, (raw) => {
        const result = parseSuggestionResponse(raw);
        expect(result).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5, 1.8, 6.6, 10.6, 10.8**
   *
   * (b) Any suggestion object missing the "text" field or with an empty/whitespace-only
   * "text" SHALL be excluded from the result.
   */
  it('(b) suggestions with missing or empty/whitespace-only text are excluded', () => {
    // Generate arrays that contain items with missing or whitespace-only text
    // mixed with valid suggestions
    const whitespaceArb = fc.array(
      fc.constantFrom(' ', '\t', '\n', '\r'),
      { minLength: 1, maxLength: 10 }
    ).map((chars) => chars.join(''));
    const invalidTextArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.constant(''),
      whitespaceArb,
      fc.integer(), // non-string text
      fc.boolean()
    );

    const validTextArb = fc.string({ minLength: 1, maxLength: 300 }).filter(
      (s) => s.trim().length > 0
    );

    fc.assert(
      fc.property(
        fc.array(invalidTextArb, { minLength: 1, maxLength: 5 }),
        fc.array(validTextArb, { minLength: 2, maxLength: 4 }),
        (invalidTexts, validTexts) => {
          // Build an array mixing invalid and valid items
          const items = [
            ...invalidTexts.map((t) =>
              t === undefined ? { category: 'general' } : { text: t, category: 'general' }
            ),
            ...validTexts.map((t) => ({ text: t, category: 'general' })),
          ];

          const raw = JSON.stringify(items);
          const result = parseSuggestionResponse(raw);

          // All results must have non-empty, non-whitespace text
          for (const suggestion of result) {
            expect(typeof suggestion.text).toBe('string');
            expect(suggestion.text.trim().length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5, 1.8, 6.6, 10.6, 10.8**
   *
   * (c) Any suggestion with "text" exceeding 300 characters SHALL be excluded.
   */
  it('(c) suggestions with text exceeding 300 characters are excluded', () => {
    const longTextArb = fc.string({ minLength: 301, maxLength: 500 });
    const validTextArb = fc.string({ minLength: 1, maxLength: 300 }).filter(
      (s) => s.trim().length > 0
    );

    fc.assert(
      fc.property(
        fc.array(longTextArb, { minLength: 1, maxLength: 3 }),
        fc.array(validTextArb, { minLength: 2, maxLength: 4 }),
        (longTexts, validTexts) => {
          const items = [
            ...longTexts.map((t) => ({ text: t })),
            ...validTexts.map((t) => ({ text: t })),
          ];

          const raw = JSON.stringify(items);
          const result = parseSuggestionResponse(raw);

          // No result should have text > 300 chars
          for (const suggestion of result) {
            expect(suggestion.text.length).toBeLessThanOrEqual(300);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5, 1.8, 6.6, 10.6, 10.8**
   *
   * (d) Any suggestion with a "category" value not in the allowed enum SHALL have
   * its category stripped (text is kept, category is removed).
   */
  it('(d) invalid category values are stripped from suggestions', () => {
    const invalidCategoryArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
      (s) => !(VALID_CATEGORIES as readonly string[]).includes(s)
    );
    const validTextArb = fc.string({ minLength: 1, maxLength: 300 }).filter(
      (s) => s.trim().length > 0
    );

    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(validTextArb, invalidCategoryArb),
          { minLength: 2, maxLength: 4 }
        ),
        (pairs) => {
          const items = pairs.map(([text, category]) => ({ text, category }));
          const raw = JSON.stringify(items);
          const result = parseSuggestionResponse(raw);

          // All returned suggestions should either have a valid category or no category
          for (const suggestion of result) {
            if (suggestion.category !== undefined) {
              expect(VALID_CATEGORIES as readonly string[]).toContain(suggestion.category);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5, 1.8, 6.6, 10.6, 10.8**
   *
   * (e) If fewer than 2 valid suggestions remain after filtering, the result SHALL
   * be an empty array.
   */
  it('(e) fewer than 2 valid suggestions results in empty array', () => {
    const validTextArb = fc.string({ minLength: 1, maxLength: 300 }).filter(
      (s) => s.trim().length > 0
    );

    fc.assert(
      fc.property(
        fc.array(validTextArb, { minLength: 0, maxLength: 1 }),
        (validTexts) => {
          const items = validTexts.map((t) => ({ text: t }));
          const raw = JSON.stringify(items);
          const result = parseSuggestionResponse(raw);

          expect(result).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.5, 1.8, 6.6, 10.6, 10.8**
   *
   * (f) If more than 4 valid suggestions remain, only the first 4 SHALL be returned.
   */
  it('(f) more than 4 valid suggestions returns only the first 4', () => {
    const validTextArb = fc.string({ minLength: 1, maxLength: 300 }).filter(
      (s) => s.trim().length > 0
    );

    fc.assert(
      fc.property(
        fc.array(validTextArb, { minLength: 5, maxLength: 10 }),
        (validTexts) => {
          const items = validTexts.map((t) => ({ text: t, category: 'general' }));
          const raw = JSON.stringify(items);
          const result = parseSuggestionResponse(raw);

          // Should return exactly 4
          expect(result).toHaveLength(4);

          // Should be the first 4 valid items
          for (let i = 0; i < 4; i++) {
            expect(result[i].text).toBe(validTexts[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
