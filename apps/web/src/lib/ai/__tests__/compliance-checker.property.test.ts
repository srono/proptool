import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { checkCompliance } from '../compliance-checker';
import type { ComplianceCategory } from '../ad-copy-types';

// --- Known Risky Phrases by Category ---

const SUPERLATIVE_PHRASES = [
  'best deal',
  'guaranteed return',
  'highest yield',
  'number one',
  'top performer',
];

const MISLEADING_PHRASES = [
  'last unit',
  'selling fast',
  'limited time only',
];

const DISCRIMINATORY_PHRASES = [
  'ideal for Chinese',
  'no Muslims',
  'females only preferred',
];

const UNVERIFIED_PHRASES = [
  '5 minutes walk',
  'yield of 4.5%',
  'MRT 200 meters',
];

// --- Generators ---

/** Pick a random risky phrase from a specific category */
const superlativeArb = fc.constantFrom(...SUPERLATIVE_PHRASES);
const misleadingArb = fc.constantFrom(...MISLEADING_PHRASES);
const discriminatoryArb = fc.constantFrom(...DISCRIMINATORY_PHRASES);
const unverifiedArb = fc.constantFrom(...UNVERIFIED_PHRASES);

/** Generate clean text that does NOT contain any risky phrases.
 *  Uses a restricted alphabet and short words to avoid accidental matches. */
const cleanWordArb = fc.array(
  fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'),
  { minLength: 1, maxLength: 8 }
).map(chars => chars.join(''));

const cleanTextArb = fc.array(cleanWordArb, { minLength: 1, maxLength: 20 })
  .map(words => words.join(' '));

/** Generate surrounding filler text (safe words only) */
const fillerArb = fc.array(cleanWordArb, { minLength: 0, maxLength: 5 })
  .map(words => words.join(' '));

/** Embed a risky phrase within surrounding filler text */
function embeddedPhraseArb(phraseArb: fc.Arbitrary<string>): fc.Arbitrary<{ text: string; phrase: string }> {
  return fc.tuple(fillerArb, phraseArb, fillerArb).map(([before, phrase, after]) => ({
    text: [before, phrase, after].filter(s => s.length > 0).join(' '),
    phrase,
  }));
}

// --- Property Tests ---

/**
 * Feature: listing-ad-copy-assistant, Property 6: Compliance Checker Detection Accuracy
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 *
 * For any text string, the compliance checker SHALL:
 * (a) flag all occurrences of unsupported superlatives with category 'unsupported_superlative'
 * (b) flag all occurrences of misleading claims with category 'misleading_claim'
 * (c) flag all occurrences of discriminatory language with category 'discriminatory_language'
 * (d) flag all occurrences of unverified factual claims with category 'unverified_factual_claim'
 * (e) return zero warnings for text that does not contain any risky patterns
 */
describe('Feature: listing-ad-copy-assistant, Property 6: Compliance Checker Detection Accuracy', () => {
  it('(a) flags unsupported superlatives with correct category', () => {
    fc.assert(
      fc.property(
        embeddedPhraseArb(superlativeArb),
        ({ text, phrase }) => {
          const result = checkCompliance(text);

          // Should have at least one warning
          expect(result.warnings.length).toBeGreaterThanOrEqual(1);

          // At least one warning should match the phrase (case-insensitive) and have correct category
          const matchingWarning = result.warnings.find(
            w => w.phrase.toLowerCase() === phrase.toLowerCase() &&
                 w.category === 'unsupported_superlative'
          );
          expect(matchingWarning).toBeDefined();
          expect(matchingWarning!.category).toBe('unsupported_superlative' satisfies ComplianceCategory);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(b) flags misleading claims with correct category', () => {
    fc.assert(
      fc.property(
        embeddedPhraseArb(misleadingArb),
        ({ text, phrase }) => {
          const result = checkCompliance(text);

          // Should have at least one warning
          expect(result.warnings.length).toBeGreaterThanOrEqual(1);

          // At least one warning should match the phrase and have correct category
          const matchingWarning = result.warnings.find(
            w => w.phrase.toLowerCase() === phrase.toLowerCase() &&
                 w.category === 'misleading_claim'
          );
          expect(matchingWarning).toBeDefined();
          expect(matchingWarning!.category).toBe('misleading_claim' satisfies ComplianceCategory);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(c) flags discriminatory language with correct category', () => {
    fc.assert(
      fc.property(
        embeddedPhraseArb(discriminatoryArb),
        ({ text, phrase }) => {
          const result = checkCompliance(text);

          // Should have at least one warning
          expect(result.warnings.length).toBeGreaterThanOrEqual(1);

          // At least one warning should have the discriminatory_language category
          const discriminatoryWarnings = result.warnings.filter(
            w => w.category === 'discriminatory_language'
          );
          expect(discriminatoryWarnings.length).toBeGreaterThanOrEqual(1);

          // The flagged phrase should contain part of the input phrase (regex may match a substring)
          const phraseWords = phrase.toLowerCase().split(/\s+/);
          const anyMatch = discriminatoryWarnings.some(w => {
            const flaggedLower = w.phrase.toLowerCase();
            return phraseWords.some(word => flaggedLower.includes(word)) ||
                   flaggedLower.includes(phrase.toLowerCase());
          });
          expect(anyMatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(d) flags unverified factual claims with correct category', () => {
    fc.assert(
      fc.property(
        embeddedPhraseArb(unverifiedArb),
        ({ text, phrase }) => {
          const result = checkCompliance(text);

          // Should have at least one warning
          expect(result.warnings.length).toBeGreaterThanOrEqual(1);

          // At least one warning should have the unverified_factual_claim category
          const unverifiedWarnings = result.warnings.filter(
            w => w.category === 'unverified_factual_claim'
          );
          expect(unverifiedWarnings.length).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(e) returns zero warnings for clean text without risky patterns', () => {
    fc.assert(
      fc.property(
        cleanTextArb,
        (text) => {
          const result = checkCompliance(text);
          expect(result.warnings).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('flags multiple categories when text contains phrases from different categories', () => {
    fc.assert(
      fc.property(
        superlativeArb,
        misleadingArb,
        fillerArb,
        (superlative, misleading, filler) => {
          const text = `${filler} ${superlative} ${filler} ${misleading} ${filler}`;
          const result = checkCompliance(text);

          const categories = new Set(result.warnings.map(w => w.category));
          expect(categories.has('unsupported_superlative')).toBe(true);
          expect(categories.has('misleading_claim')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result always includes scanned_at timestamp', () => {
    fc.assert(
      fc.property(
        fc.oneof(cleanTextArb, embeddedPhraseArb(superlativeArb).map(e => e.text)),
        (text) => {
          const result = checkCompliance(text);
          expect(result.scanned_at).toBeDefined();
          expect(typeof result.scanned_at).toBe('string');
          // Should be a valid ISO date string
          expect(new Date(result.scanned_at).toISOString()).toBe(result.scanned_at);
        }
      ),
      { numRuns: 100 }
    );
  });
});
