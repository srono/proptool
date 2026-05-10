import { describe, it, expect } from 'vitest';
import { filterListings } from '../listing-search';
import type { Listing } from '@agentos/shared';

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    tenant_id: 'tenant-1',
    agent_id: 'agent-1',
    address: '123 Orchard Road',
    postal_code: '238858',
    district: 'D09',
    property_type: 'condo',
    hdb_type: null,
    tenure: 'freehold',
    floor_area_sqft: 1200,
    asking_price: 1800000,
    psf: 1500,
    asking_rental: null,
    listing_status: 'live',
    listing_type: 'sale',
    floor: '12',
    unit_number: '#12-05',
    completion_year: 2019,
    media_urls: [],
    description: 'Spacious corner unit',
    is_exclusive: false,
    exclusivity_expiry: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('filterListings', () => {
  it('returns all live listings when query is empty', () => {
    const listings = [
      makeListing({ id: '1' }),
      makeListing({ id: '2', listing_status: 'draft' }),
      makeListing({ id: '3' }),
    ];
    const result = filterListings(listings, '');
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.id)).toEqual(['1', '3']);
  });

  it('returns all live listings when query is 1 character', () => {
    const listings = [
      makeListing({ id: '1', address: 'ABC Road' }),
      makeListing({ id: '2', address: 'XYZ Lane' }),
    ];
    const result = filterListings(listings, 'A');
    expect(result).toHaveLength(2);
  });

  it('filters by address when query is 2+ characters', () => {
    const listings = [
      makeListing({ id: '1', address: '123 Orchard Road' }),
      makeListing({ id: '2', address: '456 Bukit Timah' }),
    ];
    const result = filterListings(listings, 'orchard');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by district (case-insensitive)', () => {
    const listings = [
      makeListing({ id: '1', district: 'D09' }),
      makeListing({ id: '2', district: 'D15' }),
    ];
    const result = filterListings(listings, 'd15');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by property_type (case-insensitive)', () => {
    const listings = [
      makeListing({ id: '1', property_type: 'condo' }),
      makeListing({ id: '2', property_type: 'hdb' }),
      makeListing({ id: '3', property_type: 'landed' }),
    ];
    const result = filterListings(listings, 'HDB');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('never returns non-live listings even if they match the query', () => {
    const listings = [
      makeListing({ id: '1', listing_status: 'draft', address: 'Orchard Road' }),
      makeListing({ id: '2', listing_status: 'sold', address: 'Orchard Lane' }),
      makeListing({ id: '3', listing_status: 'withdrawn', address: 'Orchard Blvd' }),
      makeListing({ id: '4', listing_status: 'live', address: 'Orchard Tower' }),
    ];
    const result = filterListings(listings, 'orchard');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('returns empty array when no listings match', () => {
    const listings = [
      makeListing({ id: '1', address: 'Orchard Road', district: 'D09', property_type: 'condo' }),
    ];
    const result = filterListings(listings, 'tampines');
    expect(result).toHaveLength(0);
  });

  it('returns empty array when input listings array is empty', () => {
    const result = filterListings([], 'test');
    expect(result).toHaveLength(0);
  });

  it('matches across any of the three fields', () => {
    const listings = [
      makeListing({ id: '1', address: 'Tampines St 21', district: 'D18', property_type: 'hdb' }),
      makeListing({ id: '2', address: '100 Beach Road', district: 'D07', property_type: 'commercial' }),
    ];
    // Match on address
    expect(filterListings(listings, 'tampines').map((l) => l.id)).toEqual(['1']);
    // Match on district
    expect(filterListings(listings, 'D07').map((l) => l.id)).toEqual(['2']);
    // Match on property_type
    expect(filterListings(listings, 'commercial').map((l) => l.id)).toEqual(['2']);
  });
});
