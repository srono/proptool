'use client';

import { useMemo } from 'react';
import {
  resolveTemplate,
  type ResolveContext,
  SUPPORTED_PLACEHOLDERS,
} from '@/lib/nurture/template-resolver';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TemplatePreviewProps {
  /** The raw template body with {{placeholder}} patterns */
  body: string;
  /** Context used to resolve placeholders */
  context: ResolveContext;
  /** Optional additional CSS classes */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ResolvedSegment {
  type: 'text' | 'resolved' | 'missing';
  value: string;
  placeholder?: string;
}

/**
 * Parses a template body and context into segments for rendering.
 * Each segment is either plain text, a resolved placeholder value,
 * or a missing placeholder indicator.
 */
function parseTemplateSegments(body: string, ctx: ResolveContext): {
  segments: ResolvedSegment[];
  missingFields: string[];
} {
  const { missing_fields } = resolveTemplate(body, ctx);
  const missingSet = new Set(missing_fields);
  const segments: ResolvedSegment[] = [];

  // Split the template into text and placeholder parts
  const regex = /\{\{(\w+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    // Add preceding text
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, match.index) });
    }

    const key = match[1];
    const isSupported = (SUPPORTED_PLACEHOLDERS as readonly string[]).includes(key);

    if (!isSupported) {
      // Unsupported placeholder — leave as-is
      segments.push({ type: 'text', value: match[0] });
    } else if (missingSet.has(key)) {
      // Supported but missing/empty value
      segments.push({ type: 'missing', value: `{{${key}}}`, placeholder: key });
    } else {
      // Resolved value
      const resolved = resolveTemplate(`{{${key}}}`, ctx);
      segments.push({ type: 'resolved', value: resolved.text, placeholder: key });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add trailing text
  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) });
  }

  return { segments, missingFields: missing_fields };
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Template preview component that resolves placeholders using sample contact data
 * and highlights missing/empty fields with a visual indicator (yellow background).
 *
 * - Resolved placeholders are shown inline with their values
 * - Missing fields (null/empty context values) are highlighted with a yellow
 *   background so the agent can identify gaps before sending
 *
 * Validates: Requirements 13.3, 13.4
 */
export function TemplatePreview({ body, context, className }: TemplatePreviewProps) {
  const { segments, missingFields } = useMemo(
    () => parseTemplateSegments(body, context),
    [body, context]
  );

  return (
    <div className={`space-y-3${className ? ` ${className}` : ''}`}>
      {/* Resolved message preview */}
      <div
        className="bg-onyx-card border border-onyx-line rounded-2xl p-4 text-sm text-white whitespace-pre-wrap leading-relaxed"
        aria-label="Template preview"
      >
        {segments.map((segment, idx) => {
          if (segment.type === 'text') {
            return <span key={idx}>{segment.value}</span>;
          }

          if (segment.type === 'missing') {
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 text-xs font-medium"
                title={`Missing value for: ${segment.placeholder}`}
                role="status"
                aria-label={`Missing field: ${segment.placeholder}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {segment.placeholder}
              </span>
            );
          }

          // resolved
          return (
            <span
              key={idx}
              className="text-brand font-medium"
              title={`Resolved: ${segment.placeholder}`}
            >
              {segment.value}
            </span>
          );
        })}
      </div>

      {/* Missing fields summary */}
      {missingFields.length > 0 && (
        <div
          className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"
          role="alert"
          aria-live="polite"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400 mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="text-xs text-amber-300">
            <p className="font-semibold mb-0.5">
              {missingFields.length} missing {missingFields.length === 1 ? 'field' : 'fields'}
            </p>
            <p className="text-amber-300/80">
              {missingFields.map((f) => `{{${f}}}`).join(', ')} — fill in the contact data or edit manually before sending.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
