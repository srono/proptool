import type { Listing } from '@propagent/shared';

/**
 * Filters listings for the listing search modal.
 *
 * Only listings with listing_status === 'live' are ever returned.
 * If the query is fewer than 2 characters, all live listings are returned (no text filtering).
 * If the query is 2+ characters, a case-insensitive substring match is applied
 * against address, district, or property_type.
 */
export function filterListings(listings: Listing[], query: string): Listing[] {
  const liveListings = listings.filter(
    (listing) => listing.listing_status === 'live'
  );

  if (query.length < 2) {
    return liveListings;
  }

  const lowerQuery = query.toLowerCase();

  return liveListings.filter(
    (listing) =>
      listing.address.toLowerCase().includes(lowerQuery) ||
      listing.district.toLowerCase().includes(lowerQuery) ||
      listing.property_type.toLowerCase().includes(lowerQuery)
  );
}
