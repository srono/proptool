'use client';

import { useState } from 'react';
import type { MarketingAssetRecord } from '@/lib/ai/ad-copy-types';

interface SavedCopySectionProps {
  records: MarketingAssetRecord[];
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  generic: 'Generic',
};

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional',
  premium: 'Premium',
  friendly: 'Friendly',
  urgency: 'Urgency',
  investor: 'Investor',
  family: 'Family',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SavedRecordCard({ record }: { record: MarketingAssetRecord }) {
  const [expanded, setExpanded] = useState(false);

  const isUsed = record.published_at !== null;
  const contentPreviewLength = 150;
  const shouldTruncate = record.content_text.length > contentPreviewLength;
  const displayText =
    expanded || !shouldTruncate
      ? record.content_text
      : record.content_text.slice(0, contentPreviewLength) + '…';

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
      {/* Header row: badges and date */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="inline-flex items-center rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand">
          {PLATFORM_LABELS[record.platform] ?? record.platform}
        </span>
        <span className="inline-flex items-center rounded-full bg-onyx-raised border border-onyx-line px-2.5 py-0.5 text-xs font-medium text-gray-2">
          {TONE_LABELS[record.tone] ?? record.tone}
        </span>
        {isUsed && (
          <span className="inline-flex items-center rounded-full bg-status-green/15 px-2.5 py-0.5 text-xs font-medium text-status-green">
            Used
          </span>
        )}
        <span className="ml-auto text-xs text-gray-2">
          {formatDate(record.created_at)}
        </span>
      </div>

      {/* Content text */}
      <p className="text-sm text-white whitespace-pre-wrap break-words">
        {displayText}
      </p>

      {/* Expand/collapse toggle */}
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-aqua hover:underline min-h-[44px] inline-flex items-center"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

export function SavedCopySection({ records }: SavedCopySectionProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 bg-onyx-card rounded-2xl border border-onyx-line">
        <p className="text-sm text-gray-2">
          No saved copy exists for this listing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] text-gray-2 font-semibold tracking-wide uppercase">
        Saved Copy ({records.length})
      </h3>
      <div className="space-y-2">
        {records.map((record) => (
          <SavedRecordCard key={record.id} record={record} />
        ))}
      </div>
    </div>
  );
}
