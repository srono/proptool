'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { enforceCharLimit, isNoteValid, trimNoteBody, TimelineItem } from './note-utils';

interface NoteDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  contactId: string;
  onSaved: (note: TimelineItem) => void;
}

export function NoteDialog({ open, onClose, leadId, contactId, onSaved }: NoteDialogProps) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const charCount = [...body].length;
  const canSave = isNoteValid(body);

  // Capture the trigger element when dialog opens
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Auto-focus textarea when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog is rendered
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setBody('');
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
    // Return focus to trigger button
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const enforced = enforceCharLimit(e.target.value);
    setBody(enforced);
    setError(null);
  }

  async function handleSave() {
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/messages/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          contact_id: contactId,
          body: trimNoteBody(body),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 401) {
        setError('Session expired. Please refresh the page.');
        setSaving(false);
        return;
      }

      if (!res.ok) {
        setError('Failed to save note. Please try again.');
        setSaving(false);
        return;
      }

      const data = await res.json();
      const newNote: TimelineItem = {
        id: data.message.id,
        type: 'note',
        direction: 'outbound',
        body: data.message.body,
        media_url: null,
        timestamp: data.message.sent_at,
      };

      onSaved(newNote);
      handleClose();
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to save note. Please try again.');
      }
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-dialog-heading"
        className="relative z-10 w-full max-w-lg mx-4 bg-onyx-card border border-onyx-line rounded-2xl p-5 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="note-dialog-heading"
            className="text-base font-display font-bold text-white"
          >
            Add Note
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-2 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleInput}
          disabled={saving}
          placeholder="Write a note..."
          className="w-full min-h-[6rem] resize-y bg-onyx border border-onyx-line rounded-lg p-3 text-sm text-white placeholder:text-gray-2/60 focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
          rows={4}
        />

        {/* Character count */}
        {charCount > 0 && (
          <p className="text-[11px] text-gray-2 mt-1 text-right">
            {charCount}/2000
          </p>
        )}

        {/* Error message */}
        {error && (
          <p className="text-sm text-status-red mt-2">{error}</p>
        )}

        {/* Save button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`btn-primary w-full py-2.5 text-sm font-semibold ${
              !canSave || saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
