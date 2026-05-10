import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterListingsForPicker, type PickerListing } from '../listing-picker-filter';

// --- Generators ---

/** Generate a valid listing status */
const listingStatusArb = fc.constantFrom(
  'draft',
  'live',
  'under_offer',
  'sold',
  'rented',
  'withdrawn'
);

/** Generate a non-empty address string */
const addressArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

/** Generate an optional project_name */
const projectNameArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0)
);

/** Generate a valid ISO date string with varying timestamps for ordering tests */
const createdAtArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2025-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

/** Build a PickerListing arbitrary */
function pickerListingArb(): fc.Arbitrary<PickerListing> {
  return fc.record({
    id: fc.uuid(),
    address: addressArb,
    listing_status: listingStatusArb,
    created_at: createdAtArb,
    project_name: projectNameArb,
  });
}

/** Generate a short query (0-1 chars) that should return empty */
const shortQueryArb = fc.oneof(
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 1 })
);

/** Generate a query of 2+ characters */
const longQueryArb = fc
  .string({ minLength: 2, maxLength: 20 })
  .filter((s) => s.length >= 2);

// --- Property Tests ---

/**
 * Feature: listing-ad-copy-assistant, Property 1: Listing Picker Search Correctness
 *
 * **Validates: Requirements 2.3, 2.4**
 *
 * For any set of listings and any search query of 2+ characters, the listing picker
 * filter function SHALL return only listings whose address, project name, or status
 * contains the query (case-insensitive), return at most 20 results, and return them
 * ordered by created_at descending. For any query of fewer than 2 characters, the
 * function SHALL return an empty result set.
 */
describe('Feature: listing-ad-copy-assistant, Property 1: Listing Picker Search Correctness', () => {
  it('returns empty array for queries with fewer than 2 characters', () => {
    fc.assert(
      fc.property(
        fc.array(pickerListingArb(), { minLength: 0, maxLength: 30 }),
        shortQueryArb,
        (listings, query) => {
          const result = filterListingsForPicker(listings, query);
          expect(result).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('results only contain listings matching the query in address, project_name, or listing_status', () => {
    fc.assert(
      fc.property(
        fc.array(pickerListingArb(), { minLength: 0, maxLength: 30 }),
        longQueryArb,
        (listings, query) => {
          const result = filterListingsForPicker(listings, query);
          const lowerQuery = query.toLowerCase();

          for (const listing of result) {
            const matchesAddress = listing.address
              .toLowerCase()
              .includes(lowerQuery);
            const matchesProjectName =
              listing.project_name != null &&
              listing.project_name.toLowerCase().includes(lowerQuery);
            const matchesStatus = listing.listing_status
              .toLowerCase()
              .includes(lowerQuery);

            expect(
              matchesAddress || matchesProjectName || matchesStatus
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns at most 20 results', () => {
    fc.assert(
      fc.property(
        fc.array(pickerListingArb(), { minLength: 0, maxLength: 50 }),
        longQueryArb,
        (listings, query) => {
          const result = filterListingsForPicker(listings, query);
          expect(result.length).toBeLessThanOrEqual(20);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('results are ordered by created_at descending', () => {
    fc.assert(
      fc.property(
        fc.array(pickerListingArb(), { minLength: 0, maxLength: 30 }),
        longQueryArb,
        (listings, query) => {
          const result = filterListingsForPicker(listings, query);

          for (let i = 1; i < result.length; i++) {
            const prevDate = new Date(result[i - 1].created_at).getTime();
            const currDate = new Date(result[i].created_at).getTime();
            expect(prevDate).toBeGreaterThanOrEqual(currDate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not miss any matching listing (completeness) within the 20-result cap', () => {
    fc.assert(
      fc.property(
        fc.array(pickerListingArb(), { minLength: 0, maxLength: 30 }),
        longQueryArb,
        (listings, query) => {
          const result = filterListingsForPicker(listings, query);
          const lowerQuery = query.toLowerCase();

          // Compute expected matches manually
          const allMatches = listings.filter((listing) => {
            if (listing.address.toLowerCase().includes(lowerQuery)) return true;
            if (
              listing.project_name != null &&
              listing.project_name.toLowerCase().includes(lowerQuery)
            )
              return true;
            if (listing.listing_status.toLowerCase().includes(lowerQuery))
              return true;
            return false;
          });

          // Result count should be min(allMatches.length, 20)
          expect(result.length).toBe(Math.min(allMatches.length, 20));
        }
      ),
      { numRuns: 100 }
    );
  });
});
