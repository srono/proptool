import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeAvailableSlots, type FreeBusyPeriod } from '../calendar';

describe('Feature: ai-reply-suggestions, Property 3: Calendar Available Slot Computation', () => {
  // Fixed window: Monday 16 Jun 2025, 09:00 SGT = 01:00 UTC
  const fromDate = new Date('2025-06-16T01:00:00.000Z');
  const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Business hours in UTC: 09:00 SGT = 01:00 UTC, 19:00 SGT = 11:00 UTC
  const BUSINESS_START_UTC_HOUR = 1; // 09:00 SGT
  const BUSINESS_END_UTC_HOUR = 11;  // 19:00 SGT

  /**
   * Generator for random busy periods within the 7-day window.
   * Each busy period has a start and end within [fromDate, toDate].
   */
  const busyPeriodsArb: fc.Arbitrary<FreeBusyPeriod[]> = fc
    .array(
      fc
        .record({
          // Offset from fromDate in milliseconds (0 to 7 days)
          startOffset: fc.integer({ min: 0, max: 7 * 24 * 60 * 60 * 1000 - 1 }),
          // Duration in milliseconds (1 minute to 12 hours)
          duration: fc.integer({ min: 60 * 1000, max: 12 * 60 * 60 * 1000 }),
        })
        .map(({ startOffset, duration }) => {
          const start = new Date(fromDate.getTime() + startOffset);
          const end = new Date(
            Math.min(start.getTime() + duration, toDate.getTime())
          );
          return {
            start: start.toISOString(),
            end: end.toISOString(),
          };
        }),
      { minLength: 0, maxLength: 20 }
    );

  /**
   * **Validates: Requirements 3.3, 3.4**
   *
   * Property (a): Every slot starts and ends within business hours (09:00–19:00 SGT).
   */
  it('(a) every slot starts and ends within business hours (09:00–19:00 SGT)', () => {
    fc.assert(
      fc.property(busyPeriodsArb, (busyPeriods) => {
        const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

        for (const slot of slots) {
          const start = new Date(slot.start);
          const end = new Date(slot.end);

          // Get the SGT date for start to determine which day's business hours apply
          const startUTCHours = start.getUTCHours();
          const endUTCHours = end.getUTCHours();
          const endUTCMinutes = end.getUTCMinutes();

          // Start must be >= 01:00 UTC (09:00 SGT) on its day
          // and < 11:00 UTC (19:00 SGT) on its day
          expect(startUTCHours).toBeGreaterThanOrEqual(BUSINESS_START_UTC_HOUR);
          expect(startUTCHours).toBeLessThan(BUSINESS_END_UTC_HOUR);

          // End must be <= 19:00 SGT (11:00 UTC) on its day
          if (endUTCHours === BUSINESS_END_UTC_HOUR) {
            expect(endUTCMinutes).toBe(0);
          } else {
            expect(endUTCHours).toBeGreaterThanOrEqual(BUSINESS_START_UTC_HOUR);
            expect(endUTCHours).toBeLessThan(BUSINESS_END_UTC_HOUR);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3, 3.4**
   *
   * Property (b): Every slot has a duration of at least 60 minutes.
   */
  it('(b) every slot has a duration of at least 60 minutes', () => {
    fc.assert(
      fc.property(busyPeriodsArb, (busyPeriods) => {
        const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

        for (const slot of slots) {
          const start = new Date(slot.start).getTime();
          const end = new Date(slot.end).getTime();
          const durationMinutes = (end - start) / (60 * 1000);

          expect(durationMinutes).toBeGreaterThanOrEqual(60);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3, 3.4**
   *
   * Property (c): No slot overlaps with any busy period.
   */
  it('(c) no slot overlaps with any busy period', () => {
    fc.assert(
      fc.property(busyPeriodsArb, (busyPeriods) => {
        const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

        for (const slot of slots) {
          const slotStart = new Date(slot.start).getTime();
          const slotEnd = new Date(slot.end).getTime();

          for (const busy of busyPeriods) {
            const busyStart = new Date(busy.start).getTime();
            const busyEnd = new Date(busy.end).getTime();

            // Two intervals overlap if one starts before the other ends
            // and the other starts before the first ends
            const overlaps = slotStart < busyEnd && busyStart < slotEnd;
            expect(overlaps).toBe(false);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3, 3.4**
   *
   * Property (d): At most 3 slots are returned.
   */
  it('(d) at most 3 slots are returned', () => {
    fc.assert(
      fc.property(busyPeriodsArb, (busyPeriods) => {
        const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

        expect(slots.length).toBeLessThanOrEqual(3);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.3, 3.4**
   *
   * Property (e): Slots are in chronological order (earliest first).
   */
  it('(e) slots are in chronological order (earliest first)', () => {
    fc.assert(
      fc.property(busyPeriodsArb, (busyPeriods) => {
        const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

        for (let i = 1; i < slots.length; i++) {
          const prevStart = new Date(slots[i - 1].start).getTime();
          const currStart = new Date(slots[i].start).getTime();

          expect(currStart).toBeGreaterThan(prevStart);
        }
      }),
      { numRuns: 100 }
    );
  });
});
