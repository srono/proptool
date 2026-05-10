import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateGenerationForm,
  type GenerationFormFields,
  type ListingDataForValidation,
} from '../generation-form-validation';
import type { AdPlatform, AdTone, AdLength, CtaStyle } from '../ad-copy-types';

// --- Generators ---

const platformArb: fc.Arbitrary<AdPlatform> = fc.constantFrom('facebook', 'instagram', 'whatsapp', 'generic');
const toneArb: fc.Arbitrary<AdTone> = fc.constantFrom('professional', 'premium', 'friendly', 'urgency', 'investor', 'family');
const lengthArb: fc.Arbitrary<AdLength> = fc.constantFrom('short', 'medium', 'long');
const ctaStyleArb: fc.Arbitrary<CtaStyle> = fc.constantFrom('enquire_now', 'whatsapp_now', 'book_viewing', 'request_details');

/** Generate an "empty" form field value (null, undefined, or '') */
const emptyFieldArb: fc.Arbitrary<null | undefined | ''> = fc.constantFrom(null, undefined, '' as const);

/** Generate a valid non-empty address */
const validAddressArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

/** Generate a valid non-empty property_type */
const validPropertyTypeArb = fc.constantFrom('hdb', 'condo', 'landed', 'commercial');

/** Generate a valid non-empty listing_type */
const validListingTypeArb = fc.constantFrom('sale', 'rental');

/** Generate a positive price */
const priceArb = fc.integer({ min: 0, max: 100_000_000 });

/** Generate a form field that is either a valid value or an empty value */
function formFieldArb<T>(validArb: fc.Arbitrary<T>): fc.Arbitrary<T | null | undefined | ''> {
  return fc.oneof(validArb, emptyFieldArb);
}

/** Generate arbitrary GenerationFormFields with a mix of valid and empty values */
const arbitraryFormFieldsArb: fc.Arbitrary<GenerationFormFields> = fc.record({
  platform: formFieldArb(platformArb),
  tone: formFieldArb(toneArb),
  length: formFieldArb(lengthArb),
  cta_style: formFieldArb(ctaStyleArb),
});

/** Generate fully valid GenerationFormFields */
const validFormFieldsArb: fc.Arbitrary<GenerationFormFields> = fc.record({
  platform: platformArb,
  tone: toneArb,
  length: lengthArb,
  cta_style: ctaStyleArb,
});

/** Generate a string field that is either valid or missing (null, undefined, or whitespace-only) */
const missingStringArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.constant('   ')
);

/** Generate arbitrary ListingDataForValidation with a mix of valid and missing values */
const arbitraryListingDataArb: fc.Arbitrary<ListingDataForValidation> = fc.record({
  address: fc.oneof(validAddressArb, missingStringArb),
  property_type: fc.oneof(validPropertyTypeArb as fc.Arbitrary<string>, missingStringArb),
  listing_type: fc.oneof(validListingTypeArb as fc.Arbitrary<string>, missingStringArb),
  asking_price: fc.oneof(priceArb, fc.constant(null), fc.constant(undefined)),
  asking_rental: fc.oneof(priceArb, fc.constant(null), fc.constant(undefined)),
});

/** Generate fully valid ListingDataForValidation (all mandatory fields present) */
const validListingDataArb: fc.Arbitrary<ListingDataForValidation> = fc.record({
  address: validAddressArb,
  property_type: validPropertyTypeArb as fc.Arbitrary<string>,
  listing_type: validListingTypeArb as fc.Arbitrary<string>,
  asking_price: fc.oneof(priceArb, fc.constant(null), fc.constant(undefined)),
  asking_rental: fc.oneof(priceArb, fc.constant(null), fc.constant(undefined)),
}).filter(data => data.asking_price !== null && data.asking_price !== undefined
  || data.asking_rental !== null && data.asking_rental !== undefined);

// --- Helper functions ---

function isFieldPresent(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

function hasPriceOrRental(data: ListingDataForValidation): boolean {
  return (data.asking_price !== null && data.asking_price !== undefined)
    || (data.asking_rental !== null && data.asking_rental !== undefined);
}

// --- Property Tests ---

/**
 * Feature: listing-ad-copy-assistant, Property 2: Generation Form Validation Correctness
 *
 * **Validates: Requirements 3.9, 4.3**
 *
 * For any combination of generation form field values:
 * (a) the form SHALL be valid (generate enabled) if and only if all four required fields
 *     (platform, tone, length, CTA style) have a selected value AND all mandatory listing
 *     fields are present;
 * (b) the generate action SHALL be blocked if and only if any mandatory listing field
 *     (address, property_type, listing_type, or price/rental) is null or empty.
 */
describe('Feature: listing-ad-copy-assistant, Property 2: Generation Form Validation Correctness', () => {
  it('(a) form is valid iff all four required form fields have a selected value', () => {
    fc.assert(
      fc.property(
        arbitraryFormFieldsArb,
        validListingDataArb,
        (formFields, listingData) => {
          const result = validateGenerationForm(formFields, listingData);

          const allFormFieldsPresent =
            isFieldPresent(formFields.platform) &&
            isFieldPresent(formFields.tone) &&
            isFieldPresent(formFields.length) &&
            isFieldPresent(formFields.cta_style);

          if (allFormFieldsPresent) {
            // When all form fields are present and listing data is valid, form should be valid
            expect(result.valid).toBe(true);
            expect(result.missingFormFields).toEqual([]);
          } else {
            // When any form field is missing, form should be invalid
            expect(result.valid).toBe(false);
            expect(result.missingFormFields.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(a) missingFormFields correctly identifies which fields are missing', () => {
    fc.assert(
      fc.property(
        arbitraryFormFieldsArb,
        validListingDataArb,
        (formFields, listingData) => {
          const result = validateGenerationForm(formFields, listingData);

          // Check each field individually
          if (!isFieldPresent(formFields.platform)) {
            expect(result.missingFormFields).toContain('platform');
          } else {
            expect(result.missingFormFields).not.toContain('platform');
          }

          if (!isFieldPresent(formFields.tone)) {
            expect(result.missingFormFields).toContain('tone');
          } else {
            expect(result.missingFormFields).not.toContain('tone');
          }

          if (!isFieldPresent(formFields.length)) {
            expect(result.missingFormFields).toContain('length');
          } else {
            expect(result.missingFormFields).not.toContain('length');
          }

          if (!isFieldPresent(formFields.cta_style)) {
            expect(result.missingFormFields).toContain('cta_style');
          } else {
            expect(result.missingFormFields).not.toContain('cta_style');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(b) generate is blocked iff any mandatory listing field is missing', () => {
    fc.assert(
      fc.property(
        validFormFieldsArb,
        arbitraryListingDataArb,
        (formFields, listingData) => {
          const result = validateGenerationForm(formFields, listingData);

          const addressPresent = isFieldPresent(listingData.address);
          const propertyTypePresent = isFieldPresent(listingData.property_type);
          const listingTypePresent = isFieldPresent(listingData.listing_type);
          const priceOrRentalPresent = hasPriceOrRental(listingData);

          const allListingFieldsPresent =
            addressPresent && propertyTypePresent && listingTypePresent && priceOrRentalPresent;

          if (allListingFieldsPresent) {
            // When all mandatory listing fields are present and form fields are valid
            expect(result.valid).toBe(true);
            expect(result.missingListingFields).toEqual([]);
          } else {
            // When any mandatory listing field is missing, generate should be blocked
            expect(result.valid).toBe(false);
            expect(result.missingListingFields.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(b) missingListingFields correctly identifies which listing fields are missing', () => {
    fc.assert(
      fc.property(
        validFormFieldsArb,
        arbitraryListingDataArb,
        (formFields, listingData) => {
          const result = validateGenerationForm(formFields, listingData);

          if (!isFieldPresent(listingData.address)) {
            expect(result.missingListingFields).toContain('address');
          } else {
            expect(result.missingListingFields).not.toContain('address');
          }

          if (!isFieldPresent(listingData.property_type)) {
            expect(result.missingListingFields).toContain('property_type');
          } else {
            expect(result.missingListingFields).not.toContain('property_type');
          }

          if (!isFieldPresent(listingData.listing_type)) {
            expect(result.missingListingFields).toContain('listing_type');
          } else {
            expect(result.missingListingFields).not.toContain('listing_type');
          }

          if (!hasPriceOrRental(listingData)) {
            expect(result.missingListingFields).toContain('price/rental');
          } else {
            expect(result.missingListingFields).not.toContain('price/rental');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(a+b) form is valid iff all form fields AND all listing fields are present', () => {
    fc.assert(
      fc.property(
        arbitraryFormFieldsArb,
        arbitraryListingDataArb,
        (formFields, listingData) => {
          const result = validateGenerationForm(formFields, listingData);

          const allFormFieldsPresent =
            isFieldPresent(formFields.platform) &&
            isFieldPresent(formFields.tone) &&
            isFieldPresent(formFields.length) &&
            isFieldPresent(formFields.cta_style);

          const allListingFieldsPresent =
            isFieldPresent(listingData.address) &&
            isFieldPresent(listingData.property_type) &&
            isFieldPresent(listingData.listing_type) &&
            hasPriceOrRental(listingData);

          const expectedValid = allFormFieldsPresent && allListingFieldsPresent;

          expect(result.valid).toBe(expectedValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});
