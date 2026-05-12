'use client';

interface KPIStripProps {
  activeLeads: number;
  viewingsBooked: number;
  overdueTasks: number;
  newLeadsThisWeek: number;
}

export function KPIStrip({
  activeLeads,
  viewingsBooked,
  overdueTasks,
  newLeadsThisWeek,
}: KPIStripProps) {
  const kpis = [
    {
      label: 'Active leads',
      value: String(activeLeads),
      detail: `+${newLeadsThisWeek} wk`,
      spark: [4, 5, 4, 6, 7, 6, 8],
      positive: true,
    },
    {
      label: 'Viewings booked',
      value: String(viewingsBooked),
      detail: 'this week',
      spark: [2, 3, 2, 4, 3, 5, 5],
      positive: true,
    },
    {
      label: 'Closing pipeline',
      value: 'S$48k',
      detail: 'commission est.',
      spark: [30, 32, 38, 40, 42, 46, 48],
      positive: true,
    },
    {
      label: 'Overdue tasks',
      value: String(overdueTasks),
      detail: 'Action needed',
      spark: [1, 2, 2, 1, 2, 3, 3],
      warn: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="bg-onyx-card border border-onyx-line rounded-2xl p-[18px]"
        >
          <div className="text-xs text-gray-2 font-display font-semibold tracking-label">
            {k.label}
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span
              className={`font-display font-bold text-[32px] tracking-tight ${
                k.warn ? 'text-status-red' : 'text-white'
              }`}
            >
              {k.value}
            </span>
            <Sparkline data={k.spark} warn={k.warn} />
          </div>
          <div className="text-[11px] text-gray-2 mt-1">{k.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ data, warn }: { data: number[]; warn?: boolean }) {
  const W = 80;
  const H = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H * 0.85 - 2}`
    )
    .join(' ');

  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={warn ? 'var(--sparkline-negative)' : 'var(--sparkline-positive)'}
        strokeWidth="1.6"
      />
    </svg>
  );
}
