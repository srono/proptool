import { describe, it, expect } from 'vitest';
import {
  sortListings,
  filterListings,
  getNextSortState,
} from './use-listings-filter';
import type { SortState } from './use-listings-filter';
import type { Listing } from '@propagent/shared';

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'test-id',
    tenant_id: 'tenant-1',
    agent_id: 'agent-1',
    address: '123 Test Street',
    postal_code: '123456',
    district: 'D01',
    property_type: 'condo',
    hdb_type: null,
    tenure: 'freehold',
    floor_area_sqft: 1000,
    asking_price: 1500000,
    psf: 1500,
    asking_rental: null,
    listing_status: 'live',
    listing_type: 'sale',
    floor: '10',
    unit_number: '01-01',
    completion_year: 2020,
    media_urls: [],
    description: null,
    is_exclusive: false,
    exclusivity_expiry: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('sortListings', () => {
  it('sorts by created_at descending when no sort field is set', () => {
    const listings = [
      makeListing({ id: '1', created_at: '2024-01-01T00:00:00Z' }),
      makeListing({ id: '2', created_at: '2024-03-01T00:00:00Z' }),
      makeListing({ id: '3', created_at: '2024-02-01T00:00:00Z' }),
    ];

    const sorted = sortListings(listings, { field: null, direction: 'asc' });
    expect(sorted.map((l) => l.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by address ascending', () => {
    const listings = [
      makeListing({ id: '1', address: 'Charlie Street' }),
      makeListing({ id: '2', address: 'Alpha Road' }),
      makeListing({ id: '3', address: 'Bravo Lane' }),
    ];

    const sorted = sortListings(listings, { field: 'address', direction: 'asc' });
    expect(sorted.map((l) => l.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by address descending', () => {
    const listings = [
      makeListing({ id: '1', address: 'Charlie Street' }),
      makeListing({ id: '2', address: 'Alpha Road' }),
      makeListing({ id: '3', address: 'Bravo Lane' }),
    ];

    const sorted = sortListings(listings, { field: 'address', direction: 'desc' });
    expect(sorted.map((l) => l.id)).toEqual(['1', '3', '2']);
  });

  it('sorts by price ascending for sale listings', () => {
    const listings = [
      makeListing({ id: '1', asking_price: 2000000, listing_type: 'sale' }),
      makeListing({ id: '2', asking_price: 1000000, listing_type: 'sale' }),
      makeListing({ id: '3', asking_price: 1500000, listing_type: 'sale' }),
    ];

    const sorted = sortListings(listings, { field: 'price', direction: 'asc' });
    expect(sorted.map((l) => l.id)).toEqual(['2', '3', '1']);
  });

  it('sorts by price using asking_rental for rental listings', () => {
    const listings = [
      makeListing({ id: '1', asking_rental: 5000, listing_type: 'rental', asking_price: null }),
      makeListing({ id: '2', asking_rental: 3000, listing_type: 'rental', asking_price: null }),
      makeListing({ id: '3', asking_rental: 4000, listing_type: 'rental', asking_price: null }),
    ];

    const sorted = sortListings(listings, { field: 'price', direction: 'asc' });
    expect(sorted.map((l) => l.id)).toEqual(['2', '3', '1']);
  });

  it('places null values at the end regardless of sort direction (ascending)', () => {
    const listings = [
      makeListing({ id: '1', asking_price: null, listing_type: 'sale' }),
      makeListing({ id: '2', asking_price: 1000000, listing_type: 'sale' }),
      makeListing({ id: '3', asking_price: null, listing_type: 'sale' }),
      makeListing({ id: '4', asking_price: 2000000, listing_type: 'sale' }),
    ];

    const sorted = sortListings(listings, { field: 'price', direction: 'asc' });
    // Non-null values first in ascending order, then nulls
    expect(sorted.map((l) => l.id)).toEqual(['2', '4', '1', '3']);
  });

  it('places null values at the end regardless of sort direction (descending)', () => {
    const listings = [
      makeListing({ id: '1', asking_price: null, listing_type: 'sale' }),
      makeListing({ id: '2', asking_price: 1000000, listing_type: 'sale' }),
      makeListing({ id: '3', asking_price: null, listing_type: 'sale' }),
      makeListing({ id: '4', asking_price: 2000000, listing_type: 'sale' }),
    ];

    const sorted = sortListings(listings, { field: 'price', direction: 'desc' });
    // Non-null values first in descending order, then nulls
    expect(sorted.map((l) => l.id)).toEqual(['4', '2', '1', '3']);
  });

  it('sorts by floor_area_sqft with zero treated as null', () => {
    const listings = [
      makeListing({ id: '1', floor_area_sqft: 0 }),
      makeListing({ id: '2', floor_area_sqft: 1200 }),
      makeListing({ id: '3', floor_area_sqft: 800 }),
    ];

    const sorted = sortListings(listings, { field: 'floor_area_sqft', direction: 'asc' });
    expect(sorted.map((l) => l.id)).toEqual(['3', '2', '1']);
  });

  it('does not mutate the original array', () => {
    const listings = [
      makeListing({ id: '1', address: 'B' }),
      makeListing({ id: '2', address: 'A' }),
    ];
    const original = [...listings];

    sortListings(listings, { field: 'address', direction: 'asc' });
    expect(listings).toEqual(original);
  });
});

describe('filterListings', () => {
  it('returns all listings when no filters are active', () => {
    const listings = [
      makeListing({ id: '1' }),
      makeListing({ id: '2' }),
    ];

    const result = filterListings(listings, {
      search: '',
      districts: [],
      propertyType: null,
      status: null,
    });

    expect(result).toHaveLength(2);
  });

  it('filters by search text on address (case-insensitive)', () => {
    const listings = [
      makeListing({ id: '1', address: '123 Orchard Road' }),
      makeListing({ id: '2', address: '456 Bukit Timah' }),
    ];

    const result = filterListings(listings, {
      search: 'orchard',
      districts: [],
      propertyType: null,
      status: null,
    });

    expect(result.map((l) => l.id)).toEqual(['1']);
  });

  it('filters by search text on postal_code', () => {
    const listings = [
      makeListing({ id: '1', postal_code: '238801' }),
      makeListing({ id: '2', postal_code: '569933' }),
    ];

    const result = filterListings(listings, {
      search: '2388',
      districts: [],
      propertyType: null,
      status: null,
    });

    expect(result.map((l) => l.id)).toEqual(['1']);
  });

  it('does not filter when search text is less than 2 characters', () => {
    const listings = [
      makeListing({ id: '1', address: 'Alpha' }),
      makeListing({ id: '2', address: 'Beta' }),
    ];

    const result = filterListings(listings, {
      search: 'A',
      districts: [],
      propertyType: null,
      status: null,
    });

    expect(result).toHaveLength(2);
  });

  it('filters by district multi-select', () => {
    const listings = [
      makeListing({ id: '1', district: 'D01' }),
      makeListing({ id: '2', district: 'D05' }),
      makeListing({ id: '3', district: 'D10' }),
    ];

    const result = filterListings(listings, {
      search: '',
      districts: ['D01', 'D10'],
      propertyType: null,
      status: null,
    });

    expect(result.map((l) => l.id)).toEqual(['1', '3']);
  });

  it('filters by property type', () => {
    const listings = [
      makeListing({ id: '1', property_type: 'condo' }),
      makeListing({ id: '2', property_type: 'hdb' }),
      makeListing({ id: '3', property_type: 'condo' }),
    ];

    const result = filterListings(listings, {
      search: '',
      districts: [],
      propertyType: 'condo',
      status: null,
    });

    expect(result.map((l) => l.id)).toEqual(['1', '3']);
  });

  it('filters by status', () => {
    const listings = [
      makeListing({ id: '1', listing_status: 'live' }),
      makeListing({ id: '2', listing_status: 'draft' }),
      makeListing({ id: '3', listing_status: 'live' }),
    ];

    const result = filterListings(listings, {
      search: '',
      districts: [],
      propertyType: null,
      status: 'live',
    });

    expect(result.map((l) => l.id)).toEqual(['1', '3']);
  });

  it('applies AND composition when multiple filters are active', () => {
    const listings = [
      makeListing({ id: '1', district: 'D01', property_type: 'condo', listing_status: 'live', address: '123 Orchard' }),
      makeListing({ id: '2', district: 'D01', property_type: 'hdb', listing_status: 'live', address: '456 Orchard' }),
      makeListing({ id: '3', district: 'D05', property_type: 'condo', listing_status: 'live', address: '789 Orchard' }),
      makeListing({ id: '4', district: 'D01', property_type: 'condo', listing_status: 'draft', address: '101 Orchard' }),
    ];

    const result = filterListings(listings, {
      search: 'orchard',
      districts: ['D01'],
      propertyType: 'condo',
      status: 'live',
    });

    expect(result.map((l) => l.id)).toEqual(['1']);
  });

  it('returns empty array when no listings match', () => {
    const listings = [
      makeListing({ id: '1', district: 'D01' }),
    ];

    const result = filterListings(listings, {
      search: '',
      districts: ['D28'],
      propertyType: null,
      status: null,
    });

    expect(result).toHaveLength(0);
  });
});

describe('getNextSortState (sort state machine)', () => {
  it('clicking a column sets ascending sort', () => {
    const initial: SortState = { field: null, direction: 'asc' };
    const next = getNextSortState(initial, 'address');
    expect(next).toEqual({ field: 'address', direction: 'asc' });
  });

  it('clicking the same column again toggles to descending', () => {
    const current: SortState = { field: 'address', direction: 'asc' };
    const next = getNextSortState(current, 'address');
    expect(next).toEqual({ field: 'address', direction: 'desc' });
  });

  it('clicking the same column a third time cycles back to ascending', () => {
    const current: SortState = { field: 'address', direction: 'desc' };
    const next = getNextSortState(current, 'address');
    expect(next).toEqual({ field: 'address', direction: 'asc' });
  });

  it('clicking a different column resets to ascending for new column', () => {
    const current: SortState = { field: 'address', direction: 'desc' };
    const next = getNextSortState(current, 'price');
    expect(next).toEqual({ field: 'price', direction: 'asc' });
  });

  it('clicking a different column from ascending also resets', () => {
    const current: SortState = { field: 'price', direction: 'asc' };
    const next = getNextSortState(current, 'district');
    expect(next).toEqual({ field: 'district', direction: 'asc' });
  });
});
