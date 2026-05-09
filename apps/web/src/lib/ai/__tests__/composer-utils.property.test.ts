import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { insertSnippetIntoComposer } from '../composer-utils';

/**
 * Feature: ai-reply-suggestions, Property 6: Listing Snippet Insertion into Composer
 *
 * Validates: Requirements 4.5, 4.6
 *
 * For any existing composer text and any listing snippet, the resulting composer value SHALL equal:
 * (a) the snippet alone when existing text is empty or whitespace-only, or
 * (b) the existing text followed by a newline character followed by the snippet when existing text is non-empty.
 */
describe('Property 6: Listing Snippet Insertion into Composer', () => {
  it('returns snippet alone when existing text is empty or whitespace-only', () => {
    // Generator for empty/whitespace-only strings
    const whitespaceOnly = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 20 })
      .map((chars) => chars.join(''));
    const emptyOrWhitespace = fc.oneof(fc.constant(''), whitespaceOnly);

    fc.assert(
      fc.property(emptyOrWhitespace, fc.string(), (existingText, snippet) => {
        const result = insertSnippetIntoComposer(existingText, snippet);
        expect(result).toBe(snippet);
      }),
      { numRuns: 100 }
    );
  });

  it('returns existing text + newline + snippet when existing text is non-empty', () => {
    // Generator for non-empty, non-whitespace-only strings
    const nonEmptyText = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

    fc.assert(
      fc.property(nonEmptyText, fc.string(), (existingText, snippet) => {
        const result = insertSnippetIntoComposer(existingText, snippet);
        expect(result).toBe(`${existingText}\n${snippet}`);
      }),
      { numRuns: 100 }
    );
  });
});
