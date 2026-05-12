import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeMopDate } from '../mop-calculator';
import type { MopInput } from '../mop-calculator';
import { addYears } from 'date-fns';

// --- Generators ---

/** Generate a non-HDB property type */
const nonHdbPropertyTypeArb = fc.constantFrom('none', 'private', 'landed', 'commercial');

/** Generate a valid ISO date string (YYYY-MM-DD) */
const dateStringArb = fc.date({
  min: new Date('1990-01-01'),
  max: new Date('2050-12-31'),
}).filter(d => !isNaN(d.getTime())).map(d => d.toISOString().split('T')[0]);

/** Generate an arbitrary MopInput */
const mopInputArb: fc.Arbitrary<MopInput> = fc.record({
  owned_property_type: fc.oneof(
    fc.constant('hdb'),
    nonHdbPropertyTypeArb
  ),
  owned_property_key_collection_date: fc.oneof(dateStringArb, fc.constant(null)),
  mop_date_manual_override: fc.boolean(),
});

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 1: MOP Date Computation
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
 *
 * For any contact update where owned_property_type, owned_property_key_collection_date,
 * or mop_date fields change, the resulting mop_date and mop_date_manual_override values SHALL satisfy:
 * - If owned_property_type ≠ "hdb" → mop_date is null AND mop_date_manual_override is false
 * - If owned_property_type = "hdb" AND mop_date_manual_override is false AND
 *   owned_property_key_collection_date is not null → mop_date equals key_collection_date + 5 years exactly
 * - If owned_property_type = "hdb" AND mop_date_manual_override is true → mop_date preserves
 *   (returns null from computeMopDate, override stays true)
 * - If HDB with no key date and no override → mop_date is null
 */
describe('Feature: nurture-playbooks, Property 1: MOP Date Computation', () => {
  it('non-HDB property type → mop_date is null AND mop_date_manual_override is false', () => {
    fc.assert(
      fc.property(
        nonHdbPropertyTypeArb,
        fc.oneof(dateStringArb, fc.constant(null)),
        fc.boolean(),
        (propertyType, keyDate, override) => {
          const input: MopInput = {
            owned_property_type: propertyType,
            owned_property_key_collection_date: keyDate,
            mop_date_manual_override: override,
          };
          const result = computeMopDate(input);
          expect(result.mop_date).toBeNull();
          expect(result.mop_date_manual_override).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('HDB with key date and no manual override → mop_date equals key_collection_date + 5 years', () => {
    fc.assert(
      fc.property(
        dateStringArb,
        (keyDateStr) => {
          const input: MopInput = {
            owned_property_type: 'hdb',
            owned_property_key_collection_date: keyDateStr,
            mop_date_manual_override: false,
          };
          const result = computeMopDate(input);

          const expectedMop = addYears(new Date(keyDateStr), 5);
          const expectedMopStr = expectedMop.toISOString().split('T')[0];

          expect(result.mop_date).toBe(expectedMopStr);
          expect(result.mop_date_manual_override).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('HDB with manual override → mop_date is null (preserves agent value) AND override stays true', () => {
    fc.assert(
      fc.property(
        fc.oneof(dateStringArb, fc.constant(null)),
        (keyDate) => {
          const input: MopInput = {
            owned_property_type: 'hdb',
            owned_property_key_collection_date: keyDate,
            mop_date_manual_override: true,
          };
          const result = computeMopDate(input);
          expect(result.mop_date).toBeNull();
          expect(result.mop_date_manual_override).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('HDB with no key date and no override → mop_date is null', () => {
    const input: MopInput = {
      owned_property_type: 'hdb',
      owned_property_key_collection_date: null,
      mop_date_manual_override: false,
    };
    const result = computeMopDate(input);
    expect(result.mop_date).toBeNull();
    expect(result.mop_date_manual_override).toBe(false);
  });

  it('all four cases hold for arbitrary MopInput values', () => {
    fc.assert(
      fc.property(
        mopInputArb,
        (input) => {
          const result = computeMopDate(input);

          if (input.owned_property_type !== 'hdb') {
            // Case 1: non-HDB → null mop_date, override false
            expect(result.mop_date).toBeNull();
            expect(result.mop_date_manual_override).toBe(false);
          } else if (input.mop_date_manual_override) {
            // Case 3: HDB with manual override → null mop_date, override true
            expect(result.mop_date).toBeNull();
            expect(result.mop_date_manual_override).toBe(true);
          } else if (input.owned_property_key_collection_date) {
            // Case 2: HDB, no override, key date present → compute mop_date
            const expectedMop = addYears(new Date(input.owned_property_key_collection_date), 5);
            const expectedMopStr = expectedMop.toISOString().split('T')[0];
            expect(result.mop_date).toBe(expectedMopStr);
            expect(result.mop_date_manual_override).toBe(false);
          } else {
            // Case 4: HDB, no override, no key date → null
            expect(result.mop_date).toBeNull();
            expect(result.mop_date_manual_override).toBe(false);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
