import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CopyOutputPanel } from '../copy-output-panel';
import type { AdPlatform, CopyVariant } from '@/lib/ai/ad-copy-types';

// --- Helpers ---

const mockVariants: CopyVariant[] = [
  { type: 'primary_caption', platform: 'facebook', content: 'Beautiful condo in Orchard', max_length: 2000 },
  { type: 'short_headline', platform: 'facebook', content: 'Luxury Living', max_length: 100 },
  { type: 'cta_line', platform: 'facebook', content: 'Enquire now!', max_length: 150 },
  { type: 'hashtags', platform: 'facebook', content: '#condo #singapore #luxury', max_length: 500 },
  { type: 'instagram_caption', platform: 'instagram', content: 'Dream home awaits', max_length: 2200 },
  { type: 'whatsapp_promo', platform: 'whatsapp', content: 'Hi! Check out this listing', max_length: 1000 },
  { type: 'short_form', platform: 'generic', content: 'Short version text', max_length: 280 },
];

interface PanelProps {
  variants: CopyVariant[];
  platform: AdPlatform;
  onVariantChange: (type: string, content: string) => void;
  isGenerating: boolean;
}

const defaultProps: PanelProps = {
  variants: mockVariants,
  platform: 'facebook',
  onVariantChange: vi.fn(),
  isGenerating: false,
};

function renderPanel(overrides: Partial<PanelProps> = {}) {
  return render(<CopyOutputPanel {...defaultProps} {...overrides} />);
}

// --- Tests ---

describe('CopyOutputPanel', () => {
  describe('Tab rendering (Req 5.1)', () => {
    it('renders all four tabs: Facebook, Instagram, WhatsApp, Short Version', () => {
      renderPanel();
      expect(screen.getByRole('tab', { name: 'Facebook' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Instagram' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'WhatsApp' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Short Version' })).toBeInTheDocument();
    });

    it('has a tablist with correct aria-label', () => {
      renderPanel();
      expect(screen.getByRole('tablist', { name: /copy output platform tabs/i })).toBeInTheDocument();
    });
  });

  describe('Active tab matches platform (Req 5.2)', () => {
    it('sets Facebook tab as active when platform is facebook', () => {
      renderPanel({ platform: 'facebook' });
      const tab = screen.getByRole('tab', { name: 'Facebook' });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('sets Instagram tab as active when platform is instagram', () => {
      renderPanel({ platform: 'instagram' });
      const tab = screen.getByRole('tab', { name: 'Instagram' });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('sets WhatsApp tab as active when platform is whatsapp', () => {
      renderPanel({ platform: 'whatsapp' });
      const tab = screen.getByRole('tab', { name: 'WhatsApp' });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    it('defaults to Facebook tab when platform is generic', () => {
      renderPanel({ platform: 'generic' });
      const tab = screen.getByRole('tab', { name: 'Facebook' });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Variant labels display (Req 5.3)', () => {
    it('displays variant type labels for Facebook tab variants', () => {
      renderPanel({ platform: 'facebook' });
      expect(screen.getByText('Primary Caption')).toBeInTheDocument();
      expect(screen.getByText('Short Headline')).toBeInTheDocument();
      expect(screen.getByText('CTA Line')).toBeInTheDocument();
      expect(screen.getByText('Hashtags')).toBeInTheDocument();
    });

    it('displays variant type labels for Instagram tab', () => {
      renderPanel({ platform: 'instagram' });
      expect(screen.getByText('Instagram Caption')).toBeInTheDocument();
    });

    it('displays variant type labels for WhatsApp tab', () => {
      renderPanel({ platform: 'whatsapp' });
      expect(screen.getByText('WhatsApp Promo Text')).toBeInTheDocument();
    });

    it('displays variant type labels for Short Version tab', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('tab', { name: 'Short Version' }));
      expect(screen.getByText('Short Form')).toBeInTheDocument();
    });
  });

  describe('Pre_Publish_Reminder (Req 5.4)', () => {
    it('displays the Pre_Publish_Reminder at the top of the output area', () => {
      renderPanel();
      expect(
        screen.getByText('Review and verify all factual statements before publishing')
      ).toBeInTheDocument();
    });

    it('Pre_Publish_Reminder remains visible when switching tabs', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('tab', { name: 'Instagram' }));
      expect(
        screen.getByText('Review and verify all factual statements before publishing')
      ).toBeInTheDocument();
    });
  });

  describe('Tab switching preserves content', () => {
    it('switching tabs shows correct variants for the selected tab', () => {
      renderPanel({ platform: 'facebook' });
      // Initially on Facebook tab
      expect(screen.getByText('Primary Caption')).toBeInTheDocument();

      // Switch to Instagram
      fireEvent.click(screen.getByRole('tab', { name: 'Instagram' }));
      expect(screen.getByText('Instagram Caption')).toBeInTheDocument();
      expect(screen.queryByText('Primary Caption')).not.toBeInTheDocument();
    });
  });

  describe('Empty and loading states', () => {
    it('shows empty message when no variants for active tab', () => {
      renderPanel({ variants: [], platform: 'facebook' });
      expect(screen.getByText(/no variants available/i)).toBeInTheDocument();
    });

    it('shows generating message when isGenerating and no variants', () => {
      renderPanel({ variants: [], isGenerating: true });
      expect(screen.getByText(/generating copy/i)).toBeInTheDocument();
    });
  });
});
