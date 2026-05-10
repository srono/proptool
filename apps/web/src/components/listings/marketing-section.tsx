'use client';

import Link from 'next/link';

interface MarketingSectionProps {
  listingId: string;
  listingStatus: string;
  savedAssetsCount: number;
}

export function MarketingSection({
  listingId,
  listingStatus,
  savedAssetsCount,
}: MarketingSectionProps) {
  const isDraft = listingStatus === 'draft';

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-[22px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base text-white">
          Marketing
        </h3>
        <span className="text-xs text-gray-2">
          {savedAssetsCount} saved asset{savedAssetsCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-4 space-y-2.5">
        {/* Generate Ad Copy — primary action */}
        {isDraft ? (
          <div>
            <button
              disabled
              className="btn-primary w-full text-xs opacity-50 cursor-not-allowed"
            >
              Generate Ad Copy
            </button>
            <p className="text-[11px] text-gray-2 mt-1.5">
              Publish this listing before generating ad copy.
            </p>
          </div>
        ) : (
          <Link
            href={`/tools/ad-copy/${listingId}`}
            className="btn-primary w-full text-xs block text-center"
          >
            Generate Ad Copy
          </Link>
        )}

        {/* Placeholder buttons — disabled */}
        <button
          disabled
          className="btn-ghost w-full text-xs opacity-50 cursor-not-allowed"
        >
          Generate Flyer
        </button>
        <button
          disabled
          className="btn-ghost w-full text-xs opacity-50 cursor-not-allowed"
        >
          Copy Listing Link
        </button>
        <button
          disabled
          className="btn-ghost w-full text-xs opacity-50 cursor-not-allowed"
        >
          View Landing Page
        </button>
      </div>
    </div>
  );
}
