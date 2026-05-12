import Link from 'next/link';
import { PIPELINE_STAGES } from '@agentos/shared';
import type { PipelineStage } from '@agentos/shared';

export interface SellerCardProps {
  seller: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
  sellerLead: {
    id: string;
    status: PipelineStage;
    is_active: boolean;
  } | null;
  listingId: string;
}

function getPipelineStageLabel(stage: PipelineStage): string {
  const found = PIPELINE_STAGES.find((s) => s.key === stage);
  return found?.label ?? stage;
}

export function SellerCard({ seller, sellerLead, listingId }: SellerCardProps) {
  // No seller attached — show CTA
  if (!seller) {
    return (
      <div className="bg-onyx-card border border-onyx-line rounded-2xl p-[22px]">
        <h3 className="font-display font-bold text-base text-white">Seller</h3>
        <div className="mt-4 flex flex-col items-center gap-3 py-4">
          <div className="w-12 h-12 rounded-full bg-onyx-raised border border-dashed border-gray-2 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-sm text-gray-2 text-center">No seller attached</p>
          <Link
            href={`/listings/${listingId}/edit`}
            className="rounded-lg bg-aqua px-4 py-2 text-sm font-medium text-onyx hover:bg-aqua/90 transition-colors"
          >
            Attach Seller
          </Link>
        </div>
      </div>
    );
  }

  const hasPhone = Boolean(seller.phone);
  const messageHref = sellerLead && sellerLead.is_active
    ? `/messages/${seller.id}?lead=${sellerLead.id}`
    : `/messages/${seller.id}`;

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base text-white">Seller</h3>
        {sellerLead && sellerLead.is_active && (
          <span className="chip text-aqua border-brand/50 bg-brand/[0.12]">
            {getPipelineStageLabel(sellerLead.status)}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {/* Seller info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/contacts/${seller.id}`}
              className="text-sm font-semibold text-white hover:text-aqua transition-colors truncate block"
            >
              {seller.full_name}
            </Link>
            <p className="text-xs text-gray-2 truncate">{seller.phone}</p>
            {seller.email && (
              <p className="text-xs text-gray-2 truncate">{seller.email}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-onyx-line">
          {hasPhone ? (
            <Link
              href={messageHref}
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-aqua px-4 py-2 text-sm font-medium text-onyx hover:bg-aqua/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message Seller
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full rounded-lg bg-onyx-raised border border-onyx-line px-4 py-2 opacity-50 cursor-not-allowed">
              <svg className="w-4 h-4 text-gray-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm text-gray-2">Message Seller</span>
              <span className="text-[10px] text-status-amber ml-1">Phone required</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
