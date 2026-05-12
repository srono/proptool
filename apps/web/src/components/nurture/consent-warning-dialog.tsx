'use client';

import { useEffect, useRef } from 'react';

interface ConsentWarningDialogProps {
  open: boolean;
  consentGapReason: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Non-dismissible consent warning dialog.
 * Displays the consent gap reason and requires the agent to explicitly
 * confirm or cancel before proceeding with a nurture task execution.
 *
 * Validates: Requirement 10.5
 */
export function ConsentWarningDialog({
  open,
  consentGapReason,
  onConfirm,
  onCancel,
}: ConsentWarningDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the trigger element when dialog opens
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  // Auto-focus cancel button when dialog opens (safer default)
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Focus trap — no Escape key handling (non-dismissible)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Block Escape — dialog is non-dismissible
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }

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

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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

  // Restore focus on close
  function restoreFocus() {
    if (triggerRef.current && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }

  function handleConfirm() {
    restoreFocus();
    onConfirm();
  }

  function handleCancel() {
    restoreFocus();
    onCancel();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop — no click handler (non-dismissible) */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="consent-warning-title"
        aria-describedby="consent-warning-description"
        className="relative z-10 w-full max-w-md mx-4 bg-onyx-card border border-onyx-line rounded-2xl p-5 shadow-xl"
      >
        {/* Warning icon and title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 mt-0.5">
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
              className="text-status-yellow"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2
            id="consent-warning-title"
            className="text-base font-display font-bold text-white"
          >
            Consent Warning
          </h2>
        </div>

        {/* Description */}
        <p
          id="consent-warning-description"
          className="text-sm text-gray-2 mb-5 leading-relaxed"
        >
          {consentGapReason}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleCancel}
            className="flex-1 py-2.5 text-sm font-semibold rounded-pill border border-onyx-line bg-transparent text-white hover:bg-onyx-card transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 text-sm font-semibold rounded-pill bg-status-yellow text-black hover:bg-status-yellow/90 transition-colors"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
