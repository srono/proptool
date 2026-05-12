// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentWarningDialog } from '../consent-warning-dialog';

const defaultProps = {
  open: true,
  consentGapReason: 'Contact ad_purpose "investment" does not match playbook target "own_stay".',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

function renderDialog(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ConsentWarningDialog {...defaultProps} {...overrides} />);
}

describe('ConsentWarningDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when open is true', () => {
      renderDialog();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      renderDialog({ open: false });
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('displays the consent gap reason', () => {
      renderDialog();
      expect(
        screen.getByText(defaultProps.consentGapReason)
      ).toBeInTheDocument();
    });

    it('displays the warning title', () => {
      renderDialog();
      expect(screen.getByText('Consent Warning')).toBeInTheDocument();
    });

    it('has correct ARIA attributes', () => {
      renderDialog();
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'consent-warning-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'consent-warning-description');
    });
  });

  describe('Non-dismissible behavior (Req 10.5)', () => {
    it('does not close on Escape key', () => {
      renderDialog();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('does not close on backdrop click', () => {
      renderDialog();
      // The outer wrapper div
      const backdrop = screen.getByRole('alertdialog').parentElement!;
      fireEvent.click(backdrop);
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Explicit actions (Req 10.5)', () => {
    it('calls onConfirm when "Proceed Anyway" is clicked', () => {
      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /proceed anyway/i }));
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when "Cancel" is clicked', () => {
      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when Cancel is clicked', () => {
      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('does not call onCancel when Proceed is clicked', () => {
      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /proceed anyway/i }));
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Focus management', () => {
    it('auto-focuses the cancel button on open', async () => {
      renderDialog();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();
      });
    });
  });
});
