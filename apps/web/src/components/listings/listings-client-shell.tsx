'use client';

import Link from 'next/link';
import type { Listing } from '@agentos/shared';
import { useViewMode } from './hooks/use-view-mode';
import { useBreakpoint } from './hooks/use-breakpoint';
import { useListingsFilter } from './hooks/use-listings-filter';
import { ViewToggle } from './view-toggle';
import { FilterBar } from './filter-bar/filter-bar';
import { ListingsTable } from './listings-table/listings-table';
import { ListingsCardGrid } from './listings-card-grid';

interface ListingsClientShellProps {
  listings: Listing[];
  activeTab: string;
}

export function ListingsClientShell({ listings, activeTab }: ListingsClientShellProps) {
  const { viewMode, setViewMode } = useViewMode();
  const breakpoint = useBreakpoint();
  const {
    filters,
    setSearch,
    setDistricts,
    setPropertyType,
    setStatus,
    clearAllFilters,
    sort,
    toggleSort,
    filteredListings,
    totalCount,
  } = useListingsFilter(listings);

  const isMobile = breakpoint === 'mobile';
  const showTable = viewMode === 'list' && !isMobile;
  const showCards = viewMode === 'card' || isMobile;

  return (
    <div className="space-y-4">
      {/* Page Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-2">
          {activeTab === 'all' ? 'All Listings' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h2>
        <ViewToggle
          viewMode={viewMode}
          onToggle={setViewMode}
          disabled={isMobile}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onSearchChange={setSearch}
        onDistrictsChange={setDistricts}
        onPropertyTypeChange={setPropertyType}
        onStatusChange={setStatus}
        onClearAll={clearAllFilters}
      />

      {/* Filter Summary */}
      <p className="text-xs text-gray-2">
        Showing {filteredListings.length} of {totalCount} listings
      </p>

      {/* Content */}
      {totalCount === 0 ? (
        /* Empty state: no listings exist at all */
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-aqua" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <p className="text-white font-medium text-sm">No listings yet</p>
          <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
            Create your first property listing to start matching with buyers and tenants.
          </p>
          <Link
            href="/listings/new"
            className="inline-flex items-center mt-4 btn-primary text-xs"
          >
            + New listing
          </Link>
        </div>
      ) : filteredListings.length === 0 ? (
        /* Empty state: filters produced no results */
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-white font-medium text-sm">No listings match filters</p>
          <p className="text-gray-2 text-xs mt-1">
            Try adjusting your search or filter criteria.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-4 text-sm text-aqua hover:text-white transition-colors underline underline-offset-2"
          >
            Clear all filters
          </button>
        </div>
      ) : showTable ? (
        <ListingsTable
          listings={filteredListings}
          sort={sort}
          onSort={toggleSort}
          breakpoint={breakpoint}
        />
      ) : showCards ? (
        <ListingsCardGrid listings={filteredListings} />
      ) : null}
    </div>
  );
}
