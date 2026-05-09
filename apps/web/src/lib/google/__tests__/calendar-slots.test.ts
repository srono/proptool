import { describe, it, expect } from 'vitest';
import { computeAvailableSlots, type FreeBusyPeriod } from '../calendar';

describe('computeAvailableSlots', () => {
  // Use a fixed date: Monday 16 Jun 2025, 09:00 SGT = 01:00 UTC
  const fromDate = new Date('2025-06-16T01:00:00.000Z'); // 09:00 SGT
  const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  it('returns up to 3 slots when no busy periods exist', () => {
    const slots = computeAvailableSlots([], fromDate, toDate);

    expect(slots.length).toBe(3);
    // All slots should be 60 minutes
    for (const slot of slots) {
      const start = new Date(slot.start).getTime();
      const end = new Date(slot.end).getTime();
      expect(end - start).toBe(60 * 60 * 1000);
    }
  });

  it('returns slots that do not overlap with busy periods', () => {
    // Busy from 09:00 to 10:30 SGT on June 16
    const busyPeriods: FreeBusyPeriod[] = [
      {
        start: '2025-06-16T01:00:00.000Z', // 09:00 SGT
        end: '2025-06-16T02:30:00.000Z',   // 10:30 SGT
      },
    ];

    const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

    expect(slots.length).toBe(3);
    // First slot should start at 10:30 SGT (after busy period)
    expect(slots[0].start).toBe('2025-06-16T02:30:00.000Z');
  });

  it('skips gaps shorter than 60 minutes', () => {
    // Busy from 09:00-09:30, then 10:00-19:00 SGT on June 16
    // Gap between 09:30 and 10:00 is only 30 minutes — too short
    const busyPeriods: FreeBusyPeriod[] = [
      {
        start: '2025-06-16T01:00:00.000Z', // 09:00 SGT
        end: '2025-06-16T01:30:00.000Z',   // 09:30 SGT
      },
      {
        start: '2025-06-16T02:00:00.000Z', // 10:00 SGT
        end: '2025-06-16T11:00:00.000Z',   // 19:00 SGT
      },
    ];

    const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

    // First slot should be on the next day since June 16 is fully busy
    expect(slots.length).toBeGreaterThan(0);
    const firstSlotDate = new Date(slots[0].start);
    // Should be June 17 or later
    expect(firstSlotDate.getTime()).toBeGreaterThanOrEqual(
      new Date('2025-06-17T01:00:00.000Z').getTime()
    );
  });

  it('returns slots in chronological order', () => {
    const slots = computeAvailableSlots([], fromDate, toDate);

    for (let i = 1; i < slots.length; i++) {
      const prev = new Date(slots[i - 1].start).getTime();
      const curr = new Date(slots[i].start).getTime();
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it('returns at most 3 slots', () => {
    const slots = computeAvailableSlots([], fromDate, toDate);
    expect(slots.length).toBeLessThanOrEqual(3);
  });

  it('handles overlapping busy periods correctly', () => {
    // Two overlapping busy periods
    const busyPeriods: FreeBusyPeriod[] = [
      {
        start: '2025-06-16T01:00:00.000Z', // 09:00 SGT
        end: '2025-06-16T04:00:00.000Z',   // 12:00 SGT
      },
      {
        start: '2025-06-16T03:00:00.000Z', // 11:00 SGT (overlaps with above)
        end: '2025-06-16T05:00:00.000Z',   // 13:00 SGT
      },
    ];

    const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

    expect(slots.length).toBe(3);
    // First slot should start at 13:00 SGT (after merged busy period)
    expect(slots[0].start).toBe('2025-06-16T05:00:00.000Z');
  });

  it('returns empty array when entire window is busy', () => {
    // Make all 7 days completely busy during business hours
    const busyPeriods: FreeBusyPeriod[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 10 * 60 * 60 * 1000); // 10 hours
      busyPeriods.push({
        start: dayStart.toISOString(),
        end: dayEnd.toISOString(),
      });
    }

    const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);
    expect(slots.length).toBe(0);
  });

  it('formats slots with en-SG locale', () => {
    const slots = computeAvailableSlots([], fromDate, toDate);

    expect(slots.length).toBeGreaterThan(0);
    // Check that formatted string contains expected patterns
    // Should have day name, date, and time with AM/PM
    expect(slots[0].formatted).toMatch(/\w+/); // Has some text
    expect(slots[0].formatted).toContain('–'); // Has en-dash separator
  });

  it('slots start and end within business hours (09:00-19:00 SGT)', () => {
    const busyPeriods: FreeBusyPeriod[] = [
      {
        start: '2025-06-16T03:00:00.000Z', // 11:00 SGT
        end: '2025-06-16T05:00:00.000Z',   // 13:00 SGT
      },
    ];

    const slots = computeAvailableSlots(busyPeriods, fromDate, toDate);

    for (const slot of slots) {
      const start = new Date(slot.start);
      const end = new Date(slot.end);

      // Get SGT hours
      const startHourSGT = (start.getUTCHours() + 8) % 24;
      const endHourSGT = (end.getUTCHours() + 8) % 24;
      const endMinSGT = end.getUTCMinutes();

      expect(startHourSGT).toBeGreaterThanOrEqual(9);
      expect(startHourSGT).toBeLessThan(19);
      // End can be exactly 19:00
      if (endHourSGT === 19) {
        expect(endMinSGT).toBe(0);
      } else {
        expect(endHourSGT).toBeGreaterThanOrEqual(9);
        expect(endHourSGT).toBeLessThan(19);
      }
    }
  });
});
