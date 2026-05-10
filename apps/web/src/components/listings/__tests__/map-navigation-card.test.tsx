import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MapNavigationLinks } from '../map-navigation-links';

const validProps = {
  address: '123 Orchard Road',
  postalCode: '238858',
};

describe('MapNavigationLinks', () => {
  describe('renders both icon links with valid props (Req 1.2, 1.4)', () => {
    it('renders Google Maps link', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/Google Maps/);
      expect(link).toBeInTheDocument();
    });

    it('renders OneMap link', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/OneMap/);
      expect(link).toBeInTheDocument();
    });

    it('Google Maps link has correct href', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/Google Maps/);
      expect(link).toHaveAttribute(
        'href',
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('123 Orchard Road Singapore 238858')}`,
      );
    });

    it('OneMap link has correct href', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/OneMap/);
      expect(link).toHaveAttribute(
        'href',
        'https://www.onemap.gov.sg/v2/?postal=238858',
      );
    });
  });

  describe('returns null when address or postal code is invalid (Req 1.5)', () => {
    it('renders nothing when address is empty', () => {
      const { container } = render(
        <MapNavigationLinks address="" postalCode={validProps.postalCode} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when address is whitespace only', () => {
      const { container } = render(
        <MapNavigationLinks address="   " postalCode={validProps.postalCode} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when postal code is too short', () => {
      const { container } = render(
        <MapNavigationLinks address={validProps.address} postalCode="1234" />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when postal code contains letters', () => {
      const { container } = render(
        <MapNavigationLinks address={validProps.address} postalCode="12345a" />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when postal code is empty', () => {
      const { container } = render(
        <MapNavigationLinks address={validProps.address} postalCode="" />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('links have correct target, rel, and aria-label attributes (Req 5.1, 5.2, 5.3)', () => {
    it('Google Maps link has target="_blank"', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/Google Maps/);
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('Google Maps link has rel="noopener noreferrer"', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/Google Maps/);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('Google Maps link has aria-label containing service name and address', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/Google Maps/);
      expect(link.getAttribute('aria-label')).toContain('Google Maps');
      expect(link.getAttribute('aria-label')).toContain('123 Orchard Road');
    });

    it('OneMap link has target="_blank"', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/OneMap/);
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('OneMap link has rel="noopener noreferrer"', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/OneMap/);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('OneMap link has aria-label containing service name and address', () => {
      render(<MapNavigationLinks {...validProps} />);
      const link = screen.getByLabelText(/OneMap/);
      expect(link.getAttribute('aria-label')).toContain('OneMap');
      expect(link.getAttribute('aria-label')).toContain('123 Orchard Road');
    });
  });
});
