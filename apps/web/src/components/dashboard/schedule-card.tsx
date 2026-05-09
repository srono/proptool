'use client';

const events = [
  { time: '10:30', label: 'Call · Tan Wei Ling', tag: 'lead' as const },
  { time: '14:00', label: 'Viewing · 32 Mt Faber', tag: 'viewing' as const },
  { time: '16:30', label: 'OTP signing · D. Chua', tag: 'deal' as const },
];

const tagStyles = {
  lead: 'text-aqua border-brand/50 bg-brand/[0.12]',
  viewing: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  deal: 'text-status-green border-status-green/40 bg-status-green/10',
};

export function ScheduleCard() {
  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base text-white">Schedule</h3>
        <span className="text-[11px] text-gray-2">{events.length} events</span>
      </div>

      <div className="mt-4">
        {events.map((e, i) => (
          <div
            key={i}
            className={`flex items-center gap-3.5 py-3.5 ${
              i < events.length - 1 ? 'border-b border-onyx-line' : ''
            }`}
          >
            <span className="font-display font-bold text-lg w-14 text-white">
              {e.time}
            </span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-white">{e.label}</div>
              <div className="mt-1">
                <span
                  className={`chip ${tagStyles[e.tag]}`}
                >
                  {e.tag}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
