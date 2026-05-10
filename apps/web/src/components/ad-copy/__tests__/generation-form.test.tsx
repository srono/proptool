import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GenerationForm } from '../generation-form';
import type { ListingDataForValidation } from '@/lib/ai/generation-form-validation';

// --- Helpers ---

type ListingData = ListingDataForValidation & { listing_id: string };

const validListingData: ListingData = {
  listing_id: 'listing-123',
  address: '123 Orchard Road',
  property_type: 'Condo',
  listing_type: 'sale',
  asking_price: 1500000,
  asking_rental: null,
};

interface FormProps {
  onGenerate: (params: any) => void;
  isGenerating: boolean;
  listingData: ListingData;
}

const defaultProps: FormProps = {
  onGenerate: vi.fn(),
  isGenerating: false,
  listingData: validListingData,
};

function renderForm(overrides: Partial<FormProps> = {}) {
  return render(<GenerationForm {...defaultProps} {...overrides} />);
}

// --- Tests ---

describe('GenerationForm', () => {
  describe('Default values (Req 3.8)', () => {
    it('pre-selects Facebook as the default platform', () => {
      renderForm();
      const platformSelect = screen.getByLabelText(/platform/i) as HTMLSelectElement;
      expect(platformSelect.value).toBe('facebook');
    });

    it('pre-selects Professional as the default tone', () => {
      renderForm();
      const toneSelect = screen.getByLabelText(/tone/i) as HTMLSelectElement;
      expect(toneSelect.value).toBe('professional');
    });

    it('pre-selects Medium as the default length', () => {
      renderForm();
      const lengthSelect = screen.getByLabelText(/length/i) as HTMLSelectElement;
      expect(lengthSelect.value).toBe('medium');
    });

    it('pre-selects Enquire now as the default CTA style', () => {
      renderForm();
      const ctaSelect = screen.getByLabelText(/cta style/i) as HTMLSelectElement;
      expect(ctaSelect.value).toBe('enquire_now');
    });

    it('defaults "Avoid emojis" toggle to off', () => {
      renderForm();
      const toggle = screen.getByRole('switch', { name: /avoid emojis/i });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('defaults "Include hashtags" toggle to on', () => {
      renderForm();
      const toggle = screen.getByRole('switch', { name: /include hashtags/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Required field indicators (Req 3.9, 3.10)', () => {
    it('displays required indicator (*) for Platform label', () => {
      renderForm();
      const label = screen.getByText(/platform/i).closest('label');
      expect(label).toHaveTextContent('*');
    });

    it('displays required indicator (*) for Tone label', () => {
      renderForm();
      const label = screen.getByText(/tone/i).closest('label');
      expect(label).toHaveTextContent('*');
    });

    it('displays required indicator (*) for Length label', () => {
      renderForm();
      const label = screen.getByText(/length/i).closest('label');
      expect(label).toHaveTextContent('*');
    });

    it('displays required indicator (*) for CTA Style label', () => {
      renderForm();
      const label = screen.getByText(/cta style/i).closest('label');
      expect(label).toHaveTextContent('*');
    });

    it('does not display required indicator for Target Audience label', () => {
      renderForm();
      const label = screen.getByText(/target audience/i).closest('label');
      expect(label?.querySelector('.text-brand')).toBeNull();
    });
  });

  describe('Generate button state (Req 3.9)', () => {
    it('enables generate button when all required fields have values and listing data is valid', () => {
      renderForm();
      const button = screen.getByRole('button', { name: /generate ad copy/i });
      expect(button).not.toBeDisabled();
    });

    it('disables generate button when listing is missing mandatory fields', () => {
      renderForm({
        listingData: {
          listing_id: 'listing-123',
          address: null,
          property_type: 'Condo',
          listing_type: 'sale',
          asking_price: null,
          asking_rental: null,
        },
      });
      const button = screen.getByRole('button', { name: /generate ad copy/i });
      expect(button).toBeDisabled();
    });

    it('displays validation message when listing is missing mandatory fields', () => {
      renderForm({
        listingData: {
          listing_id: 'listing-123',
          address: null,
          property_type: 'Condo',
          listing_type: 'sale',
          asking_price: null,
          asking_rental: null,
        },
      });
      expect(screen.getByText(/listing is missing required data/i)).toBeInTheDocument();
    });

    it('shows "Generating..." text when isGenerating is true', () => {
      renderForm({ isGenerating: true });
      expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
    });

    it('disables generate button when isGenerating is true', () => {
      renderForm({ isGenerating: true });
      const button = screen.getByRole('button', { name: /generating/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Form submission', () => {
    it('calls onGenerate with correct params on submit', () => {
      const onGenerate = vi.fn();
      renderForm({ onGenerate });
      const button = screen.getByRole('button', { name: /generate ad copy/i });
      fireEvent.click(button);
      expect(onGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: 'listing-123',
          platform: 'facebook',
          tone: 'professional',
          length: 'medium',
          cta_style: 'enquire_now',
          avoid_emojis: false,
          include_hashtags: true,
        })
      );
    });
  });
});
