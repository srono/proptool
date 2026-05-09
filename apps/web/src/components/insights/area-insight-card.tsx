'use client';

import { useState } from 'react';
import type { AreaInsights } from '@/lib/insights/generate';

interface Props {
  listingId: string;
  insights: AreaInsights | null;
}

export function AreaInsightCard({ listingId, insights: initialInsights }: Props) {
  const [insights, setInsights] = useState<AreaInsights | null>(initialInsights);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  async function handleGenerate() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      });

      if (res.ok) {
        const { insights: newInsights } = await res.json();
        setInsights(newInsights);
      } else {
        alert('Failed to generate insights. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!insights) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">🧠 Area Insight</h3>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Generate Insight'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Auto-generate area context, transaction data, and agent talking points from this listing&apos;s location.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-900">🧠 Area Insight</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
            disabled={isLoading}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
          >
            {isLoading ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
          <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Area Summary */}
          <div>
            <p className="text-sm text-gray-700">{insights.area_summary}</p>
          </div>

          {/* Transaction Summary */}
          {insights.transaction_summary && (
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-800 mb-1">📊 Market Data</p>
              <p className="text-xs text-blue-700">{insights.transaction_summary}</p>
            </div>
          )}

          {/* Talking Points */}
          {insights.agent_talking_points.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">💬 Talking Points</p>
              <ul className="space-y-1">
                {insights.agent_talking_points.map((point, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-brand-500 shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Watchouts */}
          {insights.watchouts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">⚠️ Watchouts</p>
              <ul className="space-y-1">
                {insights.watchouts.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Transactions */}
          {insights.nearby_transactions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1.5">🏠 Recent Transactions</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="text-left py-1 pr-2">Project</th>
                      <th className="text-right py-1 px-2">PSF</th>
                      <th className="text-right py-1 px-2">Price</th>
                      <th className="text-right py-1 pl-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.nearby_transactions.slice(0, 5).map((tx, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 pr-2 text-gray-700 truncate max-w-[120px]">{tx.project}</td>
                        <td className="py-1.5 px-2 text-right text-gray-900 font-medium">${tx.psf.toLocaleString()}</td>
                        <td className="py-1.5 px-2 text-right text-gray-600">${(tx.price / 1000000).toFixed(2)}M</td>
                        <td className="py-1.5 pl-2 text-right text-gray-500">{tx.contract_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confidence note */}
          <p className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-100">
            {insights.confidence_note} · Last updated: {new Date(insights.last_refreshed_at).toLocaleDateString('en-SG')}
          </p>
        </div>
      )}
    </div>
  );
}
