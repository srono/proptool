import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isDirty } from '../dirty-state';

describe('Feature: listing-ad-copy-assistant, Property 7: Dirty State Detection', () => {
  /**
   * **Validates: Requirements 8.3, 9.6**
   *
   * For any copy variant with a known saved version, the variant SHALL be
   * considered "dirty" if and only if its current content_text differs from
   * the last saved or original version by at least one character.
   */
  it('returns false (not dirty) when current text is identical to saved text', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          expect(isDirty(text, text)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns true (dirty) when current text differs from saved text by at least one character', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0 }),
        fc.string({ minLength: 0 }),
        (original, modified) => {
          fc.pre(original !== modified);
          expect(isDirty(modified, original)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('detects single character appended as dirty', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string({ minLength: 1, maxLength: 1 }),
        (base, extra) => {
          const modified = base + extra;
          // Appending a non-empty char always produces a different (longer) string
          expect(isDirty(modified, base)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('detects single character removed as dirty', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (text) => {
          const removed = text.slice(0, -1);
          // Removing a character always produces a different string when length >= 1
          expect(isDirty(removed, text)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('isDirty is symmetric: isDirty(a, b) === isDirty(b, a) for any pair', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (a, b) => {
          expect(isDirty(a, b)).toBe(isDirty(b, a));
        }
      ),
      { numRuns: 100 }
    );
  });
});
