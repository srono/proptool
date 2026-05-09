import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatListingSnippet } from '../listing-snippet';
import type { Listing, PropertyType, Tenure, ListingType, ListingStatus, HdbType } from '@propagent/shared';

// --- Generators ---

const propertyTypeArb: fc.Arbitrary<PropertyType> = fc.constantFrom('hdb', 'condo', 'landed', 'commercial');
const tenureArb: fc.Arbitrary<Tenure> = fc.constantFrom('freehold', '99yr', '999yr');
const listingStatusArb: fc.Arbitrary<ListingStatus> = fc.constantFrom('draft', 'live', 'under_offer', 'sold', 'rented', 'withdrawn');
const hdbTypeArb: fc.Arbitrary<HdbType | null> = fc.constantFrom(null, '2room', '3room', '4room', '5room', 'executive');

/** Generate a non-empty address string (no newlines to avoid breaking line-based assertions) */
const addressArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0 && !s.includes('\n'));

/** Generate a district string like D01-D28 */
const districtArb = fc.integer({ min: 1, max: 28 }).map(n => `D${n.toString().padStart(2, '0')}`);

/** Generate a positive floor area */
const floorAreaArb = fc.integer({ min: 100, max: 50000 });

/** Generate a positive price */
const priceArb = fc.integer({ min: 1, max: 100_000_000 });

/** Generate a description: either null, short (≤200 chars), or long (>200 chars) */
const descriptionArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0 && !s.includes('\n')),
  fc.string({ minLength: 201, maxLength: 400 }).filter(s => s.trim().length > 0 && !s.includes('\n'))
);

/** Build a sale listing arbitrary */
function saleListing(): fc.Arbitrary<Listing> {
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
    asking_price: priceArb,
    psf: fc.oneof(fc.constant(null), priceArb),
    asking_rental: fc.constant(null),
    listing_status: listingStatusArb,
    listing_type: fc.constant('sale' as ListingType),
    floor: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 5 })),
    unit_number: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 10 })),
    completion_year: fc.oneof(fc.constant(null), fc.integer({ min: 1960, max: 2030 })),
    media_urls: fc.constant([] as string[]),
    description: descriptionArb,
    is_exclusive: fc.boolean(),
    exclusivity_expiry: fc.constant(null),
    created_at: fc.constant('2024-01-01T00:00:00Z'),
    updated_at: fc.constant('2024-01-01T00:00:00Z'),
  });
}

/** Build a rental listing arbitrary */
function rentalListing(): fc.Arbitrary<Listing> {
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
    asking_price: fc.constant(null),
    psf: fc.constant(null),
    asking_rental: priceArb,
    listing_status: listingStatusArb,
    listing_type: fc.constant('rental' as ListingType),
    floor: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 5 })),
    unit_number: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 10 })),
    completion_year: fc.oneof(fc.constant(null), fc.integer({ min: 1960, max: 2030 })),
    media_urls: fc.constant([] as string[]),
    description: descriptionArb,
    is_exclusive: fc.boolean(),
    exclusivity_expiry: fc.constant(null),
    created_at: fc.constant('2024-01-01T00:00:00Z'),
    updated_at: fc.constant('2024-01-01T00:00:00Z'),
  });
}

// --- Helper: map property_type to expected display label ---
function expectedPropertyTypeLabel(type: PropertyType): string {
  switch (type) {
    case 'hdb': return 'HDB';
    case 'condo': return 'Condo';
    case 'landed': return 'Landed';
    case 'commercial': return 'Commercial';
  }
}

function expectedTenureLabel(tenure: Tenure): string {
  switch (tenure) {
    case 'freehold': return 'Freehold';
    case '99yr': return '99-year Leasehold';
    case '999yr': return '999-year Leasehold';
  }
}

// --- Property Tests ---

describe('Feature: ai-reply-suggestions, Property 4: Listing Snippet Formatting (Sale)', () => {
  /**
   * **Validates: Requirements 4.3, 4.7, 4.9**
   *
   * For any listing with listing_type === 'sale' and non-null asking_price,
   * the formatted snippet SHALL contain: the property_type, address, district,
   * floor_area_sqft with "sqft" unit, tenure, asking_price formatted as "S$"
   * with thousand separators, and PSF. If a description exists and exceeds 200
   * characters, it SHALL be truncated to 200 characters followed by "…".
   * If the description is ≤ 200 characters, it SHALL appear unchanged.
   */
  it('snippet contains property_type, address, district, sqft, tenure, formatted price, and PSF for sale listings', () => {
    fc.assert(
      fc.property(saleListing(), (listing) => {
        const result = formatListingSnippet(listing);

        // Must contain property type label
        const typeLabel = expectedPropertyTypeLabel(listing.property_type);
        expect(result).toContain(typeLabel);

        // Must contain address
        expect(result).toContain(listing.address);

        // Must contain district
        expect(result).toContain(listing.district);

        // Must contain floor area with "sqft" unit
        const formattedSqft = listing.floor_area_sqft.toLocaleString('en-US');
        expect(result).toContain(`${formattedSqft} sqft`);

        // Must contain tenure label
        const tenureLabel = expectedTenureLabel(listing.tenure);
        expect(result).toContain(tenureLabel);

        // Must contain asking price formatted as S$ with thousand separators
        const formattedPrice = `S$${Math.round(listing.asking_price!).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        expect(result).toContain(formattedPrice);

        // If PSF is non-null, must contain PSF formatted value with "psf"
        if (listing.psf != null) {
          const formattedPsf = `S$${Math.round(listing.psf).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
          expect(result).toContain(`${formattedPsf} psf`);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('description is truncated to 200 chars with "…" when exceeding 200 characters', () => {
    // Use only sale listings with long descriptions
    const longDescSaleListing = saleListing().map(l => ({
      ...l,
      description: 'X'.repeat(250),
    }));

    fc.assert(
      fc.property(longDescSaleListing, (listing) => {
        const result = formatListingSnippet(listing);
        const descLine = result.split('\n').find(line => line.startsWith('📝'));

        expect(descLine).toBeDefined();
        // The description content after "📝 " should be exactly 200 chars + "…"
        const descContent = descLine!.slice(3); // Remove "📝 " prefix
        expect(descContent.length).toBe(201); // 200 chars + 1 char for "…"
        expect(descContent.endsWith('…')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('description appears unchanged when ≤ 200 characters', () => {
    // Use sale listings with short descriptions (1-200 chars)
    const shortDescArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0 && !s.includes('\n'));
    const shortDescSaleListing = saleListing().chain(l =>
      shortDescArb.map(desc => ({ ...l, description: desc }))
    );

    fc.assert(
      fc.property(shortDescSaleListing, (listing) => {
        const result = formatListingSnippet(listing);
        const descLine = result.split('\n').find(line => line.startsWith('📝'));

        expect(descLine).toBeDefined();
        expect(descLine).toBe(`📝 ${listing.description}`);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ai-reply-suggestions, Property 5: Listing Snippet Formatting (Rental)', () => {
  /**
   * **Validates: Requirements 4.4, 4.7, 4.9**
   *
   * For any listing with listing_type === 'rental' and non-null asking_rental,
   * the formatted snippet SHALL contain: the property_type, address, district,
   * floor_area_sqft with "sqft" unit, tenure, and asking_rental formatted as
   * "S$" with thousand separators followed by "/mo". If a description exists
   * and exceeds 200 characters, it SHALL be truncated to 200 characters
   * followed by "…".
   */
  it('snippet contains property_type, address, district, sqft, tenure, and formatted rental with "/mo"', () => {
    fc.assert(
      fc.property(rentalListing(), (listing) => {
        const result = formatListingSnippet(listing);

        // Must contain property type label
        const typeLabel = expectedPropertyTypeLabel(listing.property_type);
        expect(result).toContain(typeLabel);

        // Must contain address
        expect(result).toContain(listing.address);

        // Must contain district
        expect(result).toContain(listing.district);

        // Must contain floor area with "sqft" unit
        const formattedSqft = listing.floor_area_sqft.toLocaleString('en-US');
        expect(result).toContain(`${formattedSqft} sqft`);

        // Must contain tenure label
        const tenureLabel = expectedTenureLabel(listing.tenure);
        expect(result).toContain(tenureLabel);

        // Must contain asking rental formatted as S$ with thousand separators followed by "/mo"
        const formattedRental = `S$${Math.round(listing.asking_rental!).toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo`;
        expect(result).toContain(formattedRental);
      }),
      { numRuns: 100 }
    );
  });

  it('description is truncated to 200 chars with "…" when exceeding 200 characters', () => {
    const longDescRentalListing = rentalListing().map(l => ({
      ...l,
      description: 'Y'.repeat(300),
    }));

    fc.assert(
      fc.property(longDescRentalListing, (listing) => {
        const result = formatListingSnippet(listing);
        const descLine = result.split('\n').find(line => line.startsWith('📝'));

        expect(descLine).toBeDefined();
        const descContent = descLine!.slice(3); // Remove "📝 " prefix
        expect(descContent.length).toBe(201); // 200 chars + 1 char for "…"
        expect(descContent.endsWith('…')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('description appears unchanged when ≤ 200 characters', () => {
    const shortDescArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0 && !s.includes('\n'));
    const shortDescRentalListing = rentalListing().chain(l =>
      shortDescArb.map(desc => ({ ...l, description: desc }))
    );

    fc.assert(
      fc.property(shortDescRentalListing, (listing) => {
        const result = formatListingSnippet(listing);
        const descLine = result.split('\n').find(line => line.startsWith('📝'));

        expect(descLine).toBeDefined();
        expect(descLine).toBe(`📝 ${listing.description}`);
      }),
      { numRuns: 100 }
    );
  });
});
