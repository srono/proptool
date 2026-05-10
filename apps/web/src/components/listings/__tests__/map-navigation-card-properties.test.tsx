import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MapNavigationLinks } from '../map-navigation-links';

/**
 * Feature: listing-map-navigation, Property 5: Link Visibility Based on Input Validity
 * Validates: Requirements 1.4, 1.5
 *
 * For any address and postal code combination:
 * - Both Google Maps and OneMap links render iff address is non-empty AND postal code is exactly 6 digits
 */
describe('Feature: listing-map-navigation, Property 5: Link Visibility Based on Input Validity', () => {
  const nonEmptyAddress = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);
  const validPostalCode = fc.stringMatching(/^\d{6}$/);
  const invalidPostalCode = fc
    .string({ minLength: 0, maxLength: 20 })
    .filter((s) => !/^\d{6}$/.test(s));
  const emptyOrWhitespaceAddress = fc.constantFrom('', ' ', '  ', '\t', '\n');

  it('Both links render when address is non-empty and postal code is 6 digits', () => {
    fc.assert(
      fc.property(nonEmptyAddress, validPostalCode, (address, postalCode) => {
        const { unmount } = render(
          <MapNavigationLinks address={address} postalCode={postalCode} />
        );
        const googleLink = screen.queryByRole('link', { name: /google maps/i });
        const oneMapLink = screen.queryByRole('link', { name: /onemap/i });
        expect(googleLink).toBeInTheDocument();
        expect(oneMapLink).toBeInTheDocument();
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('No links render when address is empty/whitespace', () => {
    fc.assert(
      fc.property(emptyOrWhitespaceAddress, validPostalCode, (address, postalCode) => {
        const { container, unmount } = render(
          <MapNavigationLinks address={address} postalCode={postalCode} />
        );
        expect(container.firstChild).toBeNull();
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('No links render when postal code is invalid', () => {
    fc.assert(
      fc.property(nonEmptyAddress, invalidPostalCode, (address, postalCode) => {
        const { container, unmount } = render(
          <MapNavigationLinks address={address} postalCode={postalCode} />
        );
        expect(container.firstChild).toBeNull();
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
