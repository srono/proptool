'use client';

interface Props {
  daysOnMarket: number;
  enquiries: number;
  viewings: number;
}

export function PerformanceCard({ daysOnMarket, enquiries, viewings }: Props) {
  const metrics = [
    { label: 'Days on market', value: String(daysOnMarket) },
    { label: 'Enquiries', value: String(enquiries) },
    { label: 'Viewings booked', value: String(viewings) },
    { label: 'Offers received', value: '0' },
  ];

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-[22px]">
      <h3 className="font-display font-bold text-base text-white mb-3.5">
        Performance
      </h3>

      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`flex items-center justify-between py-2 ${
            i < metrics.length - 1 ? 'border-b border-onyx-line' : ''
          }`}
        >
          <span className="text-xs text-gray-2">{m.label}</span>
          <span className="font-display font-bold text-base text-white">
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}
