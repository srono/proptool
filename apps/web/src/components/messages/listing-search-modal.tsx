'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Listing } from '@propagent/shared';
import { createClient } from '@/lib/supabase/client';
import { filterListings } from '@/lib/ai/listing-search';
import { formatListingSnippet } from '@/lib/ai/listing-snippet';
import { formatPrice } from '@/lib/ai/format-price';

interface ListingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectListing: (snippet: string, listingId: string) => void;
  tenantId: string;
}

export function ListingSearchModal({
  isOpen,
  onClose,
  onSelectListing,
  tenantId,
}: ListingSearchModalProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('listings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('listing_status', 'live')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Failed to load listings');
        return;
      }

      setListings(data ?? []);
    } catch {
      setError('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (isOpen) {
      fetchListings();
      setQuery('');
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, fetchListings]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredListings = filterListings(listings, query);

  function handleSelect(listing: Listing) {
    const snippet = formatListingSnippet(listing);
    onSelectListing(snippet, listing.id);
    onClose();
  }

  function formatPropertyType(type: string): string {
    switch (type) {
      case 'hdb':
        return 'HDB';
      case 'condo':
        return 'Condo';
      case 'landed':
        return 'Landed';
      case 'commercial':
        return 'Commercial';
      default:
        return type;
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Search listings"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative w-full max-w-lg mx-4 bg-onyx-card border border-onyx-line rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-onyx-line">
          <h2 className="text-sm font-display font-bold text-white">
            Insert Listing
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-onyx-raised text-gray-2 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 py-3 border-b border-onyx-line">
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
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by address, district, or type..."
              className="w-full rounded-pill border border-onyx-line bg-onyx py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Listings list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-onyx-line border-t-aqua" />
            </div>
          )}

          {error && (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={fetchListings}
                className="mt-2 text-xs text-aqua hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && filteredListings.length === 0 && (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-gray-2">
                {query.length >= 2
                  ? 'No live listings match your search'
                  : 'No live listings available'}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredListings.length > 0 && (
            <ul className="space-y-1" role="listbox">
              {filteredListings.map((listing) => (
                <li key={listing.id}>
                  <button
                    onClick={() => handleSelect(listing)}
                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-onyx-raised transition-colors group"
                    role="option"
                    aria-selected={false}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {listing.address}
                        </p>
                        <p className="text-xs text-gray-2 mt-0.5">
                          {listing.district} · {formatPropertyType(listing.property_type)} · {listing.floor_area_sqft.toLocaleString('en-US')} sqft
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-aqua">
                          {listing.listing_type === 'sale' && listing.asking_price != null
                            ? formatPrice(listing.asking_price)
                            : listing.listing_type === 'rental' && listing.asking_rental != null
                            ? `${formatPrice(listing.asking_rental)}/mo`
                            : '—'}
                        </p>
                        <p className="text-[11px] text-gray-2 mt-0.5">
                          {listing.listing_type === 'sale' ? 'Sale' : 'Rental'}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
