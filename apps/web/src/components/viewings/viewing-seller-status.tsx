'use client';

import { useState } from 'react';
import { Check, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

export interface ViewingSellerStatusProps {
  viewingId: string;
  sellerUpdated: boolean;
  sellerUpdatedAt: string | null;
  onToggle: (viewingId: string, value: boolean) => void;
}

function formatTimestamp(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), 'd MMM yyyy, h:mm a');
  } catch {
    return null;
  }
}

export function ViewingSellerStatus({
  viewingId,
  sellerUpdated,
  sellerUpdatedAt,
  onToggle,
}: ViewingSellerStatusProps) {
  const [loading, setLoading] = useState(false);

  async function handleMarkUpdated() {
    if (sellerUpdated || loading) return;
    setLoading(true);
    try {
      onToggle(viewingId, true);
    } finally {
      setLoading(false);
    }
  }

  if (sellerUpdated) {
    const timestamp = formatTimestamp(sellerUpdatedAt);

    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-status-green/10 px-2.5 py-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-status-green/20">
          <Check className="h-3 w-3 text-status-green" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-status-green">Seller updated</span>
          {timestamp && (
            <span className="text-[10px] text-gray-2">{timestamp}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleMarkUpdated}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-onyx-line bg-onyx-raised px-2.5 py-1.5 text-xs font-medium text-gray-2 transition-colors hover:border-aqua/50 hover:text-aqua disabled:opacity-50"
    >
      <UserCheck className="h-3.5 w-3.5" />
      {loading ? 'Updating...' : 'Mark seller updated'}
    </button>
  );
}
