'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CopyVariantType } from '@/lib/ai/ad-copy-types';

// --- Type label mapping ---

const TYPE_LABELS: Record<CopyVariantType, string> = {
  primary_caption: 'Primary Caption',
  short_headline: 'Short Headline',
  cta_line: 'CTA Line',
  hashtags: 'Hashtags',
  instagram_caption: 'Instagram Caption',
  whatsapp_promo: 'WhatsApp Promo Text',
  short_form: 'Short Form',
};

// --- Props ---

export interface CopyVariantCardProps {
  type: CopyVariantType;
  content: string;
  maxLength: number;
  isGenerating: boolean;
  isSaved: boolean;
  isSaving: boolean;
  isPublished: boolean;
  isDirty: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onMarkAsUsed: () => void;
}

export function CopyVariantCard({
  type,
  content,
  maxLength,
  isGenerating,
  isSaved,
  isSaving,
  isPublished,
  isDirty,
  onContentChange,
  onSave,
  onMarkAsUsed,
}: CopyVariantCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [clipboardAvailable, setClipboardAvailable] = useState(true);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check clipboard API availability on mount
  useEffect(() => {
    const available =
      typeof navigator !== 'undefined' &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function';
    setClipboardAvailable(available);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!clipboardAvailable) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus('copied');
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch {
      setCopyStatus('error');
      copyTimeoutRef.current = setTimeout(() => {
        setCopyStatus('idle');
      }, 5000);
    }
  }, [content, clipboardAvailable]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= maxLength) {
        onContentChange(newValue);
      }
    },
    [maxLength, onContentChange]
  );

  const label = TYPE_LABELS[type];
  const canSave = !isSaved && !isSaving && content.length > 0;
  const showMarkAsUsed = isSaved && !isPublished;

  return (
    <div className="rounded-xl border border-onyx-line bg-onyx-raised p-4 space-y-3">
      {/* Header: type label + badges */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-2 font-semibold tracking-label uppercase">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {isPublished && (
            <span className="inline-flex items-center rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-semibold text-brand uppercase tracking-label">
              Used
            </span>
          )}
          {isSaving && (
            <span className="text-[10px] text-gray-2 animate-pulse">Saving...</span>
          )}
        </div>
      </div>

      {/* Editable text area */}
      <div className="relative">
        <textarea
          ref={textAreaRef}
          value={content}
          onChange={handleTextChange}
          disabled={isGenerating}
          readOnly={!clipboardAvailable && false}
          aria-label={`${label} content`}
          className={`w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2.5 text-sm text-white resize-y min-h-[100px] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed ${
            !clipboardAvailable ? 'select-all' : ''
          }`}
          maxLength={maxLength}
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-gray-2/60">
          {content.length}/{maxLength}
        </span>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Copy button or fallback */}
        {clipboardAvailable ? (
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isGenerating || copyStatus === 'copied'}
              aria-label={`Copy ${label} to clipboard`}
              className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium min-h-[44px] min-w-[44px] justify-center transition-colors ${
                copyStatus === 'copied'
                  ? 'bg-status-green/15 text-status-green cursor-default'
                  : isGenerating
                    ? 'bg-onyx border border-onyx-line text-gray-2/50 cursor-not-allowed'
                    : 'bg-onyx border border-onyx-line text-gray-2 hover:border-brand hover:text-white cursor-pointer'
              }`}
            >
              {copyStatus === 'copied' ? (
                <>
                  <CheckIcon />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon />
                  Copy
                </>
              )}
            </button>
            {copyStatus === 'error' && (
              <span className="text-[11px] text-status-red" role="alert">
                Failed to copy. Please select and copy manually.
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-gray-2/60">
            Select text above to copy manually
          </span>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          aria-label={`Save ${label}`}
          className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium min-h-[44px] min-w-[44px] justify-center transition-colors ${
            canSave
              ? 'bg-brand/15 text-brand hover:bg-brand/25 cursor-pointer'
              : 'bg-onyx border border-onyx-line text-gray-2/40 cursor-not-allowed'
          }`}
        >
          <SaveIcon />
          {isSaved && !isDirty ? 'Saved' : 'Save'}
        </button>

        {/* Mark as Used action */}
        {showMarkAsUsed && (
          <button
            type="button"
            onClick={onMarkAsUsed}
            aria-label={`Mark ${label} as used`}
            className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium min-h-[44px] min-w-[44px] justify-center bg-onyx border border-onyx-line text-gray-2 hover:border-brand hover:text-white cursor-pointer transition-colors"
          >
            <FlagIcon />
            Mark as Used
          </button>
        )}
      </div>
    </div>
  );
}

// --- Inline SVG Icons ---

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2 2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
