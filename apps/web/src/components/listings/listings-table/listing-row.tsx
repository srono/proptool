'use client';

import { useRouter } from 'next/navigation';
import type { Listing, ListingStatus } from '@propagent/shared';
import type { SortField } from '../hooks/use-listings-filter';
import {
  formatListingPrice,
  formatListingPsf,
  isExclusivityActive,
} from '../utils/format-listing';

// --- Types ---

export interface ColumnDef {
  key: SortField | 'tenure' | 'listing_type';
  label: string;
  sortable: boolean;
  minBreakpoint: 'mobile' | 'tablet' | 'desktop';
  align: 'left' | 'right';
}

export interface ListingRowProps {
  listing: Listing;
  visibleColumns: ColumnDef[];
}

// --- Status styles ---

const STATUS_STYLES: Record<ListingStatus, string> = {
  draft: 'text-gray-2 border-onyx-line bg-transparent',
  live: 'text-status-green border-status-green/40 bg-status-green/10',
  under_offer: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  sold: 'text-aqua border-brand/50 bg-brand/[0.12]',
  rented: 'text-aqua border-brand/50 bg-brand/[0.12]',
  withdrawn: 'text-status-red border-status-red/40 bg-status-red/10',
};

// --- Helpers ---

function formatStatusLabel(status: ListingStatus): string {
  return status.replace('_', ' ');
}

function formatListingTypeLabel(type: string): string {
  return type === 'sale' ? 'Sale' : 'Rental';
}

function formatTenure(tenure: string): string {
  switch (tenure) {
    case 'freehold':
      return 'Freehold';
    case '99yr':
      return '99yr';
    case '999yr':
      return '999yr';
    default:
      return tenure;
  }
}

// --- Cell renderer ---

function renderCell(listing: Listing, columnKey: string): React.ReactNode {
  switch (columnKey) {
    case 'address':
      return (
        <span className="truncate block max-w-[200px]">{listing.address}</span>
      );
    case 'district':
      return listing.district;
    case 'property_type':
      return listing.property_type.toUpperCase();
    case 'tenure':
      return formatTenure(listing.tenure);
    case 'floor_area_sqft':
      return listing.floor_area_sqft
        ? listing.floor_area_sqft.toLocaleString('en-SG')
        : '—';
    case 'listing_type':
      return (
        <span className="text-gray-2 text-[11px]">
          {formatListingTypeLabel(listing.listing_type)}
        </span>
      );
    case 'listing_status':
      return (
        <span
          className={`chip ${STATUS_STYLES[listing.listing_status]}`}
        >
          {formatStatusLabel(listing.listing_status)}
        </span>
      );
    case 'price':
      return formatListingPrice(listing);
    case 'psf':
      return formatListingPsf(listing);
    default:
      return '—';
  }
}

// --- Component ---

export function ListingRow({ listing, visibleColumns }: ListingRowProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/listings/${listing.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/listings/${listing.id}`);
    }
  };

  const showExclusivity = isExclusivityActive(listing);

  return (
    <tr
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`View listing at ${listing.address}`}
      className="cursor-pointer border-b border-onyx-line hover:border-brand/50 transition-colors"
    >
      {visibleColumns.map((col) => (
        <td
          key={col.key}
          className={`px-3 py-2.5 text-[12px] text-white whitespace-nowrap ${
            col.align === 'right' ? 'text-right' : 'text-left'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {renderCell(listing, col.key)}
            {col.key === 'address' && showExclusivity && (
              <span className="chip text-status-amber border-status-amber/40 bg-status-amber/10 !text-[9px] !px-1.5 !py-0">
                EXCL
              </span>
            )}
          </div>
        </td>
      ))}
    </tr>
  );
}
