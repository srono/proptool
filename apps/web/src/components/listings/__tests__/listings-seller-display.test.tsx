import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ListingWithSeller } from '@agentos/shared';
import { ListingRow } from '../listings-table/listing-row';
import type { ColumnDef } from '../listings-table/listing-row';
import { ListingsCardGrid } from '../listings-card-grid';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeListing(overrides: Partial<ListingWithSeller> = {}): ListingWithSeller {
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
    asking_price: 2500000,
    psf: 2083,
    asking_rental: null,
    listing_status: 'live',
    listing_type: 'sale',
    floor: '12',
    unit_number: '12-01',
    completion_year: 2020,
    media_urls: [],
    description: null,
    is_exclusive: false,
    exclusivity_expiry: null,
    seller_contact_id: 'contact-1',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    seller_contact: {
      id: 'contact-1',
      full_name: 'Alice Tan',
      phone: '+6591234567',
    },
    ...overrides,
  };
}

const sellerColumn: ColumnDef = {
  key: 'seller',
  label: 'Seller',
  sortable: false,
  minBreakpoint: 'tablet',
  align: 'left',
};

// ─── ListingRow – Seller Display ─────────────────────────────────────────────

describe('ListingRow seller display', () => {
  it('shows seller name when seller contact is present', () => {
    const listing = makeListing();
    render(
      <table><tbody>
        <ListingRow listing={listing} visibleColumns={[sellerColumn]} />
      </tbody></table>
    );

    expect(screen.getByText('Alice Tan')).toBeInTheDocument();
  });

  it('shows dash when no seller contact', () => {
    const listing = makeListing({
      seller_contact_id: null,
      seller_contact: null,
    });
    render(
      <table><tbody>
        <ListingRow listing={listing} visibleColumns={[sellerColumn]} />
      </tbody></table>
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders seller name as a link to contact profile', () => {
    const listing = makeListing();
    render(
      <table><tbody>
        <ListingRow listing={listing} visibleColumns={[sellerColumn]} />
      </tbody></table>
    );

    const link = screen.getByText('Alice Tan').closest('a');
    expect(link).toHaveAttribute('href', '/contacts/contact-1');
  });

  it('truncates long seller name with ellipsis via CSS class', () => {
    const listing = makeListing({
      seller_contact: {
        id: 'contact-2',
        full_name: 'Bartholomew Christopherson-Williamson III',
        phone: '+6599999999',
      },
    });
    render(
      <table><tbody>
        <ListingRow listing={listing} visibleColumns={[sellerColumn]} />
      </tbody></table>
    );

    const nameElement = screen.getByText('Bartholomew Christopherson-Williamson III');
    // The link has truncate class and max-w constraint for ellipsis
    expect(nameElement.className).toContain('truncate');
    expect(nameElement.className).toContain('max-w-[160px]');
  });

  it('ensures minimum 12 characters visible via min-w-[12ch]', () => {
    const listing = makeListing();
    render(
      <table><tbody>
        <ListingRow listing={listing} visibleColumns={[sellerColumn]} />
      </tbody></table>
    );

    const nameElement = screen.getByText('Alice Tan');
    expect(nameElement.className).toContain('min-w-[12ch]');
  });
});

// ─── ListingsCardGrid – Seller Display ───────────────────────────────────────

describe('ListingsCardGrid seller display', () => {
  it('shows seller name on card when seller contact is present', () => {
    const listing = makeListing();
    render(<ListingsCardGrid listings={[listing]} />);

    expect(screen.getByText('Alice Tan')).toBeInTheDocument();
  });

  it('shows dash on card when no seller contact', () => {
    const listing = makeListing({
      seller_contact_id: null,
      seller_contact: null,
    });
    render(<ListingsCardGrid listings={[listing]} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders seller name as a link to contact profile on card', () => {
    const listing = makeListing();
    render(<ListingsCardGrid listings={[listing]} />);

    const sellerLink = screen.getByText('Alice Tan').closest('a');
    expect(sellerLink).toHaveAttribute('href', '/contacts/contact-1');
  });

  it('renders seller name with truncate class on card', () => {
    const listing = makeListing({
      seller_contact: {
        id: 'contact-3',
        full_name: 'Very Long Name That Should Be Truncated',
        phone: '+6588888888',
      },
    });
    render(<ListingsCardGrid listings={[listing]} />);

    const nameElement = screen.getByText('Very Long Name That Should Be Truncated');
    expect(nameElement.className).toContain('truncate');
  });
});
