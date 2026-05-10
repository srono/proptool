import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MarketingSection } from '../marketing-section';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// --- Helpers ---

const defaultProps = {
  listingId: 'listing-abc',
  listingStatus: 'active',
  savedAssetsCount: 3,
};

function renderSection(overrides: Partial<typeof defaultProps> = {}) {
  return render(<MarketingSection {...defaultProps} {...overrides} />);
}

// --- Tests ---

describe('MarketingSection', () => {
  describe('Generate Ad Copy button (Req 1.2, 1.3)', () => {
    it('renders "Generate Ad Copy" as a link to the correct URL for active listings', () => {
      renderSection();
      const link = screen.getByRole('link', { name: /generate ad copy/i });
      expect(link).toHaveAttribute('href', '/tools/ad-copy/listing-abc');
    });

    it('uses the listing ID in the URL', () => {
      renderSection({ listingId: 'listing-xyz' });
      const link = screen.getByRole('link', { name: /generate ad copy/i });
      expect(link).toHaveAttribute('href', '/tools/ad-copy/listing-xyz');
    });
  });

  describe('Disabled for draft listings (Req 1.5)', () => {
    it('renders disabled button instead of link for draft listings', () => {
      renderSection({ listingStatus: 'draft' });
      const button = screen.getByRole('button', { name: /generate ad copy/i });
      expect(button).toBeDisabled();
    });

    it('does not render a link for draft listings', () => {
      renderSection({ listingStatus: 'draft' });
      expect(screen.queryByRole('link', { name: /generate ad copy/i })).not.toBeInTheDocument();
    });

    it('displays explanatory text for draft listings', () => {
      renderSection({ listingStatus: 'draft' });
      expect(
        screen.getByText(/publish this listing before generating ad copy/i)
      ).toBeInTheDocument();
    });

    it('does not display explanatory text for active listings', () => {
      renderSection({ listingStatus: 'active' });
      expect(
        screen.queryByText(/publish this listing before generating ad copy/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Saved assets count (Req 11.1)', () => {
    it('displays the saved assets count', () => {
      renderSection({ savedAssetsCount: 5 });
      expect(screen.getByText('5 saved assets')).toBeInTheDocument();
    });

    it('displays singular form for 1 asset', () => {
      renderSection({ savedAssetsCount: 1 });
      expect(screen.getByText('1 saved asset')).toBeInTheDocument();
    });

    it('displays "0 saved assets" when no assets exist', () => {
      renderSection({ savedAssetsCount: 0 });
      expect(screen.getByText('0 saved assets')).toBeInTheDocument();
    });
  });

  describe('Placeholder buttons (Req 1.4)', () => {
    it('renders disabled "Generate Flyer" button', () => {
      renderSection();
      const button = screen.getByRole('button', { name: /generate flyer/i });
      expect(button).toBeDisabled();
    });

    it('renders disabled "Copy Listing Link" button', () => {
      renderSection();
      const button = screen.getByRole('button', { name: /copy listing link/i });
      expect(button).toBeDisabled();
    });

    it('renders disabled "View Landing Page" button', () => {
      renderSection();
      const button = screen.getByRole('button', { name: /view landing page/i });
      expect(button).toBeDisabled();
    });
  });
});
