import type { AdPlatform, AdTone, AdLength, CtaStyle } from './ad-copy-types';

/**
 * Generation form parameters to validate.
 */
export interface GenerationFormFields {
  platform: AdPlatform | null | undefined | '';
  tone: AdTone | null | undefined | '';
  length: AdLength | null | undefined | '';
  cta_style: CtaStyle | null | undefined | '';
}

/**
 * Listing data fields relevant to validation.
 * Uses a minimal shape so the validator doesn't depend on the full Listing type.
 */
export interface ListingDataForValidation {
  address: string | null | undefined;
  property_type: string | null | undefined;
  listing_type: string | null | undefined;
  asking_price: number | null | undefined;
  asking_rental: number | null | undefined;
}

/**
 * Structured validation result.
 */
export interface ValidationResult {
  valid: boolean;
  missingFormFields: string[];
  missingListingFields: string[];
}

/**
 * Validates generation form fields and mandatory listing data.
 *
 * - All four generation form fields (platform, tone, length, cta_style) must have non-empty values.
 * - Mandatory listing fields (address, property_type, listing_type) must be present.
 * - At least one of asking_price or asking_rental must be present (non-null, non-undefined).
 *
 * Returns a structured result indicating whether the form is valid and which fields are missing.
 */
export function validateGenerationForm(
  formFields: GenerationFormFields,
  listingData: ListingDataForValidation
): ValidationResult {
  const missingFormFields: string[] = [];
  const missingListingFields: string[] = [];

  // Validate required generation form fields
  if (!formFields.platform) {
    missingFormFields.push('platform');
  }
  if (!formFields.tone) {
    missingFormFields.push('tone');
  }
  if (!formFields.length) {
    missingFormFields.push('length');
  }
  if (!formFields.cta_style) {
    missingFormFields.push('cta_style');
  }

  // Validate mandatory listing fields
  if (!listingData.address || listingData.address.trim() === '') {
    missingListingFields.push('address');
  }
  if (!listingData.property_type || listingData.property_type.trim() === '') {
    missingListingFields.push('property_type');
  }
  if (!listingData.listing_type || listingData.listing_type.trim() === '') {
    missingListingFields.push('listing_type');
  }

  // At least one of asking_price or asking_rental must be present
  const hasPrice =
    listingData.asking_price !== null && listingData.asking_price !== undefined;
  const hasRental =
    listingData.asking_rental !== null && listingData.asking_rental !== undefined;

  if (!hasPrice && !hasRental) {
    missingListingFields.push('price/rental');
  }

  const valid = missingFormFields.length === 0 && missingListingFields.length === 0;

  return { valid, missingFormFields, missingListingFields };
}
