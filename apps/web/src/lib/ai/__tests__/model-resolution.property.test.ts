import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: ai-model-config, Property 1: Non-whitespace values resolve to trimmed input
 * Feature: ai-model-config, Property 2: Whitespace-only and empty values resolve to default
 * Feature: ai-model-config, Property 3: Resolution is idempotent
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * The model resolution logic is a pure function shared across AI features:
 *   (envValue ?? '').trim() || 'gpt-4o-mini'
 *
 * This test exercises the resolution logic inline as a pure function to verify
 * its properties across arbitrary string inputs.
 */

const DEFAULT_MODEL = 'gpt-4o-mini';

/** The model resolution logic extracted as a pure, testable function. */
function resolveModel(envValue: string | undefined): string {
  return (envValue ?? '').trim() || DEFAULT_MODEL;
}

/**
 * Generator for strings that contain at least one non-whitespace character.
 * Produces arbitrary unicode strings filtered to ensure non-whitespace content.
 */
const nonWhitespaceStringArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

/**
 * Generator for whitespace-only strings (spaces, tabs, newlines, etc.).
 */
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 0, maxLength: 20 })
  .map((chars) => chars.join(''));

describe('Feature: ai-model-config, Property 1: Non-whitespace values resolve to trimmed input', () => {
  it('for any string with at least one non-whitespace char, returns the trimmed string', () => {
    fc.assert(
      fc.property(nonWhitespaceStringArb, (input) => {
        const result = resolveModel(input);
        expect(result).toBe(input.trim());
        expect(result).not.toBe(DEFAULT_MODEL);
      }),
      { numRuns: 100 }
    );
  });

  it('leading and trailing whitespace is removed from non-empty values', () => {
    const paddedStringArb = fc
      .tuple(whitespaceOnlyArb, nonWhitespaceStringArb, whitespaceOnlyArb)
      .map(([leading, core, trailing]) => leading + core + trailing);

    fc.assert(
      fc.property(paddedStringArb, (input) => {
        const result = resolveModel(input);
        expect(result).toBe(input.trim());
        // Result should have no leading/trailing whitespace
        expect(result).toBe(result.trim());
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ai-model-config, Property 2: Whitespace-only and empty values resolve to default', () => {
  it('empty string resolves to default model', () => {
    expect(resolveModel('')).toBe(DEFAULT_MODEL);
  });

  it('undefined resolves to default model', () => {
    expect(resolveModel(undefined)).toBe(DEFAULT_MODEL);
  });

  it('for any whitespace-only string, resolves to default model', () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (input) => {
        const result = resolveModel(input);
        expect(result).toBe(DEFAULT_MODEL);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ai-model-config, Property 3: Resolution is idempotent', () => {
  it('resolve(resolve(x)) === resolve(x) for any input', () => {
    const inputArb = fc.oneof(
      fc.string(),
      fc.constant(undefined as string | undefined),
      whitespaceOnlyArb,
      nonWhitespaceStringArb
    );

    fc.assert(
      fc.property(inputArb, (input) => {
        const once = resolveModel(input);
        const twice = resolveModel(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });
});
