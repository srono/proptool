import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatPrice } from '../format-price';

describe('Feature: ai-reply-suggestions, Property 13: Price Formatting', () => {
  /**
   * **Validates: Requirements 4.7**
   *
   * For any positive numeric price value, the formatted output SHALL match
   * the pattern "S$" followed by digits grouped in thousands with comma
   * separators and no decimal places (e.g., S$1,800,000).
   */
  it('for any positive integer, output matches pattern S$ followed by comma-separated digit groups', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        (value) => {
          const result = formatPrice(value);

          // Must start with "S$"
          expect(result.startsWith('S$')).toBe(true);

          // Extract the numeric portion after "S$"
          const numericPart = result.slice(2);

          // Must match comma-separated digit groups pattern:
          // Either a single group of 1-3 digits, or a leading group of 1-3 digits
          // followed by groups of exactly 3 digits separated by commas
          const commaFormattedPattern = /^[1-9]\d{0,2}(,\d{3})*$/;
          expect(numericPart).toMatch(commaFormattedPattern);

          // The numeric value (without commas) must equal the rounded input
          const parsedValue = parseInt(numericPart.replace(/,/g, ''), 10);
          expect(parsedValue).toBe(Math.round(value));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any positive float, output has no decimal places and matches the comma-separated pattern', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1e15, noNaN: true, noDefaultInfinity: true }).filter(v => v > 0),
        (value) => {
          const result = formatPrice(value);

          // Must start with "S$"
          expect(result.startsWith('S$')).toBe(true);

          // Extract the numeric portion after "S$"
          const numericPart = result.slice(2);

          // Must not contain a decimal point
          expect(numericPart).not.toContain('.');

          // Must match comma-separated digit groups pattern
          // Handle the special case where rounded value is 0 (for very small floats)
          if (Math.round(value) === 0) {
            expect(numericPart).toBe('0');
          } else {
            const commaFormattedPattern = /^[1-9]\d{0,2}(,\d{3})*$/;
            expect(numericPart).toMatch(commaFormattedPattern);
          }

          // The numeric value must equal the rounded input
          const parsedValue = parseInt(numericPart.replace(/,/g, ''), 10);
          expect(parsedValue).toBe(Math.round(value));
        }
      ),
      { numRuns: 100 }
    );
  });
});
