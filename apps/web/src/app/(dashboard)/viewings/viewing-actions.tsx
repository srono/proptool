'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Props {
  viewingId: string;
  leadId: string;
}

export function ViewingActions({ viewingId, leadId }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleCancel() {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('viewings')
        .update({ status: 'cancelled' })
        .eq('id', viewingId);

      if (error) {
        console.error('Failed to cancel viewing:', error);
        alert('Failed to cancel viewing. Please try again.');
        return;
      }

      router.refresh();
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-status-amber">Cancel this viewing?</span>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isDeleting}
          className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
        >
          {isDeleting ? 'Cancelling...' : 'Yes'}
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          className="text-xs font-medium text-gray-2 hover:text-white"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/viewings/${viewingId}/edit`}
        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
      >
        Edit
      </Link>
      <span className="text-onyx-line">·</span>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="text-xs text-red-400 hover:text-red-300 font-medium"
      >
        Cancel
      </button>
      <span className="text-onyx-line">·</span>
      <Link
        href={`/leads/${leadId}`}
        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
      >
        View Lead →
      </Link>
    </div>
  );
}
