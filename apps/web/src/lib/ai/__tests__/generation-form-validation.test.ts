import { describe, it, expect } from 'vitest';
import {
  validateGenerationForm,
  type GenerationFormFields,
  type ListingDataForValidation,
} from '../generation-form-validation';

const validFormFields: GenerationFormFields = {
  platform: 'facebook',
  tone: 'professional',
  length: 'medium',
  cta_style: 'enquire_now',
};

const validListingData: ListingDataForValidation = {
  address: '123 Orchard Road',
  property_type: 'condo',
  listing_type: 'sale',
  asking_price: 1500000,
  asking_rental: null,
};

describe('validateGenerationForm', () => {
  it('returns valid when all required fields are present', () => {
    const result = validateGenerationForm(validFormFields, validListingData);
    expect(result.valid).toBe(true);
    expect(result.missingFormFields).toEqual([]);
    expect(result.missingListingFields).toEqual([]);
  });

  it('reports missing platform when null', () => {
    const result = validateGenerationForm(
      { ...validFormFields, platform: null },
      validListingData
    );
    expect(result.valid).toBe(false);
    expect(result.missingFormFields).toContain('platform');
  });

  it('reports missing tone when empty string', () => {
    const result = validateGenerationForm(
      { ...validFormFields, tone: '' },
      validListingData
    );
    expect(result.valid).toBe(false);
    expect(result.missingFormFields).toContain('tone');
  });

  it('reports missing length when undefined', () => {
    const result = validateGenerationForm(
      { ...validFormFields, length: undefined },
      validListingData
    );
    expect(result.valid).toBe(false);
    expect(result.missingFormFields).toContain('length');
  });

  it('reports missing cta_style when null', () => {
    const result = validateGenerationForm(
      { ...validFormFields, cta_style: null },
      validListingData
    );
    expect(result.valid).toBe(false);
    expect(result.missingFormFields).toContain('cta_style');
  });

  it('reports all missing form fields when all are empty', () => {
    const result = validateGenerationForm(
      { platform: null, tone: null, length: null, cta_style: null },
      validListingData
    );
    expect(result.valid).toBe(false);
    expect(result.missingFormFields).toEqual(['platform', 'tone', 'length', 'cta_style']);
  });

  it('reports missing address when null', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      address: null,
    });
    expect(result.valid).toBe(false);
    expect(result.missingListingFields).toContain('address');
  });

  it('reports missing address when empty string', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      address: '   ',
    });
    expect(result.valid).toBe(false);
    expect(result.missingListingFields).toContain('address');
  });

  it('reports missing property_type when null', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      property_type: null,
    });
    expect(result.valid).toBe(false);
    expect(result.missingListingFields).toContain('property_type');
  });

  it('reports missing listing_type when empty string', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      listing_type: '',
    });
    expect(result.valid).toBe(false);
    expect(result.missingListingFields).toContain('listing_type');
  });

  it('reports missing price/rental when both are null', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      asking_price: null,
      asking_rental: null,
    });
    expect(result.valid).toBe(false);
    expect(result.missingListingFields).toContain('price/rental');
  });

  it('is valid when only asking_rental is present', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      asking_price: null,
      asking_rental: 3500,
    });
    expect(result.valid).toBe(true);
    expect(result.missingListingFields).toEqual([]);
  });

  it('is valid when only asking_price is present', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      asking_price: 1000000,
      asking_rental: null,
    });
    expect(result.valid).toBe(true);
    expect(result.missingListingFields).toEqual([]);
  });

  it('reports both form and listing field errors simultaneously', () => {
    const result = validateGenerationForm(
      { ...validFormFields, platform: null },
      { ...validListingData, address: null, asking_price: null, asking_rental: null }
    );
    expect(result.valid).toBe(false);
    expect(result.missingFormFields).toContain('platform');
    expect(result.missingListingFields).toContain('address');
    expect(result.missingListingFields).toContain('price/rental');
  });

  it('treats asking_price of 0 as present', () => {
    const result = validateGenerationForm(validFormFields, {
      ...validListingData,
      asking_price: 0,
      asking_rental: null,
    });
    expect(result.valid).toBe(true);
    expect(result.missingListingFields).toEqual([]);
  });
});
