import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildGoogleMapsUrl,
  buildOneMapUrl,
  buildAriaLabel,
} from '../url-builders';

/**
 * Feature: listing-map-navigation, Property 1: Google Maps URL Construction
 * Validates: Requirements 2.1, 2.2
 *
 * For any non-empty address string and valid 6-digit postal code,
 * buildGoogleMapsUrl SHALL produce a URL that starts with the correct prefix
 * and contains the encoded address + "Singapore" + postal code.
 */
describe('Feature: listing-map-navigation, Property 1: Google Maps URL Construction', () => {
  const nonEmptyAddress = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);
  const validPostalCode = fc.stringMatching(/^\d{6}$/);

  it('URL starts with the Google Maps search prefix', () => {
    fc.assert(
      fc.property(nonEmptyAddress, validPostalCode, (address, postalCode) => {
        const url = buildGoogleMapsUrl(address, postalCode);
        expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
      }),
      { numRuns: 100 }
    );
  });

  it('URL contains the encoded address, "Singapore", and postal code', () => {
    fc.assert(
      fc.property(nonEmptyAddress, validPostalCode, (address, postalCode) => {
        const url = buildGoogleMapsUrl(address, postalCode);
        const queryParam = url.split('query=')[1];
        const decoded = decodeURIComponent(queryParam);
        expect(decoded).toContain(address);
        expect(decoded).toContain('Singapore');
        expect(decoded).toContain(postalCode);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: listing-map-navigation, Property 2: Address Percent-Encoding
 * Validates: Requirements 2.3
 *
 * For any address string, the address portion of the Google Maps URL produced by
 * buildGoogleMapsUrl SHALL be percent-encoded such that decoding it with
 * decodeURIComponent returns the original address string (round-trip property).
 */
describe('Feature: listing-map-navigation, Property 2: Address Percent-Encoding', () => {
  const anyAddress = fc.string({ minLength: 1, maxLength: 200 });
  const validPostalCode = fc.stringMatching(/^\d{6}$/);

  it('decodeURIComponent of the encoded query returns the original address', () => {
    fc.assert(
      fc.property(anyAddress, validPostalCode, (address, postalCode) => {
        const url = buildGoogleMapsUrl(address, postalCode);
        const queryParam = url.split('query=')[1];
        const decoded = decodeURIComponent(queryParam);
        // The decoded query is "{address} Singapore {postalCode}"
        // Extract the address portion by removing the known suffix
        const suffix = ` Singapore ${postalCode}`;
        expect(decoded.endsWith(suffix)).toBe(true);
        const extractedAddress = decoded.slice(0, decoded.length - suffix.length);
        expect(extractedAddress).toBe(address);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: listing-map-navigation, Property 3: OneMap URL Construction
 * Validates: Requirements 3.1
 *
 * For any valid 6-digit postal code, buildOneMapUrl SHALL produce
 * a URL of the form https://www.onemap.gov.sg/v2/?postal={postalCode}
 * where {postalCode} is the exact input string.
 */
describe('Feature: listing-map-navigation, Property 3: OneMap URL Construction', () => {
  const validPostalCode = fc.stringMatching(/^\d{6}$/);

  it('URL matches the expected OneMap format with exact postal code', () => {
    fc.assert(
      fc.property(validPostalCode, (postalCode) => {
        const url = buildOneMapUrl(postalCode);
        expect(url).toBe(`https://www.onemap.gov.sg/v2/?postal=${postalCode}`);
      }),
      { numRuns: 100 }
    );
  });

  it('URL starts with the OneMap prefix', () => {
    fc.assert(
      fc.property(validPostalCode, (postalCode) => {
        const url = buildOneMapUrl(postalCode);
        expect(url.startsWith('https://www.onemap.gov.sg/v2/?postal=')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: listing-map-navigation, Property 6: Aria-Label Format
 * Validates: Requirements 5.1, 5.2
 *
 * For any non-empty service name and non-empty address string,
 * buildAriaLabel SHALL produce a string that contains both the service name
 * and the full address.
 */
describe('Feature: listing-map-navigation, Property 6: Aria-Label Format', () => {
  const serviceName = fc.constantFrom('Google Maps', 'OneMap');
  const nonEmptyAddress = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);

  it('aria-label contains the service name', () => {
    fc.assert(
      fc.property(serviceName, nonEmptyAddress, (service, address) => {
        const label = buildAriaLabel(service, address);
        expect(label).toContain(service);
      }),
      { numRuns: 100 }
    );
  });

  it('aria-label contains the full address', () => {
    fc.assert(
      fc.property(serviceName, nonEmptyAddress, (service, address) => {
        const label = buildAriaLabel(service, address);
        expect(label).toContain(address);
      }),
      { numRuns: 100 }
    );
  });
});
