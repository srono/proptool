import { describe, it, expect } from 'vitest';
import {
  buildGoogleMapsUrl,
  buildOneMapUrl,
  isValidPostalCode,
  buildAriaLabel,
} from '../url-builders';

describe('buildGoogleMapsUrl', () => {
  it('constructs correct URL with encoded address and postal code', () => {
    const url = buildGoogleMapsUrl('123 Orchard Road', '238858');
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=123%20Orchard%20Road%20Singapore%20238858'
    );
  });

  it('percent-encodes special characters in address', () => {
    const url = buildGoogleMapsUrl('Blk 1 #01-02 Toa Payoh', '310001');
    expect(url).toContain('Blk%201%20%2301-02%20Toa%20Payoh');
  });

  it('includes Singapore between address and postal code', () => {
    const url = buildGoogleMapsUrl('Test', '123456');
    expect(url).toContain('Test%20Singapore%20123456');
  });
});

describe('buildOneMapUrl', () => {
  it('constructs correct URL with postal code', () => {
    const url = buildOneMapUrl('560603');
    expect(url).toBe('https://www.onemap.gov.sg/v2/?postal=560603');
  });

  it('works with different postal codes', () => {
    const url = buildOneMapUrl('238858');
    expect(url).toBe('https://www.onemap.gov.sg/v2/?postal=238858');
  });
});

describe('isValidPostalCode', () => {
  it('returns true for exactly 6 digits', () => {
    expect(isValidPostalCode('238858')).toBe(true);
    expect(isValidPostalCode('000000')).toBe(true);
    expect(isValidPostalCode('999999')).toBe(true);
  });

  it('returns false for fewer than 6 digits', () => {
    expect(isValidPostalCode('12345')).toBe(false);
    expect(isValidPostalCode('')).toBe(false);
  });

  it('returns false for more than 6 digits', () => {
    expect(isValidPostalCode('1234567')).toBe(false);
  });

  it('returns false for non-digit characters', () => {
    expect(isValidPostalCode('12345a')).toBe(false);
    expect(isValidPostalCode('abcdef')).toBe(false);
    expect(isValidPostalCode('12 345')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isValidPostalCode(null)).toBe(false);
    expect(isValidPostalCode(undefined)).toBe(false);
  });
});

describe('buildAriaLabel', () => {
  it('contains the service name and address', () => {
    const label = buildAriaLabel('Google Maps', '123 Orchard Road');
    expect(label).toContain('Google Maps');
    expect(label).toContain('123 Orchard Road');
  });

  it('works for OneMap service name', () => {
    const label = buildAriaLabel('OneMap', 'Blk 1 Toa Payoh');
    expect(label).toContain('OneMap');
    expect(label).toContain('Blk 1 Toa Payoh');
  });
});
