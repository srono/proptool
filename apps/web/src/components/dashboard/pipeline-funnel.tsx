'use client';

import Link from 'next/link';

const stages = [
  { label: 'New', count: 7, height: 100 },
  { label: 'Contacted', count: 12, height: 88 },
  { label: 'Qualified', count: 8, height: 70 },
  { label: 'Viewing', count: 5, height: 52 },
  { label: 'Negotiating', count: 3, height: 38 },
  { label: 'OTP', count: 2, height: 24 },
  { label: 'Closed', count: 1, height: 14 },
];

export function PipelineFunnel() {
  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base text-white">
          Pipeline · this week
        </h3>
        <Link href="/pipeline" className="btn-ghost text-xs py-1.5 px-3">
          Open board
        </Link>
      </div>

      <div className="flex gap-1 mt-5 items-end h-[140px]">
        {stages.map((s, i) => (
          <div key={s.label} className="flex-1 text-center flex flex-col items-center justify-end h-full">
            <span className="text-[11px] text-gray-2 mb-1.5">{s.count}</span>
            <div
              className="w-full rounded"
              style={{
                height: `${s.height}%`,
                background:
                  i === 3
                    ? '#8EFEFF'
                    : 'linear-gradient(180deg, #2859F7, #0945E6)',
                opacity: 0.9,
              }}
            />
            <span className="text-[10px] text-gray-2 mt-2 font-display font-semibold tracking-label uppercase">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
