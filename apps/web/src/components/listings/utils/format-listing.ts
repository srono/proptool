import type { Listing } from '@propagent/shared';

/**
 * Formats the listing price for display.
 * - Sale listings: "S$X" (locale-formatted number)
 * - Rental listings: "S$X/mo"
 * - Null/undefined price: "—"
 */
export function formatListingPrice(listing: Listing): string {
  if (listing.listing_type === 'sale') {
    if (listing.asking_price == null) return '—';
    return `S$${listing.asking_price.toLocaleString('en-SG')}`;
  }

  // rental
  if (listing.asking_rental == null) return '—';
  return `S$${listing.asking_rental.toLocaleString('en-SG')}/mo`;
}

/**
 * Formats the PSF (price per square foot) for display.
 * - Sale listings with floor_area_sqft > 0: "S$X psf"
 * - All other cases: "—"
 */
export function formatListingPsf(listing: Listing): string {
  if (listing.listing_type !== 'sale') return '—';
  if (listing.asking_price == null) return '—';
  if (!listing.floor_area_sqft || listing.floor_area_sqft <= 0) return '—';

  const psf = Math.round(listing.asking_price / listing.floor_area_sqft);
  return `S$${psf.toLocaleString('en-SG')} psf`;
}

/**
 * Determines if a listing's exclusivity is currently active.
 * Returns true only if:
 * - is_exclusive is true AND
 * - exclusivity_expiry is a non-null date string representing a future date
 */
export function isExclusivityActive(listing: Listing): boolean {
  if (!listing.is_exclusive) return false;
  if (listing.exclusivity_expiry == null) return false;

  const expiryDate = new Date(listing.exclusivity_expiry);
  // Invalid date check
  if (isNaN(expiryDate.getTime())) return false;

  return expiryDate > new Date();
}
