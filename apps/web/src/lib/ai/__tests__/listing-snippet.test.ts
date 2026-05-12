import { describe, it, expect } from 'vitest';
import { formatListingSnippet } from '../listing-snippet';
import type { Listing } from '@agentos/shared';

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    tenant_id: 'tenant-1',
    agent_id: 'agent-1',
    address: '123 Example Road',
    postal_code: '123456',
    district: 'D15',
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
    description: 'Spacious corner unit with sea view',
    is_exclusive: false,
    exclusivity_expiry: null,
    seller_contact_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('formatListingSnippet', () => {
  it('formats a sale listing correctly', () => {
    const listing = makeListing();
    const result = formatListingSnippet(listing);

    expect(result).toBe(
      '🏠 Condo | 123 Example Road, D15\n' +
        '📐 1,200 sqft | Freehold\n' +
        '💰 S$1,800,000 (S$1,500 psf)\n' +
        '📝 Spacious corner unit with sea view'
    );
  });

  it('formats a rental listing correctly', () => {
    const listing = makeListing({
      listing_type: 'rental',
      asking_price: null,
      psf: null,
      asking_rental: 4500,
    });
    const result = formatListingSnippet(listing);

    expect(result).toBe(
      '🏠 Condo | 123 Example Road, D15\n' +
        '📐 1,200 sqft | Freehold\n' +
        '💰 S$4,500/mo\n' +
        '📝 Spacious corner unit with sea view'
    );
  });

  it('truncates description longer than 200 chars with ellipsis', () => {
    const longDesc = 'A'.repeat(250);
    const listing = makeListing({ description: longDesc });
    const result = formatListingSnippet(listing);

    const descLine = result.split('\n').find((l) => l.startsWith('📝'));
    expect(descLine).toBe(`📝 ${'A'.repeat(200)}…`);
  });

  it('does not include description line when description is null', () => {
    const listing = makeListing({ description: null });
    const result = formatListingSnippet(listing);

    expect(result).not.toContain('📝');
  });

  it('does not truncate description at exactly 200 chars', () => {
    const exactDesc = 'B'.repeat(200);
    const listing = makeListing({ description: exactDesc });
    const result = formatListingSnippet(listing);

    const descLine = result.split('\n').find((l) => l.startsWith('📝'));
    expect(descLine).toBe(`📝 ${'B'.repeat(200)}`);
  });

  it('formats sale listing without PSF when psf is null', () => {
    const listing = makeListing({ psf: null });
    const result = formatListingSnippet(listing);

    expect(result).toContain('💰 S$1,800,000');
    expect(result).not.toContain('psf');
  });

  it('formats HDB property type correctly', () => {
    const listing = makeListing({ property_type: 'hdb' });
    const result = formatListingSnippet(listing);

    expect(result).toContain('🏠 HDB |');
  });

  it('formats landed property type correctly', () => {
    const listing = makeListing({ property_type: 'landed' });
    const result = formatListingSnippet(listing);

    expect(result).toContain('🏠 Landed |');
  });

  it('formats 99yr tenure correctly', () => {
    const listing = makeListing({ tenure: '99yr' });
    const result = formatListingSnippet(listing);

    expect(result).toContain('99-year Leasehold');
  });

  it('formats 999yr tenure correctly', () => {
    const listing = makeListing({ tenure: '999yr' });
    const result = formatListingSnippet(listing);

    expect(result).toContain('999-year Leasehold');
  });
});
