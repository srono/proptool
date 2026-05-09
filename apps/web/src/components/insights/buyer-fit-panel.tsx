'use client';

interface Props {
  fitSignals: string[];
  watchouts: string[];
}

export function BuyerFitPanel({ fitSignals, watchouts }: Props) {
  if (fitSignals.length === 0 && watchouts.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">🎯 Buyer Fit</h3>

      {fitSignals.length > 0 && (
        <div className="mb-3">
          <ul className="space-y-1.5">
            {fitSignals.map((signal, i) => (
              <li key={i} className="text-xs text-green-700 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">✓</span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {watchouts.length > 0 && (
        <div>
          <ul className="space-y-1.5">
            {watchouts.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
