import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sortSteps } from '../step-ordering';
import type { OrderableStep } from '../step-ordering';

// --- Generators ---

/** Generate a valid offset_days value in [-365, 365] */
const offsetDaysArb = fc.integer({ min: -365, max: 365 });

/** Generate a valid sort_order (non-negative integer representing creation order) */
const sortOrderArb = fc.integer({ min: 0, max: 1000 });

/** Generate an arbitrary OrderableStep */
const orderableStepArb: fc.Arbitrary<OrderableStep> = fc.record({
  offset_days: offsetDaysArb,
  sort_order: sortOrderArb,
});

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 3: Step Display Ordering
 *
 * **Validates: Requirements 3.5**
 *
 * For any set of playbook steps, the display order SHALL be sorted by offset_days
 * ascending, with ties broken by creation order (sort_order). Formally: for any two
 * steps A and B where A appears before B in the sorted output, either
 * A.offset_days < B.offset_days, or A.offset_days == B.offset_days AND
 * A.sort_order < B.sort_order.
 */
describe('Feature: nurture-playbooks, Property 3: Step Display Ordering', () => {
  it('sorted output satisfies: A before B implies A.offset_days < B.offset_days OR (equal offset_days AND A.sort_order < B.sort_order)', () => {
    fc.assert(
      fc.property(
        fc.array(orderableStepArb, { minLength: 0, maxLength: 50 }),
        (steps) => {
          const sorted = sortSteps(steps);

          // For every consecutive pair in the sorted output, the ordering invariant holds
          for (let i = 0; i < sorted.length - 1; i++) {
            const a = sorted[i];
            const b = sorted[i + 1];

            const validOrder =
              a.offset_days < b.offset_days ||
              (a.offset_days === b.offset_days && a.sort_order <= b.sort_order);

            expect(validOrder).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('sorted output has the same length as the input', () => {
    fc.assert(
      fc.property(
        fc.array(orderableStepArb, { minLength: 0, maxLength: 50 }),
        (steps) => {
          const sorted = sortSteps(steps);
          expect(sorted.length).toBe(steps.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('sorted output is a permutation of the input (contains the same elements)', () => {
    fc.assert(
      fc.property(
        fc.array(orderableStepArb, { minLength: 0, maxLength: 50 }),
        (steps) => {
          const sorted = sortSteps(steps);

          // Every element in sorted should be reference-equal to an element in the input
          // since sortSteps spreads the array and sorts (no cloning of elements)
          for (const s of sorted) {
            expect(steps).toContain(s);
          }
          for (const s of steps) {
            expect(sorted).toContain(s);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('does not mutate the original input array', () => {
    fc.assert(
      fc.property(
        fc.array(orderableStepArb, { minLength: 0, maxLength: 50 }),
        (steps) => {
          const originalCopy = [...steps];
          sortSteps(steps);
          expect(steps).toEqual(originalCopy);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting is idempotent (sorting an already sorted array produces the same result)', () => {
    fc.assert(
      fc.property(
        fc.array(orderableStepArb, { minLength: 0, maxLength: 50 }),
        (steps) => {
          const sorted1 = sortSteps(steps);
          const sorted2 = sortSteps(sorted1);
          expect(sorted2).toEqual(sorted1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
