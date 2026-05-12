import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateSnoozeDate } from '../task-transitions';

// --- Constants ---

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * ONE_DAY_MS;

// --- Generators ---

/** Generate a date that is exactly within the valid range: ≥1 day and ≤90 days from now */
const validSnoozeDateArb = fc.integer({ min: ONE_DAY_MS + 1000, max: NINETY_DAYS_MS - 1000 }).map((ms) => {
  const now = new Date();
  return new Date(now.getTime() + ms);
});

/** Generate a date that is less than 1 day from now (too soon) */
const tooSoonDateArb = fc.integer({ min: 0, max: ONE_DAY_MS - 1 }).map((ms) => {
  const now = new Date();
  return new Date(now.getTime() + ms);
});

/** Generate a date in the past */
const pastDateArb = fc.integer({ min: 1, max: 365 * ONE_DAY_MS }).map((ms) => {
  const now = new Date();
  return new Date(now.getTime() - ms);
});

/** Generate a date that is more than 90 days from now (too far) */
const tooFarDateArb = fc.integer({ min: 1, max: 365 }).map((extraDays) => {
  const now = new Date();
  // 90 days + extra buffer + extra days
  return new Date(now.getTime() + NINETY_DAYS_MS + extraDays * ONE_DAY_MS + 60_000);
});

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 10: Snooze Date Validation
 *
 * **Validates: Requirements 5.4**
 *
 * For any date provided as a snooze due_at value, the validation SHALL accept it
 * if and only if the date is at least 1 day in the future AND at most 90 days
 * from the current date.
 */
describe('Feature: nurture-playbooks, Property 10: Snooze Date Validation', () => {
  it('accepts dates that are ≥1 day and ≤90 days from now', () => {
    fc.assert(
      fc.property(validSnoozeDateArb, (date) => {
        const result = validateSnoozeDate(date);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects dates that are less than 1 day from now', () => {
    fc.assert(
      fc.property(tooSoonDateArb, (date) => {
        const result = validateSnoozeDate(date);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects dates in the past', () => {
    fc.assert(
      fc.property(pastDateArb, (date) => {
        const result = validateSnoozeDate(date);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects dates that are more than 90 days from now', () => {
    fc.assert(
      fc.property(tooFarDateArb, (date) => {
        const result = validateSnoozeDate(date);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('validation accepts iff date is within [now + 1 day, now + 90 days]', () => {
    // Generate arbitrary offsets in milliseconds covering a wide range
    // from -30 days to +120 days to test both valid and invalid ranges
    const arbitraryOffsetMs = fc.integer({
      min: -30 * ONE_DAY_MS,
      max: 120 * ONE_DAY_MS,
    });

    fc.assert(
      fc.property(arbitraryOffsetMs, (offsetMs) => {
        const now = new Date();
        const testDate = new Date(now.getTime() + offsetMs);
        const result = validateSnoozeDate(testDate);

        // Recompute boundaries as the function does
        const minDate = new Date(now.getTime() + ONE_DAY_MS);
        const maxDate = new Date(now.getTime() + NINETY_DAYS_MS);

        const expectedValid = testDate >= minDate && testDate <= maxDate;

        expect(result.valid).toBe(expectedValid);
      }),
      { numRuns: 200 }
    );
  });
});
