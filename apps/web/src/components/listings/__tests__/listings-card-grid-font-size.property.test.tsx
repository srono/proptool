import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ListingsCardGrid } from '../listings-card-grid';
import type { ListingWithSeller } from '@agentos/shared';

/**
 * Feature: ui-ux-consistency-fixes, Property 3: ListingCard minimum font size
 * Validates: Requirements 5.1, 5.2
 *
 * For any valid listing data, the rendered ListingsCardGrid output SHALL NOT
 * contain text-[9px], text-[10px], or any Tailwind arbitrary font-size class
 * with a value below 11px.
 */
describe('Feature: ui-ux-consistency-fixes, Property 3: ListingCard minimum font size', () => {
  const propertyTypes = fc.constantFrom('hdb', 'condo', 'landed', 'commercial') as fc.Arbitrary<ListingWithSeller['property_type']>;
  const listingStatuses = fc.constantFrom('draft', 'live', 'under_offer', 'sold', 'rented', 'withdrawn') as fc.Arbitrary<ListingWithSeller['listing_status']>;
  const listingTypes = fc.constantFrom('sale', 'rental') as fc.Arbitrary<ListingWithSeller['listing_type']>;
  const districts = fc.stringMatching(/^D(0[1-9]|[12][0-9])$/);

  const arbListing: fc.Arbitrary<ListingWithSeller> = fc.record({
    id: fc.uuid(),
    tenant_id: fc.uuid(),
    agent_id: fc.uuid(),
    address: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    postal_code: fc.stringMatching(/^\d{6}$/),
    district: districts,
    property_type: propertyTypes,
    hdb_type: fc.constantFrom(null, '2room', '3room', '4room', '5room', 'executive') as fc.Arbitrary<ListingWithSeller['hdb_type']>,
    tenure: fc.constantFrom('freehold', '99yr', '999yr') as fc.Arbitrary<ListingWithSeller['tenure']>,
    floor_area_sqft: fc.integer({ min: 100, max: 50000 }),
    asking_price: fc.oneof(fc.constant(null), fc.integer({ min: 100000, max: 50000000 })),
    psf: fc.oneof(fc.constant(null), fc.integer({ min: 100, max: 10000 })),
    asking_rental: fc.oneof(fc.constant(null), fc.integer({ min: 500, max: 50000 })),
    listing_status: listingStatuses,
    listing_type: listingTypes,
    floor: fc.oneof(fc.constant(null), fc.stringMatching(/^\d{1,3}$/)),
    unit_number: fc.oneof(fc.constant(null), fc.stringMatching(/^#\d{2}-\d{2,4}$/)),
    completion_year: fc.oneof(fc.constant(null), fc.integer({ min: 1960, max: 2030 })),
    media_urls: fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
    description: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 200 })),
    is_exclusive: fc.boolean(),
    exclusivity_expiry: fc.oneof(fc.constant(null), fc.constant('2025-12-31')),
    seller_contact_id: fc.oneof(fc.constant(null), fc.uuid()),
    seller_contact: fc.oneof(
      fc.constant(null),
      fc.record({
        id: fc.uuid(),
        full_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        phone: fc.stringMatching(/^\+65\d{8}$/),
      })
    ),
    created_at: fc.constant('2024-01-01T00:00:00Z'),
    updated_at: fc.constant('2024-06-01T00:00:00Z'),
  });

  const arbListings = fc.array(arbListing, { minLength: 1, maxLength: 5 });

  // Regex to match any text-[Npx] where N < 11
  // Matches text-[1px] through text-[10px] (integer values below 11)
  const belowMinFontSizeRegex = /\btext-\[([0-9]|10)px\]/;

  it('rendered output contains no arbitrary font-size class below 11px', () => {
    fc.assert(
      fc.property(arbListings, (listings) => {
        const { container, unmount } = render(
          <ListingsCardGrid listings={listings} />
        );

        const html = container.innerHTML;

        // Assert no text-[9px], text-[10px], or any text-[Npx] below 11px
        expect(html).not.toMatch(belowMinFontSizeRegex);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
