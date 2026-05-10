import type { Listing } from '@agentos/shared';

/**
 * Minimal listing shape required by the picker filter.
 * Extends the fields we need from the shared Listing type,
 * plus an optional project_name that may be present on some listings.
 */
export type PickerListing = Pick<
  Listing,
  'id' | 'address' | 'listing_status' | 'created_at'
> & {
  project_name?: string | null;
};

const MAX_RESULTS = 20;
const MIN_QUERY_LENGTH = 2;

/**
 * Filters an in-memory array of listings for the Listing Picker component.
 *
 * - Returns an empty array if the query is fewer than 2 characters.
 * - Matches case-insensitively against address, project_name, or listing_status.
 * - Returns at most 20 results, ordered by created_at descending (most recent first).
 */
export function filterListingsForPicker(
  listings: PickerListing[],
  query: string
): PickerListing[] {
  if (query.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  const matched = listings.filter((listing) => {
    if (listing.address.toLowerCase().includes(lowerQuery)) return true;
    if (
      listing.project_name &&
      listing.project_name.toLowerCase().includes(lowerQuery)
    )
      return true;
    if (listing.listing_status.toLowerCase().includes(lowerQuery)) return true;
    return false;
  });

  const sorted = matched.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return sorted.slice(0, MAX_RESULTS);
}
