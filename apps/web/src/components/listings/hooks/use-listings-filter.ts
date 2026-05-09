'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Listing, PropertyType, ListingStatus } from '@propagent/shared';

// --- Types ---

export interface FilterState {
  search: string;
  districts: string[];
  propertyType: PropertyType | null;
  status: ListingStatus | null;
}

export type SortField =
  | 'address'
  | 'district'
  | 'property_type'
  | 'price'
  | 'psf'
  | 'floor_area_sqft'
  | 'listing_status';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField | null;
  direction: SortDirection;
}

export interface UseListingsFilterReturn {
  filters: FilterState;
  setSearch: (value: string) => void;
  setDistricts: (districts: string[]) => void;
  setPropertyType: (type: PropertyType | null) => void;
  setStatus: (status: ListingStatus | null) => void;
  clearAllFilters: () => void;
  sort: SortState;
  toggleSort: (field: SortField) => void;
  filteredListings: Listing[];
  totalCount: number;
}

// --- Pure functions (exported for independent testing) ---

/**
 * Gets the comparable value for a listing field used in sorting.
 */
function getSortValue(listing: Listing, field: SortField): string | number | null {
  switch (field) {
    case 'address':
      return listing.address;
    case 'district':
      return listing.district;
    case 'property_type':
      return listing.property_type;
    case 'listing_status':
      return listing.listing_status;
    case 'floor_area_sqft':
      return listing.floor_area_sqft || null;
    case 'price':
      return listing.listing_type === 'sale'
        ? listing.asking_price
        : listing.asking_rental;
    case 'psf':
      return listing.listing_type === 'sale' ? listing.psf : null;
  }
}

/**
 * Sorts listings by the given sort state.
 * - When no sort field is set, defaults to created_at descending.
 * - Null values always sort to the end regardless of direction.
 */
export function sortListings(listings: Listing[], sort: SortState): Listing[] {
  if (!sort.field) {
    // Default: created_at descending
    return [...listings].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const field = sort.field;

  return [...listings].sort((a, b) => {
    const aVal = getSortValue(a, field);
    const bVal = getSortValue(b, field);

    // Nulls always last
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const cmp =
      typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string)
        : (aVal as number) - (bVal as number);

    return sort.direction === 'asc' ? cmp : -cmp;
  });
}

/**
 * Filters listings by the given filter state using AND composition.
 * - Search: case-insensitive substring match on address or postal_code (min 2 chars)
 * - Districts: listing.district must be in selected set
 * - Property type: exact match
 * - Status: exact match
 *
 * All active filters must be satisfied simultaneously.
 */
export function filterListings(listings: Listing[], filters: FilterState): Listing[] {
  return listings.filter((listing) => {
    // Text search (address or postal code, case-insensitive, min 2 chars)
    if (filters.search.length >= 2) {
      const needle = filters.search.toLowerCase();
      const matchesAddress = listing.address.toLowerCase().includes(needle);
      const matchesPostal = listing.postal_code.toLowerCase().includes(needle);
      if (!matchesAddress && !matchesPostal) return false;
    }

    // District multi-select
    if (filters.districts.length > 0) {
      if (!filters.districts.includes(listing.district)) return false;
    }

    // Property type
    if (filters.propertyType) {
      if (listing.property_type !== filters.propertyType) return false;
    }

    // Status
    if (filters.status) {
      if (listing.listing_status !== filters.status) return false;
    }

    return true;
  });
}

/**
 * Computes the next sort state given the current state and a toggled field.
 *
 * State machine:
 * - Click column → sort asc
 * - Click same column again → sort desc
 * - Click same column third time → back to asc
 * - Click different column → reset to asc for new column
 */
export function getNextSortState(current: SortState, field: SortField): SortState {
  if (current.field === field) {
    // Same field: toggle direction (asc → desc → asc)
    return {
      field,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    };
  }
  // Different field: reset to asc
  return { field, direction: 'asc' };
}

// --- Initial states ---

const INITIAL_FILTER_STATE: FilterState = {
  search: '',
  districts: [],
  propertyType: null,
  status: null,
};

const INITIAL_SORT_STATE: SortState = {
  field: null,
  direction: 'asc',
};

const DEBOUNCE_DELAY = 300;

// --- Hook ---

/**
 * Manages filter and sort state for the listings list view.
 * Produces a filtered and sorted listing array from the input listings.
 *
 * Features:
 * - Debounced search (300ms, min 2 chars)
 * - Multi-select district filter
 * - Single-select property type and status filters
 * - AND composition of all active filters
 * - Sortable columns with null-last behavior
 * - Sort state machine (asc → desc → asc cycling)
 */
export function useListingsFilter(listings: Listing[]): UseListingsFilterReturn {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortState>(INITIAL_SORT_STATE);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));

    // Debounce the actual search filtering
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      debounceTimerRef.current = null;
    }, DEBOUNCE_DELAY);
  }, []);

  const setDistricts = useCallback((districts: string[]) => {
    setFilters((prev) => ({ ...prev, districts }));
  }, []);

  const setPropertyType = useCallback((type: PropertyType | null) => {
    setFilters((prev) => ({ ...prev, propertyType: type }));
  }, []);

  const setStatus = useCallback((status: ListingStatus | null) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
    setDebouncedSearch('');
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    setSort((current) => getNextSortState(current, field));
  }, []);

  // Compute filtered and sorted listings
  const filteredListings = useMemo(() => {
    // Use debounced search value for actual filtering
    const activeFilters: FilterState = {
      ...filters,
      search: debouncedSearch,
    };
    const filtered = filterListings(listings, activeFilters);
    return sortListings(filtered, sort);
  }, [listings, filters, debouncedSearch, sort]);

  return {
    filters,
    setSearch,
    setDistricts,
    setPropertyType,
    setStatus,
    clearAllFilters,
    sort,
    toggleSort,
    filteredListings,
    totalCount: listings.length,
  };
}
