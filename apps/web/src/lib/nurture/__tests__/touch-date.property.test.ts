import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeTouchDate } from '../touch-date';
import { addDays } from 'date-fns';

// --- Generators ---

/** Generate a trigger date within a reasonable range (valid dates only) */
const triggerDateArb = fc.date({
  min: new Date('1990-01-01'),
  max: new Date('2060-12-31'),
  noInvalidDate: true,
});

/** Generate offset_days in the valid range [-365, 365] */
const offsetDaysArb = fc.integer({ min: -365, max: 365 });

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 4: Touch Date Computation
 *
 * **Validates: Requirements 3.2, 4.4, 4.8**
 *
 * For any contact with a non-null trigger field value and any playbook step with an
 * offset_days value in [-365, 365], the computed touch_date SHALL equal the trigger field
 * date plus offset_days calendar days exactly. Negative offsets produce dates before the
 * trigger, positive offsets produce dates after, and zero produces the trigger date itself.
 */
describe('Feature: nurture-playbooks, Property 4: Touch Date Computation', () => {
  it('touch_date equals trigger_date + offset_days calendar days for arbitrary inputs', () => {
    fc.assert(
      fc.property(
        triggerDateArb,
        offsetDaysArb,
        (triggerDate, offsetDays) => {
          const result = computeTouchDate(triggerDate, offsetDays);
          const expected = addDays(triggerDate, offsetDays);

          expect(result.getFullYear()).toBe(expected.getFullYear());
          expect(result.getMonth()).toBe(expected.getMonth());
          expect(result.getDate()).toBe(expected.getDate());
          expect(result.getTime()).toBe(expected.getTime());
        }
      ),
      { numRuns: 200 }
    );
  });

  it('zero offset produces the trigger date itself', () => {
    fc.assert(
      fc.property(
        triggerDateArb,
        (triggerDate) => {
          const result = computeTouchDate(triggerDate, 0);
          expect(result.getTime()).toBe(triggerDate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('positive offset produces a date after the trigger date', () => {
    fc.assert(
      fc.property(
        triggerDateArb,
        fc.integer({ min: 1, max: 365 }),
        (triggerDate, offsetDays) => {
          const result = computeTouchDate(triggerDate, offsetDays);
          expect(result.getTime()).toBeGreaterThan(triggerDate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('negative offset produces a date before the trigger date', () => {
    fc.assert(
      fc.property(
        triggerDateArb,
        fc.integer({ min: -365, max: -1 }),
        (triggerDate, offsetDays) => {
          const result = computeTouchDate(triggerDate, offsetDays);
          expect(result.getTime()).toBeLessThan(triggerDate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the difference in calendar days between touch_date and trigger_date equals offset_days', () => {
    fc.assert(
      fc.property(
        triggerDateArb,
        offsetDaysArb,
        (triggerDate, offsetDays) => {
          const result = computeTouchDate(triggerDate, offsetDays);

          // Compute difference in milliseconds and convert to days
          const diffMs = result.getTime() - triggerDate.getTime();
          const diffDays = diffMs / (24 * 60 * 60 * 1000);

          expect(diffDays).toBe(offsetDays);
        }
      ),
      { numRuns: 200 }
    );
  });
});
