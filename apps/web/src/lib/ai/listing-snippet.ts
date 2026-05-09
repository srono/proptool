import type { Listing } from '@propagent/shared';
import { formatPrice } from './format-price';

/**
 * Formats a listing into a multi-line snippet suitable for WhatsApp messages.
 * Uses emoji-prefixed lines for property type/address, floor area/tenure, price, and description.
 *
 * Sale format includes asking price with PSF.
 * Rental format includes monthly rental.
 * Description line only appears if description exists, truncated to 200 chars.
 */
export function formatListingSnippet(listing: Listing): string {
  const lines: string[] = [];

  // Line 1: Property type and address with district
  const propertyTypeLabel = formatPropertyType(listing.property_type);
  lines.push(`🏠 ${propertyTypeLabel} | ${listing.address}, ${listing.district}`);

  // Line 2: Floor area and tenure
  const sqft = listing.floor_area_sqft.toLocaleString('en-US');
  lines.push(`📐 ${sqft} sqft | ${formatTenure(listing.tenure)}`);

  // Line 3: Price (sale or rental)
  if (listing.listing_type === 'sale' && listing.asking_price != null) {
    const priceStr = formatPrice(listing.asking_price);
    if (listing.psf != null) {
      const psfStr = formatPrice(listing.psf);
      lines.push(`💰 ${priceStr} (${psfStr} psf)`);
    } else {
      lines.push(`💰 ${priceStr}`);
    }
  } else if (listing.listing_type === 'rental' && listing.asking_rental != null) {
    const rentalStr = formatPrice(listing.asking_rental);
    lines.push(`💰 ${rentalStr}/mo`);
  }

  // Line 4: Description (only if present, truncated to 200 chars)
  if (listing.description) {
    const truncated =
      listing.description.length > 200
        ? listing.description.slice(0, 200) + '…'
        : listing.description;
    lines.push(`📝 ${truncated}`);
  }

  return lines.join('\n');
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

function formatTenure(tenure: string): string {
  switch (tenure) {
    case 'freehold':
      return 'Freehold';
    case '99yr':
      return '99-year Leasehold';
    case '999yr':
      return '999-year Leasehold';
    default:
      return tenure;
  }
}
