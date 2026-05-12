import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateTemplatePlaceholders, SUPPORTED_PLACEHOLDERS } from '../template-resolver';

// --- Generators ---

/** Generate a supported placeholder name */
const supportedPlaceholderArb = fc.constantFrom(...SUPPORTED_PLACEHOLDERS);

/** Generate an unsupported placeholder name (word characters only, not in supported set) */
const unsupportedPlaceholderArb = fc
  .stringMatching(/^[a-z][a-z0-9_]{1,30}$/)
  .filter((s) => !(SUPPORTED_PLACEHOLDERS as readonly string[]).includes(s));

/** Generate plain text that does not contain {{...}} patterns */
const plainTextArb = fc
  .string({ minLength: 0, maxLength: 100 })
  .map((s) => s.replace(/\{\{/g, '(').replace(/\}\}/g, ')'));

/** Generate a template body with only supported placeholders */
const templateWithOnlySupportedArb = fc
  .array(
    fc.oneof(
      plainTextArb,
      supportedPlaceholderArb.map((p) => `{{${p}}}`)
    ),
    { minLength: 1, maxLength: 10 }
  )
  .map((parts) => parts.join(' '));

/** Generate a template body that contains at least one unsupported placeholder */
const templateWithUnsupportedArb = fc
  .tuple(
    fc.array(
      fc.oneof(
        plainTextArb,
        supportedPlaceholderArb.map((p) => `{{${p}}}`),
        unsupportedPlaceholderArb.map((p) => `{{${p}}}`)
      ),
      { minLength: 0, maxLength: 8 }
    ),
    unsupportedPlaceholderArb,
    fc.array(
      fc.oneof(
        plainTextArb,
        supportedPlaceholderArb.map((p) => `{{${p}}}`)
      ),
      { minLength: 0, maxLength: 4 }
    )
  )
  .map(([before, invalid, after]) => [...before, `{{${invalid}}}`, ...after].join(' '));

/** Generate a mixed template with arbitrary valid/invalid placeholders */
const mixedTemplateArb = fc
  .array(
    fc.oneof(
      plainTextArb,
      supportedPlaceholderArb.map((p) => `{{${p}}}`),
      unsupportedPlaceholderArb.map((p) => `{{${p}}}`)
    ),
    { minLength: 1, maxLength: 10 }
  )
  .map((parts) => parts.join(' '));

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 12: Template Placeholder Validation
 *
 * **Validates: Requirements 13.2, 13.8**
 *
 * For any template body string, the validation function SHALL reject it if and only if
 * it contains one or more {{...}} patterns where the name inside the braces is not in
 * the supported set: {contact_name, owned_property_label, owned_property_town, mop_date,
 * agent_name, trigger_date}.
 */
describe('Feature: nurture-playbooks, Property 12: Template Placeholder Validation', () => {
  it('accepts templates containing only supported placeholders', () => {
    fc.assert(
      fc.property(templateWithOnlySupportedArb, (body) => {
        const result = validateTemplatePlaceholders(body);
        expect(result.valid).toBe(true);
        expect(result.invalid_placeholders).toEqual([]);
      }),
      { numRuns: 200 }
    );
  });

  it('rejects templates containing at least one unsupported placeholder', () => {
    fc.assert(
      fc.property(templateWithUnsupportedArb, (body) => {
        const result = validateTemplatePlaceholders(body);
        expect(result.valid).toBe(false);
        expect(result.invalid_placeholders.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  it('accepts templates with no placeholders at all', () => {
    fc.assert(
      fc.property(plainTextArb, (body) => {
        const result = validateTemplatePlaceholders(body);
        expect(result.valid).toBe(true);
        expect(result.invalid_placeholders).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it('invalid_placeholders contains exactly the unsupported names found', () => {
    fc.assert(
      fc.property(mixedTemplateArb, (body) => {
        const result = validateTemplatePlaceholders(body);

        // Manually extract all placeholder names from the body
        const allPlaceholders = Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map(
          (m) => m[1]
        );
        const expectedInvalid = allPlaceholders.filter(
          (p) => !(SUPPORTED_PLACEHOLDERS as readonly string[]).includes(p)
        );

        // The function should report valid iff no unsupported placeholders exist
        expect(result.valid).toBe(expectedInvalid.length === 0);
        // The invalid_placeholders list should match exactly
        expect(result.invalid_placeholders).toEqual(expectedInvalid);
      }),
      { numRuns: 200 }
    );
  });

  it('validation rejects iff any unsupported placeholder name exists (biconditional)', () => {
    fc.assert(
      fc.property(mixedTemplateArb, (body) => {
        const result = validateTemplatePlaceholders(body);

        // Extract all {{word}} patterns
        const allPlaceholders = Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map(
          (m) => m[1]
        );
        const hasUnsupported = allPlaceholders.some(
          (p) => !(SUPPORTED_PLACEHOLDERS as readonly string[]).includes(p)
        );

        // Biconditional: rejected iff unsupported placeholder exists
        expect(result.valid).toBe(!hasUnsupported);
      }),
      { numRuns: 300 }
    );
  });
});
