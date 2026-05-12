import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  evaluateSegment,
  matchesSegment,
  ContactRecord,
} from '../segment-evaluator';
import type { FilterCondition, SegmentDefinition } from '../types';

// --- Generators ---

/** Generate a field name from a fixed set of known contact fields */
const fieldNameArb = fc.constantFrom(
  'owned_property_type',
  'owned_property_town',
  'owned_property_flat_type',
  'channel_preference',
  'status'
);

/** Generate a simple string value for eq/neq operators */
const stringValueArb = fc.constantFrom(
  'hdb',
  'private',
  'landed',
  'commercial',
  'none',
  'Tampines',
  'Bedok',
  'Jurong',
  'whatsapp',
  'email',
  'phone'
);

/** Generate an eq/neq filter condition */
const eqNeqConditionArb: fc.Arbitrary<FilterCondition> = fc.record({
  field: fieldNameArb,
  operator: fc.constantFrom('eq' as const, 'neq' as const),
  value: stringValueArb,
  source: fc.constant('contact' as const),
});

/** Generate an 'in' filter condition */
const inConditionArb: fc.Arbitrary<FilterCondition> = fc.record({
  field: fieldNameArb,
  operator: fc.constant('in' as const),
  value: fc.array(stringValueArb, { minLength: 1, maxLength: 4 }),
  source: fc.constant('contact' as const),
});

/** Generate a filter condition (eq, neq, or in — avoiding date operators for simplicity in AND logic testing) */
const filterConditionArb: fc.Arbitrary<FilterCondition> = fc.oneof(
  { weight: 3, arbitrary: eqNeqConditionArb },
  { weight: 1, arbitrary: inConditionArb }
);

/** Generate a non-empty conditions array (1-5 conditions for AND logic testing) */
const conditionsArb = fc.array(filterConditionArb, { minLength: 1, maxLength: 5 });

/** Generate a contact record with arbitrary field values (including possible nulls) */
const contactRecordArb: fc.Arbitrary<ContactRecord> = fc.record({
  id: fc.uuid(),
  owned_property_type: fc.oneof(
    fc.constantFrom('hdb', 'private', 'landed', 'commercial', 'none'),
    fc.constant(null)
  ),
  owned_property_town: fc.oneof(
    fc.constantFrom('Tampines', 'Bedok', 'Jurong', 'Woodlands'),
    fc.constant(null)
  ),
  owned_property_flat_type: fc.oneof(
    fc.constantFrom('3-room', '4-room', '5-room', 'executive'),
    fc.constant(null)
  ),
  channel_preference: fc.oneof(
    fc.constantFrom('whatsapp', 'email', 'phone', 'none'),
    fc.constant(null)
  ),
  status: fc.oneof(
    fc.constantFrom('active', 'inactive', 'closed'),
    fc.constant(null)
  ),
});

// --- Reference implementation for verification ---

/**
 * Reference implementation of condition matching, mirroring the logic
 * in segment-evaluator.ts for eq, neq, and in operators.
 */
function referenceMatchesCondition(
  contact: ContactRecord,
  condition: FilterCondition
): boolean {
  const fieldValue = contact[condition.field];

  // Null/undefined fields always exclude (requirement 12.5)
  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }

  switch (condition.operator) {
    case 'eq':
      return String(fieldValue) === String(condition.value);
    case 'neq':
      return String(fieldValue) !== String(condition.value);
    case 'in': {
      if (!Array.isArray(condition.value)) return false;
      return condition.value.includes(String(fieldValue));
    }
    default:
      return false;
  }
}

/**
 * Reference implementation of segment matching using AND logic.
 */
function referenceMatchesSegment(
  contact: ContactRecord,
  segment: SegmentDefinition
): boolean {
  if (!segment.conditions || segment.conditions.length === 0) {
    return true;
  }
  return segment.conditions.every((cond) =>
    referenceMatchesCondition(contact, cond)
  );
}

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 5: Segment Evaluation AND Logic
 *
 * **Validates: Requirements 4.2, 12.4, 12.5, 12.6**
 *
 * For any set of filter conditions and any contact, the contact is included in the segment
 * result if and only if ALL conditions are satisfied simultaneously. Additionally:
 * - If any condition references a field that is null on the contact, that condition is
 *   treated as not matched (contact excluded).
 * - If the conditions array is empty, all contacts in the tenant match.
 */
describe('Feature: nurture-playbooks, Property 5: Segment Evaluation AND Logic', () => {
  it('contact included iff ALL conditions satisfied (AND logic)', () => {
    fc.assert(
      fc.property(
        contactRecordArb,
        conditionsArb,
        (contact, conditions) => {
          const segment: SegmentDefinition = { conditions };
          const actual = matchesSegment(contact, segment);
          const expected = referenceMatchesSegment(contact, segment);
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('empty conditions array includes all contacts', () => {
    fc.assert(
      fc.property(
        fc.array(contactRecordArb, { minLength: 0, maxLength: 10 }),
        (contacts) => {
          const segment: SegmentDefinition = { conditions: [] };
          const result = evaluateSegment(contacts, segment);
          expect(result).toHaveLength(contacts.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('null field values cause condition to not match (contact excluded)', () => {
    fc.assert(
      fc.property(
        contactRecordArb,
        filterConditionArb,
        (contact, condition) => {
          // Force the field to be null
          const nullContact = { ...contact, [condition.field]: null };
          const segment: SegmentDefinition = { conditions: [condition] };
          expect(matchesSegment(nullContact, segment)).toBe(false);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('undefined field values cause condition to not match (contact excluded)', () => {
    fc.assert(
      fc.property(
        contactRecordArb,
        filterConditionArb,
        (contact, condition) => {
          // Force the field to be undefined
          const undefinedContact = { ...contact, [condition.field]: undefined };
          const segment: SegmentDefinition = { conditions: [condition] };
          expect(matchesSegment(undefinedContact, segment)).toBe(false);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('adding a failing condition to a matching segment excludes the contact', () => {
    fc.assert(
      fc.property(
        contactRecordArb,
        conditionsArb,
        (contact, conditions) => {
          const segment: SegmentDefinition = { conditions };

          // If the contact currently matches, adding a condition on a null field should exclude it
          if (matchesSegment(contact, segment)) {
            const extraCondition: FilterCondition = {
              field: 'nonexistent_field',
              operator: 'eq',
              value: 'anything',
              source: 'contact',
            };
            const extendedSegment: SegmentDefinition = {
              conditions: [...conditions, extraCondition],
            };
            // The contact doesn't have 'nonexistent_field', so it's undefined → excluded
            expect(matchesSegment(contact, extendedSegment)).toBe(false);
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it('evaluateSegment returns exactly the contacts that matchesSegment accepts', () => {
    fc.assert(
      fc.property(
        fc.array(contactRecordArb, { minLength: 1, maxLength: 10 }),
        conditionsArb,
        (contacts, conditions) => {
          const segment: SegmentDefinition = { conditions };
          const result = evaluateSegment(contacts, segment);
          const expectedContacts = contacts.filter((c) =>
            matchesSegment(c, segment)
          );
          expect(result).toHaveLength(expectedContacts.length);
          // Verify each result matches
          result.forEach((c) => {
            expect(matchesSegment(c, segment)).toBe(true);
          });
        }
      ),
      { numRuns: 300 }
    );
  });

  it('single condition: contact included iff that condition is satisfied', () => {
    fc.assert(
      fc.property(
        contactRecordArb,
        filterConditionArb,
        (contact, condition) => {
          const segment: SegmentDefinition = { conditions: [condition] };
          const actual = matchesSegment(contact, segment);
          const expected = referenceMatchesCondition(contact, condition);
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 500 }
    );
  });
});
