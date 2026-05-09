'use client';

import type { AreaInsights } from '@/lib/insights/generate';

interface Props {
  insights: AreaInsights | null;
  listingAddress: string;
}

export function ViewingPrepCard({ insights, listingAddress }: Props) {
  if (!insights) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">📋 Viewing Prep</h3>
        <p className="text-xs text-gray-500 mt-1">
          Generate Area Insight on the listing to see viewing prep notes here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">📋 Viewing Prep — {listingAddress}</h3>

      {/* Talking points */}
      {insights.agent_talking_points.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1.5">Key talking points:</p>
          <ol className="space-y-1.5">
            {insights.agent_talking_points.map((point, i) => (
              <li key={i} className="text-xs text-gray-600 flex gap-2">
                <span className="text-brand-600 font-semibold shrink-0">{i + 1}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Transaction context */}
      {insights.nearby_transactions.length > 0 && (
        <div className="rounded-lg bg-gray-50 p-2.5">
          <p className="text-xs font-medium text-gray-700 mb-1">Recent nearby sales:</p>
          <div className="space-y-0.5">
            {insights.nearby_transactions.slice(0, 3).map((tx, i) => (
              <p key={i} className="text-xs text-gray-600">
                {tx.project} — ${tx.psf.toLocaleString()} psf ({tx.contract_date})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Objections to prepare for */}
      {insights.watchouts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1.5">Likely objections:</p>
          <ul className="space-y-1">
            {insights.watchouts.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 flex gap-2">
                <span className="shrink-0">💭</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-gray-400 italic">
        Based on URA data · {new Date(insights.last_refreshed_at).toLocaleDateString('en-SG')}
      </p>
    </div>
  );
}
