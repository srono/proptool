import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CopyVariantCard } from '../copy-variant-card';

// --- Helpers ---

const defaultProps = {
  type: 'primary_caption' as const,
  content: 'Beautiful condo in Orchard Road',
  maxLength: 2000,
  isGenerating: false,
  isSaved: false,
  isSaving: false,
  isPublished: false,
  isDirty: true,
  onContentChange: vi.fn(),
  onSave: vi.fn(),
  onMarkAsUsed: vi.fn(),
};

function renderCard(overrides: Partial<typeof defaultProps> = {}) {
  return render(<CopyVariantCard {...defaultProps} {...overrides} />);
}

// --- Tests ---

describe('CopyVariantCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API as available
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Copy button feedback (Req 7.4)', () => {
    it('shows "Copy" label initially', () => {
      renderCard();
      expect(screen.getByRole('button', { name: /copy primary caption to clipboard/i })).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('shows "Copied!" feedback after successful copy', async () => {
      vi.useFakeTimers();
      renderCard();
      const copyButton = screen.getByRole('button', { name: /copy primary caption to clipboard/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('reverts "Copied!" back to "Copy" after 2 seconds', async () => {
      vi.useFakeTimers();
      renderCard();
      const copyButton = screen.getByRole('button', { name: /copy primary caption to clipboard/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Copy')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('calls clipboard.writeText with the content', async () => {
      renderCard({ content: 'Test content to copy' });
      const copyButton = screen.getByRole('button', { name: /copy primary caption to clipboard/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test content to copy');
    });
  });

  describe('Clipboard failure and fallback (Req 7.5, 7.6)', () => {
    it('shows error message when clipboard write fails', async () => {
      vi.useFakeTimers();
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      });

      renderCard();
      const copyButton = screen.getByRole('button', { name: /copy primary caption to clipboard/i });

      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText(/failed to copy/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows fallback text when clipboard API is unavailable', () => {
      // Remove clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      renderCard();
      expect(screen.getByText(/select text above to copy manually/i)).toBeInTheDocument();
    });
  });

  describe('Save button state (Req 9.6)', () => {
    it('enables save button when isDirty is true and not saved', () => {
      renderCard({ isDirty: true, isSaved: false });
      const saveButton = screen.getByRole('button', { name: /save primary caption/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('disables save button when isDirty is false', () => {
      renderCard({ isDirty: false, isSaved: false });
      const saveButton = screen.getByRole('button', { name: /save primary caption/i });
      expect(saveButton).toBeDisabled();
    });

    it('disables save button when already saved and not dirty', () => {
      renderCard({ isDirty: false, isSaved: true });
      const saveButton = screen.getByRole('button', { name: /save primary caption/i });
      expect(saveButton).toBeDisabled();
    });

    it('shows "Saved" text when saved and not dirty', () => {
      renderCard({ isDirty: false, isSaved: true });
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('shows "Save" text when not saved', () => {
      renderCard({ isDirty: true, isSaved: false });
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('"Used" badge (Req 10.3)', () => {
    it('displays "Used" badge when isPublished is true', () => {
      renderCard({ isPublished: true, isSaved: true });
      expect(screen.getByText('Used')).toBeInTheDocument();
    });

    it('does not display "Used" badge when isPublished is false', () => {
      renderCard({ isPublished: false });
      expect(screen.queryByText('Used')).not.toBeInTheDocument();
    });
  });

  describe('Mark as Used action (Req 10.1)', () => {
    it('shows "Mark as Used" button when saved but not published', () => {
      renderCard({ isSaved: true, isPublished: false });
      expect(screen.getByRole('button', { name: /mark .* as used/i })).toBeInTheDocument();
    });

    it('hides "Mark as Used" button when published', () => {
      renderCard({ isSaved: true, isPublished: true });
      expect(screen.queryByRole('button', { name: /mark .* as used/i })).not.toBeInTheDocument();
    });

    it('hides "Mark as Used" button when not saved', () => {
      renderCard({ isSaved: false, isPublished: false });
      expect(screen.queryByRole('button', { name: /mark .* as used/i })).not.toBeInTheDocument();
    });
  });

  describe('Generating state (Req 7.2)', () => {
    it('disables copy button while generating', () => {
      renderCard({ isGenerating: true });
      const copyButton = screen.getByRole('button', { name: /copy primary caption to clipboard/i });
      expect(copyButton).toBeDisabled();
    });

    it('disables textarea while generating', () => {
      renderCard({ isGenerating: true });
      const textarea = screen.getByLabelText(/primary caption content/i);
      expect(textarea).toBeDisabled();
    });
  });
});
