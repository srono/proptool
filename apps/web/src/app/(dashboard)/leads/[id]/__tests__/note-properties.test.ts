import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  enforceCharLimit,
  isNoteValid,
  trimNoteBody,
  formatTimelineLabel,
  sortTimelineItems,
  TimelineItem,
} from '../note-utils';

/**
 * Feature: lead-add-note, Property 1: Character Limit Enforcement
 * Validates: Requirements 2.3, 2.4, 5.3
 *
 * For any Unicode string input, the enforced note content SHALL have at most 2000 code points.
 * If the input length is ≤ 2000 code points, the content SHALL equal the original input unchanged.
 * If the input length exceeds 2000 code points, the content SHALL equal exactly the first 2000 code points.
 */
describe('Feature: lead-add-note, Property 1: Character Limit Enforcement', () => {
  it('output has at most 2000 code points for any Unicode string', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'binary', minLength: 0, maxLength: 5000 }),
        (input) => {
          const result = enforceCharLimit(input);
          const resultCodePoints = [...result].length;
          expect(resultCodePoints).toBeLessThanOrEqual(2000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns identity for strings with ≤ 2000 code points', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'binary', minLength: 0, maxLength: 2000 }),
        (input) => {
          const result = enforceCharLimit(input);
          expect(result).toBe(input);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns exactly the first 2000 code points for strings exceeding 2000', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: 'binary', minLength: 2001, maxLength: 5000 }),
        (input) => {
          const result = enforceCharLimit(input);
          const inputCodePoints = [...input];
          const expected = inputCodePoints.slice(0, 2000).join('');
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: lead-add-note, Property 2: Whitespace-Only Validation
 * Validates: Requirements 3.5, 5.1, 5.2
 *
 * For any string, the note validation function SHALL return true if and only if the string
 * contains at least one non-whitespace character. Strings that are empty or composed entirely
 * of whitespace characters SHALL return false.
 */
describe('Feature: lead-add-note, Property 2: Whitespace-Only Validation', () => {
  it('returns false for whitespace-only strings', () => {
    fc.assert(
      fc.property(
        fc.string({
          unit: fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'),
          minLength: 0,
          maxLength: 200,
        }),
        (input) => {
          expect(isNoteValid(input)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns true for strings with at least one non-whitespace character', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({
            unit: fc.constantFrom(' ', '\t', '\n'),
            minLength: 0,
            maxLength: 50,
          }),
          fc.string({ unit: 'binary-ascii', minLength: 1, maxLength: 1 }).filter((c) => /\S/.test(c)),
          fc.string({
            unit: fc.constantFrom(' ', '\t', '\n'),
            minLength: 0,
            maxLength: 50,
          })
        ),
        ([prefix, nonWs, suffix]) => {
          const input = prefix + nonWs + suffix;
          expect(isNoteValid(input)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: lead-add-note, Property 3: Trim Preserves Internal Whitespace
 * Validates: Requirements 2.6, 3.1, 4.2, 5.4
 *
 * For any string containing at least one non-whitespace character, trimming SHALL remove all
 * leading and trailing whitespace while preserving every internal character unchanged.
 */
describe('Feature: lead-add-note, Property 3: Trim Preserves Internal Whitespace', () => {
  it('trimmed result has no leading or trailing whitespace', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => /\S/.test(s)),
        (input) => {
          const result = trimNoteBody(input);
          expect(result).toBe(result.trimStart());
          expect(result).toBe(result.trimEnd());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('internal characters are unchanged after trimming', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({
            unit: fc.constantFrom(' ', '\t', '\n'),
            minLength: 0,
            maxLength: 20,
          }),
          fc.string({ minLength: 1, maxLength: 200 }).filter((s) => /\S/.test(s)),
          fc.string({
            unit: fc.constantFrom(' ', '\t', '\n'),
            minLength: 0,
            maxLength: 20,
          })
        ),
        ([leading, core, trailing]) => {
          const input = leading + core + trailing;
          const result = trimNoteBody(input);
          // The trimmed result should equal the core with its own leading/trailing trimmed
          expect(result).toBe(core.trim());
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: lead-add-note, Property 4: Note Timeline Rendering Format
 * Validates: Requirements 4.1
 *
 * For any timeline item with type='note', the rendered label SHALL display "NOTE"
 * and SHALL NOT include a direction indicator.
 */
describe('Feature: lead-add-note, Property 4: Note Timeline Rendering Format', () => {
  it('label contains "NOTE" and no direction indicator for type="note"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (direction) => {
          const label = formatTimelineLabel('note', direction);
          expect(label).toContain('NOTE');
          // No direction indicator (the "·" separator used for other types)
          expect(label).not.toContain('·');
          // Label should be exactly "NOTE" with no additional content
          expect(label).toBe('NOTE');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: lead-add-note, Property 5: Timeline Chronological Sort
 * Validates: Requirements 4.4
 *
 * For any list of timeline items with distinct timestamps, the sort function SHALL produce
 * a list ordered by timestamp descending (most recent first), regardless of input order.
 */
describe('Feature: lead-add-note, Property 5: Timeline Chronological Sort', () => {
  it('output is sorted descending by timestamp regardless of input order', () => {
    const timelineItemArb: fc.Arbitrary<TimelineItem> = fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('note', 'whatsapp', 'sms', 'email'),
      direction: fc.constantFrom('inbound', 'outbound'),
      body: fc.string({ minLength: 0, maxLength: 100 }),
      media_url: fc.constant(null),
      timestamp: fc.integer({
        min: new Date('2020-01-01').getTime(),
        max: new Date('2030-12-31').getTime(),
      }).map((t) => new Date(t).toISOString()),
    });

    fc.assert(
      fc.property(
        fc.array(timelineItemArb, { minLength: 0, maxLength: 50 }),
        (items) => {
          const sorted = sortTimelineItems(items);

          // Verify descending order by timestamp
          for (let i = 0; i < sorted.length - 1; i++) {
            const current = new Date(sorted[i].timestamp).getTime();
            const next = new Date(sorted[i + 1].timestamp).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
