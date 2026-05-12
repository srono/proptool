import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getLastActivityDate } from '../utils';

// Feature: contacts-list-page, Property 2: Last activity is the more recent of last_contacted_at and last_inbound_at

// --- Generators ---

/** Generate a valid ISO date string using integer timestamps to avoid invalid date issues */
const isoDateArb: fc.Arbitrary<string> = fc.integer({
  min: new Date('2000-01-01T00:00:00.000Z').getTime(),
  max: new Date('2030-12-31T23:59:59.999Z').getTime(),
}).map((ts) => new Date(ts).toISOString());

/** Generate a nullable ISO date string */
const nullableDateArb: fc.Arbitrary<string | null> = fc.oneof(
  isoDateArb,
  fc.constant(null)
);

// --- Property Tests ---

/**
 * Feature: contacts-list-page, Property 2: Last activity is the more recent of last_contacted_at and last_inbound_at
 *
 * **Validates: Requirements 2.2, 2.3**
 *
 * For any pair of nullable date strings, `getLastActivityDate` returns the later one
 * or null if both are null.
 */
describe('Feature: contacts-list-page, Property 2: Last activity is the more recent of last_contacted_at and last_inbound_at', () => {
  it('returns null when both dates are null', () => {
    fc.assert(
      fc.property(fc.constant(null), fc.constant(null), (lastContactedAt, lastInboundAt) => {
        const result = getLastActivityDate(lastContactedAt, lastInboundAt);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('returns the more recent of the two dates when both are present', () => {
    fc.assert(
      fc.property(isoDateArb, isoDateArb, (lastContactedAt, lastInboundAt) => {
        const result = getLastActivityDate(lastContactedAt, lastInboundAt);

        expect(result).not.toBeNull();

        const contacted = new Date(lastContactedAt);
        const inbound = new Date(lastInboundAt);
        const expected = contacted >= inbound ? contacted : inbound;

        expect(result!.getTime()).toBe(expected.getTime());
      }),
      { numRuns: 100 }
    );
  });

  it('returns the non-null date when only last_contacted_at is present', () => {
    fc.assert(
      fc.property(isoDateArb, (lastContactedAt) => {
        const result = getLastActivityDate(lastContactedAt, null);

        expect(result).not.toBeNull();
        expect(result!.getTime()).toBe(new Date(lastContactedAt).getTime());
      }),
      { numRuns: 100 }
    );
  });

  it('returns the non-null date when only last_inbound_at is present', () => {
    fc.assert(
      fc.property(isoDateArb, (lastInboundAt) => {
        const result = getLastActivityDate(null, lastInboundAt);

        expect(result).not.toBeNull();
        expect(result!.getTime()).toBe(new Date(lastInboundAt).getTime());
      }),
      { numRuns: 100 }
    );
  });

  it('for any pair of nullable dates, returns the later one or null if both null', () => {
    fc.assert(
      fc.property(nullableDateArb, nullableDateArb, (lastContactedAt, lastInboundAt) => {
        const result = getLastActivityDate(lastContactedAt, lastInboundAt);

        if (lastContactedAt === null && lastInboundAt === null) {
          expect(result).toBeNull();
        } else if (lastContactedAt === null) {
          expect(result).not.toBeNull();
          expect(result!.getTime()).toBe(new Date(lastInboundAt!).getTime());
        } else if (lastInboundAt === null) {
          expect(result).not.toBeNull();
          expect(result!.getTime()).toBe(new Date(lastContactedAt).getTime());
        } else {
          expect(result).not.toBeNull();
          const contacted = new Date(lastContactedAt);
          const inbound = new Date(lastInboundAt);
          const expected = contacted >= inbound ? contacted : inbound;
          expect(result!.getTime()).toBe(expected.getTime());
        }
      }),
      { numRuns: 100 }
    );
  });
});
