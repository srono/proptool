import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { geocodePostalCode } from '../geocode';

/**
 * Feature: listing-map-navigation, Property 4: OneMap API Response Parsing
 * Validates: Requirements 4.2
 *
 * For any valid OneMap API response object containing at least one result with non-empty
 * LATITUDE and LONGITUDE fields, geocodePostalCode SHALL extract and return the latitude
 * and longitude from the first result. For any response with zero results or missing
 * coordinate fields, it SHALL return null.
 */
describe('Feature: listing-map-navigation, Property 4: OneMap API Response Parsing', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('extracts first result coordinates for any valid response with non-empty LATITUDE and LONGITUDE', () => {
    // Generate coordinate-like strings (non-empty, no leading/trailing whitespace)
    const coordinateArb = fc
      .tuple(
        fc.constantFrom('', '-'),
        fc.integer({ min: 0, max: 180 }),
        fc.constantFrom('', '.'),
        fc.integer({ min: 0, max: 999999 })
      )
      .map(([sign, whole, dot, frac]) =>
        dot ? `${sign}${whole}.${frac}` : `${sign}${whole}`
      )
      .filter((s) => s.length > 0 && s !== '-');

    return fc.assert(
      fc.asyncProperty(
        coordinateArb,
        coordinateArb,
        fc.array(
          fc.record({
            SEARCHVAL: fc.string({ minLength: 0, maxLength: 50 }),
            LATITUDE: fc.string({ minLength: 0, maxLength: 15 }),
            LONGITUDE: fc.string({ minLength: 0, maxLength: 15 }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (lat, lng, extraResults) => {
          const mockResponse = {
            found: 1 + extraResults.length,
            totalNumPages: 1,
            pageNum: 1,
            results: [
              { SEARCHVAL: 'TEST ADDRESS', LATITUDE: lat, LONGITUDE: lng },
              ...extraResults,
            ],
          };

          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
          });

          const result = await geocodePostalCode('123456');

          expect(result).not.toBeNull();
          expect(result!.lat).toBe(lat);
          expect(result!.lng).toBe(lng);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null for any response with zero results', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        async (totalNumPages, pageNum) => {
          const mockResponse = {
            found: 0,
            totalNumPages,
            pageNum,
            results: [],
          };

          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
          });

          const result = await geocodePostalCode('123456');

          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns null when first result has empty LATITUDE', () => {
    // Generate non-empty LONGITUDE values (truthy strings)
    const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.length > 0);

    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (lng) => {
        const mockResponse = {
          found: 1,
          totalNumPages: 1,
          pageNum: 1,
          results: [{ SEARCHVAL: 'TEST', LATITUDE: '', LONGITUDE: lng }],
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await geocodePostalCode('123456');

        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('returns null when first result has empty LONGITUDE', () => {
    // Generate non-empty LATITUDE values (truthy strings)
    const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 15 }).filter((s) => s.length > 0);

    return fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (lat) => {
        const mockResponse = {
          found: 1,
          totalNumPages: 1,
          pageNum: 1,
          results: [{ SEARCHVAL: 'TEST', LATITUDE: lat, LONGITUDE: '' }],
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await geocodePostalCode('123456');

        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
