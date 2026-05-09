'use client';

import { useState } from 'react';
import type { AreaInsights } from '@/lib/insights/generate';

interface Props {
  insights: AreaInsights | null;
}

export function SellerPitchCard({ insights }: Props) {
  const [copied, setCopied] = useState(false);

  if (!insights?.seller_pitch_snippet) return null;

  function handleCopy() {
    navigator.clipboard.writeText(insights!.seller_pitch_snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">✍️ Seller Pitch</h3>
        <button
          onClick={handleCopy}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">
        {insights.seller_pitch_snippet}
      </p>
      <p className="text-[10px] text-gray-400 mt-2 italic">
        Use in WhatsApp messages or during seller meetings
      </p>
    </div>
  );
}
