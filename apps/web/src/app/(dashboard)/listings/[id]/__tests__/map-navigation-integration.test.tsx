import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MapNavigationLinks } from '@/components/listings/map-navigation-links';

/**
 * Integration tests for the map navigation links in the listing detail page header.
 */
describe('Map Navigation Integration', () => {
  const validAddress = '1 Raffles Place';
  const validPostalCode = '018956';

  describe('renders both icon links with valid address and postal code', () => {
    it('renders both Google Maps and OneMap links with correct URLs', () => {
      render(
        <MapNavigationLinks
          address={validAddress}
          postalCode={validPostalCode}
        />
      );

      const googleLink = screen.getByRole('link', { name: /google maps/i });
      const oneMapLink = screen.getByRole('link', { name: /onemap/i });

      expect(googleLink).toBeInTheDocument();
      expect(oneMapLink).toBeInTheDocument();

      expect(googleLink).toHaveAttribute(
        'href',
        expect.stringContaining('google.com/maps/search')
      );
      expect(googleLink).toHaveAttribute(
        'href',
        expect.stringContaining(encodeURIComponent(validAddress))
      );

      expect(oneMapLink).toHaveAttribute(
        'href',
        `https://www.onemap.gov.sg/v2/?postal=${validPostalCode}`
      );

      expect(googleLink).toHaveAttribute('target', '_blank');
      expect(googleLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(oneMapLink).toHaveAttribute('target', '_blank');
      expect(oneMapLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('renders nothing when address or postal code is invalid', () => {
    it('renders nothing when address is empty', () => {
      const { container } = render(
        <MapNavigationLinks address="" postalCode={validPostalCode} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when postal code is invalid', () => {
      const { container } = render(
        <MapNavigationLinks address={validAddress} postalCode="123" />
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
