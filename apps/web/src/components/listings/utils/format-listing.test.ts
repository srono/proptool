import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatListingPrice, formatListingPsf, isExclusivityActive } from './format-listing';
import type { Listing } from '@propagent/shared';

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: '1',
    tenant_id: 't1',
    agent_id: 'a1',
    address: '123 Test St',
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
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('formatListingPrice', () => {
  it('formats sale listing price with S$ prefix', () => {
    const listing = makeListing({ listing_type: 'sale', asking_price: 1500000 });
    expect(formatListingPrice(listing)).toBe('S$1,500,000');
  });

  it('formats rental listing price with S$ prefix and /mo suffix', () => {
    const listing = makeListing({ listing_type: 'rental', asking_rental: 3500 });
    expect(formatListingPrice(listing)).toBe('S$3,500/mo');
  });

  it('returns dash for sale listing with null asking_price', () => {
    const listing = makeListing({ listing_type: 'sale', asking_price: null });
    expect(formatListingPrice(listing)).toBe('—');
  });

  it('returns dash for rental listing with null asking_rental', () => {
    const listing = makeListing({ listing_type: 'rental', asking_rental: null });
    expect(formatListingPrice(listing)).toBe('—');
  });

  it('formats small sale price correctly', () => {
    const listing = makeListing({ listing_type: 'sale', asking_price: 500 });
    expect(formatListingPrice(listing)).toBe('S$500');
  });

  it('formats large sale price with locale separators', () => {
    const listing = makeListing({ listing_type: 'sale', asking_price: 12500000 });
    expect(formatListingPrice(listing)).toBe('S$12,500,000');
  });
});

describe('formatListingPsf', () => {
  it('formats PSF for sale listing with valid area', () => {
    const listing = makeListing({
      listing_type: 'sale',
      asking_price: 1500000,
      floor_area_sqft: 1000,
    });
    expect(formatListingPsf(listing)).toBe('S$1,500 psf');
  });

  it('returns dash for rental listings', () => {
    const listing = makeListing({ listing_type: 'rental', asking_rental: 3500 });
    expect(formatListingPsf(listing)).toBe('—');
  });

  it('returns dash for sale listing with null asking_price', () => {
    const listing = makeListing({ listing_type: 'sale', asking_price: null });
    expect(formatListingPsf(listing)).toBe('—');
  });

  it('returns dash for sale listing with zero floor area', () => {
    const listing = makeListing({
      listing_type: 'sale',
      asking_price: 1500000,
      floor_area_sqft: 0,
    });
    expect(formatListingPsf(listing)).toBe('—');
  });

  it('rounds PSF to nearest integer', () => {
    const listing = makeListing({
      listing_type: 'sale',
      asking_price: 1000000,
      floor_area_sqft: 700,
    });
    // 1000000 / 700 = 1428.57... → rounds to 1429
    expect(formatListingPsf(listing)).toBe('S$1,429 psf');
  });
});

describe('isExclusivityActive', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when is_exclusive is true and expiry is in the future', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const listing = makeListing({
      is_exclusive: true,
      exclusivity_expiry: futureDate,
    });
    expect(isExclusivityActive(listing)).toBe(true);
  });

  it('returns false when is_exclusive is false', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const listing = makeListing({
      is_exclusive: false,
      exclusivity_expiry: futureDate,
    });
    expect(isExclusivityActive(listing)).toBe(false);
  });

  it('returns false when exclusivity_expiry is null', () => {
    const listing = makeListing({
      is_exclusive: true,
      exclusivity_expiry: null,
    });
    expect(isExclusivityActive(listing)).toBe(false);
  });

  it('returns false when exclusivity_expiry is in the past', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const listing = makeListing({
      is_exclusive: true,
      exclusivity_expiry: pastDate,
    });
    expect(isExclusivityActive(listing)).toBe(false);
  });

  it('returns false when exclusivity_expiry is an invalid date string', () => {
    const listing = makeListing({
      is_exclusive: true,
      exclusivity_expiry: 'not-a-date',
    });
    expect(isExclusivityActive(listing)).toBe(false);
  });

  it('returns false when both is_exclusive is false and expiry is null', () => {
    const listing = makeListing({
      is_exclusive: false,
      exclusivity_expiry: null,
    });
    expect(isExclusivityActive(listing)).toBe(false);
  });
});
