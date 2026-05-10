import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NoteDialog } from '../note-dialog';

// --- Helpers ---

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  leadId: 'lead-123',
  contactId: 'contact-456',
  onSaved: vi.fn(),
};

function renderDialog(overrides: Partial<typeof defaultProps> = {}) {
  return render(<NoteDialog {...defaultProps} {...overrides} />);
}

function mockFetchSuccess(data = { message: { id: 'msg-1', body: 'Test note', sent_at: '2024-01-01T00:00:00Z' } }) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: () => Promise.resolve(data),
  });
}

function mockFetchFailure(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'Server error' }),
  });
}

// --- Tests ---

describe('NoteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetchSuccess();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Opening and ARIA (Req 1.1, 1.7)', () => {
    it('renders dialog when open is true', () => {
      renderDialog();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      renderDialog({ open: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('has correct ARIA attributes', () => {
      renderDialog();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'note-dialog-heading');
      expect(screen.getByText('Add Note')).toHaveAttribute('id', 'note-dialog-heading');
    });
  });

  describe('Closing behavior (Req 1.3, 1.4, 1.5)', () => {
    it('closes on Escape key', () => {
      renderDialog();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on backdrop click', () => {
      renderDialog();
      // The backdrop container is the outermost fixed div
      const backdrop = screen.getByRole('dialog').parentElement!;
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on close button (X) click', () => {
      renderDialog();
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-focus and placeholder (Req 1.2, 2.2)', () => {
    it('auto-focuses textarea on open', async () => {
      renderDialog();
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a note...')).toHaveFocus();
      });
    });

    it('shows placeholder text when empty', () => {
      renderDialog();
      expect(screen.getByPlaceholderText('Write a note...')).toBeInTheDocument();
    });
  });

  describe('Character count (Req 2.2, 2.5)', () => {
    it('hides character count when textarea is empty', () => {
      renderDialog();
      expect(screen.queryByText(/\/2000/)).not.toBeInTheDocument();
    });

    it('shows character count when textarea has content', async () => {
      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Hello' } });
      });
      expect(screen.getByText('5/2000')).toBeInTheDocument();
    });
  });

  describe('Save button state (Req 3.5, 5.1, 5.2)', () => {
    it('save button is disabled when textarea is empty', () => {
      renderDialog();
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('save button is disabled when textarea contains only whitespace', async () => {
      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '   \n\t  ' } });
      });
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('save button is enabled when textarea has non-whitespace content', async () => {
      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'A valid note' } });
      });
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Saving state (Req 3.3, 3.4)', () => {
    it('shows "Saving..." text during save request', async () => {
      // Make fetch hang so we can observe the saving state
      global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Test note' } });
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('disables textarea during save', async () => {
      global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Test note' } });
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(textarea).toBeDisabled();
    });
  });

  describe('Error handling (Req 3.6, 3.8)', () => {
    it('shows error message on API failure', async () => {
      global.fetch = mockFetchFailure(500);

      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      fireEvent.change(textarea, { target: { value: 'Test note' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save note. Please try again.')).toBeInTheDocument();
      });
    });

    it('shows timeout error after 15 seconds', async () => {
      vi.useFakeTimers();

      // Mock fetch that will be aborted via AbortController
      global.fetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = options.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const abortError = new Error('The operation was aborted.');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          }
        });
      });

      renderDialog();

      // Flush the auto-focus setTimeout(0)
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      const textarea = screen.getByPlaceholderText('Write a note...');
      fireEvent.change(textarea, { target: { value: 'Test note' } });

      const saveButton = screen.getByRole('button', { name: /save/i });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Advance timers past the 15-second timeout
      await act(async () => {
        vi.advanceTimersByTime(15000);
      });

      expect(screen.getByText('Request timed out. Please try again.')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Successful save (Req 3.2)', () => {
    it('closes dialog on successful save', async () => {
      global.fetch = mockFetchSuccess();

      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      fireEvent.change(textarea, { target: { value: 'My note content' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onSaved with the new note on success', async () => {
      global.fetch = mockFetchSuccess({
        message: { id: 'msg-99', body: 'Saved note', sent_at: '2024-06-15T10:00:00Z' },
      });

      renderDialog();
      const textarea = screen.getByPlaceholderText('Write a note...');
      fireEvent.change(textarea, { target: { value: 'Saved note' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSaved).toHaveBeenCalledWith({
          id: 'msg-99',
          type: 'note',
          direction: 'outbound',
          body: 'Saved note',
          media_url: null,
          timestamp: '2024-06-15T10:00:00Z',
        });
      });
    });
  });
});
