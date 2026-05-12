import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveTemplate, SUPPORTED_PLACEHOLDERS } from '../template-resolver';
import type { ResolveContext } from '../template-resolver';

// --- Generators ---

/** Generate a non-empty string value (simulating a present context value) */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
  (s) => s.length >= 1 && !s.includes('{{') && !s.includes('}}')
);

/** Generate a nullable string value (null or non-empty) */
const nullableStringArb = fc.oneof(fc.constant(null), nonEmptyStringArb);

/** Generate a valid ResolveContext with arbitrary field values */
const resolveContextArb: fc.Arbitrary<ResolveContext> = fc.record({
  contact: fc.record({
    full_name: nullableStringArb,
    owned_property_label: nullableStringArb,
    owned_property_town: nullableStringArb,
    mop_date: nullableStringArb,
  }).map((c) => ({ ...c, trigger_value: c.mop_date })),
  agent: fc.record({
    full_name: nonEmptyStringArb,
  }),
  trigger_field: fc.constant('trigger_value'),
});

/** Generate a supported placeholder name */
const supportedPlaceholderArb = fc.constantFrom(...SUPPORTED_PLACEHOLDERS);

/** Generate a template string that contains only supported placeholders interspersed with literal text */
const templateWithSupportedPlaceholdersArb = fc
  .array(
    fc.oneof(
      // Literal text segment (no curly braces)
      fc.string({ minLength: 0, maxLength: 30 }).filter(
        (s) => !s.includes('{{') && !s.includes('}}')
      ),
      // Supported placeholder
      supportedPlaceholderArb.map((p) => `{{${p}}}`)
    ),
    { minLength: 1, maxLength: 10 }
  )
  .map((parts) => parts.join(''));

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 11: Template Placeholder Resolution
 *
 * **Validates: Requirements 8.1, 13.3, 13.4**
 *
 * For any template string containing supported placeholders and any contact/agent context,
 * the resolved output SHALL contain no remaining {{placeholder}} patterns for supported
 * placeholder names — each is replaced by the corresponding field value (or empty string
 * if the field is null). The set of missing fields SHALL exactly equal the set of
 * placeholders whose corresponding context value is null or empty.
 */
describe('Feature: nurture-playbooks, Property 11: Template Placeholder Resolution', () => {
  it('no supported placeholder patterns remain in resolved output', () => {
    fc.assert(
      fc.property(
        templateWithSupportedPlaceholdersArb,
        resolveContextArb,
        (template, ctx) => {
          const result = resolveTemplate(template, ctx);

          // Verify no supported placeholder patterns remain in the output
          for (const placeholder of SUPPORTED_PLACEHOLDERS) {
            expect(result.text).not.toContain(`{{${placeholder}}}`);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('missing_fields contains exactly the placeholders whose context value is null or empty (one entry per occurrence)', () => {
    fc.assert(
      fc.property(
        templateWithSupportedPlaceholdersArb,
        resolveContextArb,
        (template, ctx) => {
          const result = resolveTemplate(template, ctx);

          // Extract all supported placeholder occurrences in the template (including duplicates)
          const placeholdersInTemplate = Array.from(
            template.matchAll(/\{\{(\w+)\}\}/g)
          )
            .map((m) => m[1])
            .filter((p) =>
              (SUPPORTED_PLACEHOLDERS as readonly string[]).includes(p)
            );

          // Each occurrence of a placeholder with null/empty value contributes to missing_fields
          const expectedMissing = placeholdersInTemplate.filter((p) => {
            const value = getExpectedValue(p, ctx);
            return value === null || value === undefined || value === '';
          });

          // missing_fields should match exactly (including duplicates, order may vary)
          expect([...result.missing_fields].sort()).toEqual(
            [...expectedMissing].sort()
          );
        }
      ),
      { numRuns: 200 }
    );
  });

  it('supported placeholders with non-null values are replaced with the correct value', () => {
    fc.assert(
      fc.property(
        supportedPlaceholderArb,
        resolveContextArb,
        (placeholder, ctx) => {
          const template = `Hello {{${placeholder}}}!`;
          const result = resolveTemplate(template, ctx);
          const expectedValue = getExpectedValue(placeholder, ctx);

          if (expectedValue !== null && expectedValue !== undefined && expectedValue !== '') {
            expect(result.text).toBe(`Hello ${expectedValue}!`);
            expect(result.missing_fields).not.toContain(placeholder);
          } else {
            expect(result.text).toBe('Hello !');
            expect(result.missing_fields).toContain(placeholder);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('templates with no placeholders are returned unchanged with empty missing_fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }).filter(
          (s) => !s.includes('{{') && !s.includes('}}')
        ),
        resolveContextArb,
        (template, ctx) => {
          const result = resolveTemplate(template, ctx);
          expect(result.text).toBe(template);
          expect(result.missing_fields).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('duplicate placeholders in template: each occurrence is resolved, missing_fields lists placeholder once per occurrence', () => {
    fc.assert(
      fc.property(
        supportedPlaceholderArb,
        fc.integer({ min: 2, max: 5 }),
        resolveContextArb,
        (placeholder, count, ctx) => {
          const template = Array(count).fill(`{{${placeholder}}}`).join(' ');
          const result = resolveTemplate(template, ctx);
          const expectedValue = getExpectedValue(placeholder, ctx);

          // No remaining supported placeholder patterns
          expect(result.text).not.toContain(`{{${placeholder}}}`);

          if (expectedValue === null || expectedValue === undefined || expectedValue === '') {
            // Each occurrence adds to missing_fields
            expect(result.missing_fields.filter((f) => f === placeholder).length).toBe(count);
          } else {
            // All occurrences replaced with value
            const expectedText = Array(count).fill(expectedValue).join(' ');
            expect(result.text).toBe(expectedText);
            expect(result.missing_fields).not.toContain(placeholder);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Helper ---

function getExpectedValue(
  placeholder: string,
  ctx: ResolveContext
): string | null | undefined {
  switch (placeholder) {
    case 'contact_name':
      return ctx.contact.full_name as string | null;
    case 'owned_property_label':
      return ctx.contact.owned_property_label as string | null;
    case 'owned_property_town':
      return ctx.contact.owned_property_town as string | null;
    case 'mop_date':
      return ctx.contact.mop_date as string | null;
    case 'agent_name':
      return ctx.agent.full_name;
    case 'trigger_date': {
      const triggerValue = ctx.contact[ctx.trigger_field];
      if (triggerValue === null || triggerValue === undefined) return null;
      return String(triggerValue);
    }
    default:
      return null;
  }
}
