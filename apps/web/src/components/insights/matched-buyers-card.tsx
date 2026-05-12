'use client';

// Mock data — will be replaced with real matched buyers later
const mockBuyers = [
  { name: 'Tan Wei Ling', fit: 92, why: 'D03 · $2.5–3M · 3mo' },
  { name: 'Priya Sharma', fit: 78, why: 'D03 · $2–3M · flex' },
  { name: 'Aaron Lim', fit: 65, why: 'D02–04 · $2.4M cap' },
];

interface Props {
  count: number;
}

export function MatchedBuyersCard({ count }: Props) {
  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base text-white">
          Matched buyers
        </h3>
        <span className="text-xs text-aqua font-semibold">
          {count} strong fits
        </span>
      </div>

      <div className="mt-4">
        {mockBuyers.map((b, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 py-3.5 ${
              i < mockBuyers.length - 1 ? 'border-b border-onyx-line' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white">{b.name}</div>
              <div className="text-[11px] text-gray-2 mt-0.5">{b.why}</div>
            </div>
            <div className="text-right">
              <div
                className={`font-display font-bold text-lg ${
                  b.fit > 80 ? 'text-aqua' : 'text-white'
                }`}
              >
                {b.fit}
              </div>
              <div className="text-[10px] text-gray-2 tracking-label">FIT</div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary w-full mt-4 text-xs">
        Send WhatsApp to {mockBuyers.length}
      </button>
    </div>
  );
}
