'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  filterListingsForPicker,
  type PickerListing,
} from '@/lib/ai/listing-picker-filter';

interface ListingPickerProps {
  listings: PickerListing[];
  error?: string | null;
  onRetry?: () => void;
}

export function ListingPicker({ listings, error, onRetry }: ListingPickerProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filteredListings = filterListingsForPicker(listings, query);
  const showResults = query.length >= 2;
  const showNoResults = showResults && filteredListings.length === 0;

  function handleSelect(listing: PickerListing) {
    router.push(`/tools/ad-copy/${listing.id}`);
  }

  function formatStatus(status: string): string {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto text-center py-10 bg-onyx-card rounded-2xl border border-onyx-line">
        <p className="text-sm text-red-400">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-sm text-aqua hover:underline min-h-[44px]"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings by address, project name, or status..."
          className="w-full rounded-pill border border-onyx-line bg-onyx py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand min-h-[44px] text-base md:text-sm"
          aria-label="Search listings"
        />
      </div>

      {/* Results */}
      {showNoResults && (
        <div className="mt-4 text-center py-8 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-sm text-gray-2">
            No listings match your search criteria.
          </p>
        </div>
      )}

      {showResults && filteredListings.length > 0 && (
        <ul className="mt-4 space-y-1" role="listbox" aria-label="Matching listings">
          {filteredListings.map((listing) => (
            <li key={listing.id}>
              <button
                onClick={() => handleSelect(listing)}
                className="w-full text-left px-4 py-3 rounded-xl bg-onyx-card border border-onyx-line hover:border-brand/50 hover:bg-onyx-raised transition-colors min-h-[44px]"
                role="option"
                aria-selected={false}
              >
                <p className="text-sm font-medium text-white truncate">
                  {listing.address}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {listing.project_name && (
                    <span className="text-xs text-gray-2 truncate">
                      {listing.project_name}
                    </span>
                  )}
                  {listing.project_name && (
                    <span className="text-xs text-gray-2">·</span>
                  )}
                  <span className="text-xs text-aqua">
                    {formatStatus(listing.listing_status)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
