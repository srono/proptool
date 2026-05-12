'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { addDays, format } from 'date-fns';

interface SnoozeDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Snooze dialog for nurture tasks.
 * Allows the agent to pick a new due date (1–90 days from today)
 * and PATCHes the task status to "snoozed" with the selected due_at.
 *
 * Validates: Requirements 6.7, 5.4
 */
export function SnoozeDialog({ taskId, open, onOpenChange, onConfirm }: SnoozeDialogProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Compute min/max date constraints (1–90 days from today)
  const today = new Date();
  const minDate = addDays(today, 1);
  const maxDate = addDays(today, 90);
  const minDateStr = format(minDate, 'yyyy-MM-dd');
  const maxDateStr = format(maxDate, 'yyyy-MM-dd');

  const canConfirm = selectedDate !== '';

  // Capture the trigger element when dialog opens
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Auto-focus date input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate('');
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [onOpenChange]);

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

  async function handleConfirmClick() {
    if (!canConfirm || saving) return;

    setSaving(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`/api/nurture/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'snoozed',
          due_at: new Date(selectedDate).toISOString(),
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
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to snooze task. Please try again.');
        setSaving(false);
        return;
      }

      onConfirm();
      handleClose();
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to snooze task. Please try again.');
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
        aria-labelledby="snooze-dialog-heading"
        className="relative z-10 w-full max-w-sm mx-4 bg-onyx-card border border-onyx-line rounded-2xl p-5 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="snooze-dialog-heading"
            className="text-base font-display font-bold text-white"
          >
            Snooze Task
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-2 hover:text-white transition-colors duration-150 p-1 rounded-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
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

        {/* Description */}
        <p className="text-sm text-gray-2 mb-4">
          Pick a new due date to snooze this task. The task will reappear on the selected date.
        </p>

        {/* Date picker */}
        <label htmlFor="snooze-date" className="block text-sm font-medium text-white mb-1.5">
          New due date
        </label>
        <input
          ref={inputRef}
          id="snooze-date"
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setError(null);
          }}
          min={minDateStr}
          max={maxDateStr}
          disabled={saving}
          className="w-full bg-onyx border border-onyx-line rounded-[14px] px-3 py-2.5 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-[11px] text-gray-2 mt-1">
          Between {format(minDate, 'MMM d, yyyy')} and {format(maxDate, 'MMM d, yyyy')}
        </p>

        {/* Error message */}
        {error && (
          <p className="text-sm text-status-red mt-2" role="alert">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-2 border border-onyx-line rounded-[14px] hover:text-white hover:border-white/20 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!canConfirm || saving}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-[14px] bg-brand text-white hover:bg-brand-deep transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
              !canConfirm || saving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving ? 'Snoozing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
