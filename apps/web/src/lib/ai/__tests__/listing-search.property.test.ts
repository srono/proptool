import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterListings } from '../listing-search';
import type { Listing, PropertyType, Tenure, ListingStatus, ListingType, HdbType } from '@propagent/shared';

// --- Generators ---

const propertyTypeArb: fc.Arbitrary<PropertyType> = fc.constantFrom('hdb', 'condo', 'landed', 'commercial');
const tenureArb: fc.Arbitrary<Tenure> = fc.constantFrom('freehold', '99yr', '999yr');
const listingTypeArb: fc.Arbitrary<ListingType> = fc.constantFrom('sale', 'rental');
const hdbTypeArb: fc.Arbitrary<HdbType | null> = fc.constantFrom(null, '2room', '3room', '4room', '5room', 'executive');

/** All possible listing statuses */
const allStatusArb: fc.Arbitrary<ListingStatus> = fc.constantFrom('draft', 'live', 'under_offer', 'sold', 'rented', 'withdrawn');

/** Only non-live statuses */
const nonLiveStatusArb: fc.Arbitrary<ListingStatus> = fc.constantFrom('draft', 'under_offer', 'sold', 'rented', 'withdrawn');

/** Generate a non-empty address string (no newlines) */
const addressArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && !s.includes('\n'));

/** Generate a district string like D01-D28 */
const districtArb = fc.integer({ min: 1, max: 28 }).map(n => `D${n.toString().padStart(2, '0')}`);

/** Generate a positive floor area */
const floorAreaArb = fc.integer({ min: 100, max: 50000 });

/** Generate a positive price */
const priceArb = fc.integer({ min: 1, max: 100_000_000 });

/** Build a listing arbitrary with configurable status */
function listingArb(statusArb: fc.Arbitrary<ListingStatus> = allStatusArb): fc.Arbitrary<Listing> {
  return fc.record({
    id: fc.uuid(),
    tenant_id: fc.uuid(),
    agent_id: fc.uuid(),
    address: addressArb,
    postal_code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.replace(/[^0-9]/g, '0').slice(0, 6).padEnd(6, '0')),
    district: districtArb,
    property_type: propertyTypeArb,
    hdb_type: hdbTypeArb,
    tenure: tenureArb,
    floor_area_sqft: floorAreaArb,
    asking_price: fc.oneof(fc.constant(null), priceArb),
    psf: fc.oneof(fc.constant(null), priceArb),
    asking_rental: fc.oneof(fc.constant(null), priceArb),
    listing_status: statusArb,
    listing_type: listingTypeArb,
    floor: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 5 })),
    unit_number: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 10 })),
    completion_year: fc.oneof(fc.constant(null), fc.integer({ min: 1960, max: 2030 })),
    media_urls: fc.constant([] as string[]),
    description: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 200 })),
    is_exclusive: fc.boolean(),
    exclusivity_expiry: fc.constant(null),
    created_at: fc.constant('2024-01-01T00:00:00Z'),
    updated_at: fc.constant('2024-01-01T00:00:00Z'),
  });
}

/** Generate a short query (0-1 chars) */
const shortQueryArb = fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 1 }));

/** Generate a query of 2+ characters */
const longQueryArb = fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.length >= 2);

// --- Property Tests ---

/**
 * Feature: ai-reply-suggestions, Property 7: Listing Search Filtering
 *
 * **Validates: Requirements 4.2**
 *
 * For any array of listings and any search query string:
 * (a) if the query length is < 2, no filtering is applied and all listings with
 *     listing_status === 'live' are returned;
 * (b) if the query length is ≥ 2, only listings with listing_status === 'live' AND
 *     a case-insensitive substring match in address, district, or property_type
 *     SHALL be returned;
 * (c) no listing with listing_status !== 'live' SHALL ever appear in results.
 */
describe('Feature: ai-reply-suggestions, Property 7: Listing Search Filtering', () => {
  it('(a) returns all live listings when query length < 2', () => {
    fc.assert(
      fc.property(
        fc.array(listingArb(), { minLength: 0, maxLength: 20 }),
        shortQueryArb,
        (listings, query) => {
          const result = filterListings(listings, query);
          const expectedLive = listings.filter(l => l.listing_status === 'live');

          // All live listings should be returned
          expect(result.length).toBe(expectedLive.length);

          // Every returned listing should be live
          for (const listing of result) {
            expect(listing.listing_status).toBe('live');
          }

          // The returned set should match exactly the live listings (by id)
          const resultIds = new Set(result.map(l => l.id));
          const expectedIds = new Set(expectedLive.map(l => l.id));
          expect(resultIds).toEqual(expectedIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(b) returns only live listings matching address/district/property_type when query length ≥ 2', () => {
    fc.assert(
      fc.property(
        fc.array(listingArb(), { minLength: 0, maxLength: 20 }),
        longQueryArb,
        (listings, query) => {
          const result = filterListings(listings, query);
          const lowerQuery = query.toLowerCase();

          // Every returned listing must be live AND match the query
          for (const listing of result) {
            expect(listing.listing_status).toBe('live');

            const matchesAddress = listing.address.toLowerCase().includes(lowerQuery);
            const matchesDistrict = listing.district.toLowerCase().includes(lowerQuery);
            const matchesPropertyType = listing.property_type.toLowerCase().includes(lowerQuery);

            expect(matchesAddress || matchesDistrict || matchesPropertyType).toBe(true);
          }

          // Every live listing that matches should be in the result
          const liveMatching = listings.filter(l =>
            l.listing_status === 'live' && (
              l.address.toLowerCase().includes(lowerQuery) ||
              l.district.toLowerCase().includes(lowerQuery) ||
              l.property_type.toLowerCase().includes(lowerQuery)
            )
          );

          expect(result.length).toBe(liveMatching.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(c) no listing with listing_status !== "live" ever appears in results', () => {
    // Generate arrays that include non-live listings
    const mixedListingsArb = fc.tuple(
      fc.array(listingArb(fc.constant('live' as ListingStatus)), { minLength: 0, maxLength: 10 }),
      fc.array(listingArb(nonLiveStatusArb), { minLength: 1, maxLength: 10 })
    ).map(([live, nonLive]) => [...live, ...nonLive]);

    // Use any query (short or long)
    const anyQueryArb = fc.oneof(shortQueryArb, longQueryArb);

    fc.assert(
      fc.property(mixedListingsArb, anyQueryArb, (listings, query) => {
        const result = filterListings(listings, query);

        // No non-live listing should ever appear
        for (const listing of result) {
          expect(listing.listing_status).toBe('live');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('(b) correctly finds listings when query is a substring of address', () => {
    // Ensure we test with a query that is guaranteed to match
    const listingWithKnownAddress = listingArb(fc.constant('live' as ListingStatus)).map(l => ({
      ...l,
      address: 'Orchard Boulevard Tower',
    }));

    fc.assert(
      fc.property(
        fc.array(listingArb(), { minLength: 0, maxLength: 10 }),
        listingWithKnownAddress,
        (otherListings, targetListing) => {
          const allListings = [...otherListings, targetListing];
          const result = filterListings(allListings, 'orchard');

          // The target listing must be in the result
          const resultIds = result.map(l => l.id);
          expect(resultIds).toContain(targetListing.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
