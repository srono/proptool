import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { truncateChipText } from '@/lib/ai/truncate';

/**
 * Feature: ai-reply-suggestions, Property 8: Chip Text Truncation
 * Validates: Requirements 2.1
 *
 * For any suggestion text string, the chip display function SHALL:
 * (a) return the original string unchanged if its length is ≤ 80 characters;
 * (b) return the first 80 characters followed by "…" if its length exceeds 80 characters.
 */
describe('Feature: ai-reply-suggestions, Property 8: Chip Text Truncation', () => {
  it('returns the original string unchanged when length ≤ 80 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 80 }),
        (text) => {
          const result = truncateChipText(text);
          expect(result).toBe(text);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns the first 80 characters followed by "…" when length > 80 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 81, maxLength: 500 }),
        (text) => {
          const result = truncateChipText(text);
          expect(result).toBe(text.slice(0, 80) + '\u2026');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result length is at most 81 characters (80 + ellipsis) for any input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (text) => {
          const result = truncateChipText(text);
          expect(result.length).toBeLessThanOrEqual(81);
        }
      ),
      { numRuns: 100 }
    );
  });
});
