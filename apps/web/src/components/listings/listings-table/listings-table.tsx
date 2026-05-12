'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Listing } from '@agentos/shared';
import type { Breakpoint } from '../hooks/use-breakpoint';
import type { SortField, SortState } from '../hooks/use-listings-filter';
import { ListingRow } from './listing-row';
import type { ColumnDef } from './listing-row';

// Re-export ColumnDef for consumers
export type { ColumnDef } from './listing-row';

// --- Column configuration ---

export const COLUMNS: ColumnDef[] = [
  { key: 'address', label: 'Address', sortable: true, minBreakpoint: 'tablet', align: 'left' },
  { key: 'district', label: 'District', sortable: true, minBreakpoint: 'tablet', align: 'left' },
  { key: 'property_type', label: 'Type', sortable: true, minBreakpoint: 'tablet', align: 'left' },
  { key: 'tenure', label: 'Tenure', sortable: false, minBreakpoint: 'desktop', align: 'left' },
  { key: 'floor_area_sqft', label: 'Area (sqft)', sortable: true, minBreakpoint: 'desktop', align: 'right' },
  { key: 'listing_type', label: 'Listing', sortable: false, minBreakpoint: 'tablet', align: 'left' },
  { key: 'listing_status', label: 'Status', sortable: true, minBreakpoint: 'tablet', align: 'left' },
  { key: 'price', label: 'Price', sortable: true, minBreakpoint: 'tablet', align: 'right' },
  { key: 'psf', label: 'PSF', sortable: true, minBreakpoint: 'tablet', align: 'right' },
];

// --- Helpers ---

/**
 * Returns the visible columns for the given breakpoint.
 * - Desktop: all columns (tablet + desktop minBreakpoint)
 * - Tablet: only columns with minBreakpoint 'tablet'
 * - Mobile: table is not rendered (handled by parent)
 */
function getVisibleColumns(breakpoint: Breakpoint): ColumnDef[] {
  if (breakpoint === 'desktop') {
    return COLUMNS.filter(
      (col) => col.minBreakpoint === 'tablet' || col.minBreakpoint === 'desktop'
    );
  }
  // Tablet: only show columns with minBreakpoint 'tablet'
  return COLUMNS.filter((col) => col.minBreakpoint === 'tablet');
}

// --- Props ---

export interface ListingsTableProps {
  listings: Listing[];
  sort: SortState;
  onSort: (field: SortField) => void;
  breakpoint: Breakpoint;
}

// --- Component ---

export function ListingsTable({ listings, sort, onSort, breakpoint }: ListingsTableProps) {
  const visibleColumns = getVisibleColumns(breakpoint);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-onyx-card">
          <tr className="border-b border-onyx-line">
            {visibleColumns.map((col) => {
              const isActive = sort.field === col.key;

              return (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-[11px] font-medium uppercase tracking-label whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.sortable ? 'cursor-pointer select-none hover:text-white' : ''} ${
                    isActive ? 'text-aqua' : 'text-gray-2'
                  }`}
                  onClick={
                    col.sortable
                      ? () => onSort(col.key as SortField)
                      : undefined
                  }
                  aria-sort={
                    isActive
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && isActive && (
                      sort.direction === 'asc' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              visibleColumns={visibleColumns}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
