import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { detectSchedulingIntent, SCHEDULING_KEYWORDS } from '../scheduling-intent';

describe('Feature: ai-reply-suggestions, Property 2: Scheduling Intent Detection', () => {
  /**
   * **Validates: Requirements 3.1, 7.1, 7.2, 7.6**
   *
   * For any message string containing at least one scheduling keyword
   * (case-insensitive), detectSchedulingIntent SHALL return true.
   */
  it('returns true for any string containing at least one scheduling keyword (case-insensitive)', () => {
    // Generator: pick a random keyword, apply random casing, embed it in random surrounding text
    const messageWithKeyword = fc
      .record({
        keyword: fc.constantFrom(...SCHEDULING_KEYWORDS),
        prefix: fc.string({ minLength: 0, maxLength: 50 }),
        suffix: fc.string({ minLength: 0, maxLength: 50 }),
        toUpper: fc.boolean(),
      })
      .map(({ keyword, prefix, suffix, toUpper }) => {
        const cased = toUpper ? keyword.toUpperCase() : keyword;
        return `${prefix}${cased}${suffix}`;
      });

    fc.assert(
      fc.property(messageWithKeyword, (message) => {
        expect(detectSchedulingIntent(message)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.1, 7.1, 7.2, 7.6**
   *
   * For any message string containing none of the scheduling keywords,
   * detectSchedulingIntent SHALL return false.
   */
  it('returns false for any string containing none of the scheduling keywords', () => {
    // Use a restricted alphabet that cannot form any keyword.
    // Digits and punctuation characters only — no letters means no keyword can match.
    const safeChars = '0123456789!@#$%^&*()-_=+[]{}|;:,.<>?/~`';
    const messageWithoutKeywords = fc
      .array(fc.constantFrom(...safeChars.split('')), { minLength: 0, maxLength: 100 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(messageWithoutKeywords, (message) => {
        expect(detectSchedulingIntent(message)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
