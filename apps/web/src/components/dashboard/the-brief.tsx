'use client';

import Link from 'next/link';

/**
 * The Brief — distinctive moment #1.
 * A daily blue-gradient hero that names the highest-leverage call,
 * talking points, and risks. Currently mocked; will be data-driven later.
 */
export function TheBrief() {
  return (
    <div className="relative rounded-3xl p-7 overflow-hidden bg-gradient-to-br from-brand-deep via-brand to-[#0C5AFF]">
      {/* Aqua glow */}
      <div className="absolute -right-10 -top-10 w-[220px] h-[220px] rounded-full bg-[radial-gradient(closest-side,rgba(142,254,255,0.5),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(142,254,255,0.18),transparent_60%)]" />

      {/* Header label */}
      <div className="relative flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-aqua shadow-[0_0_12px_theme(colors.aqua.DEFAULT)]" />
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-aqua">
          THE BRIEF · 10:30
        </span>
      </div>

      {/* Three-column grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1fr] gap-8 mt-5">
        {/* Main message */}
        <div>
          <h2 className="font-display font-bold text-[28px] leading-[1.15] tracking-tight text-white">
            Tan Wei Ling is your highest-leverage call today.
          </h2>
          <p className="mt-3 text-[13px] text-white/85 leading-relaxed">
            PR · budget firm at $2.8M · viewing tomorrow at Mt Faber. She replied
            4h ago. The unit&apos;s last comp closed at $2,180 psf — your asking
            sits 3% under.
          </p>
          <div className="flex gap-2 mt-5">
            <Link href="/messages" className="btn-primary text-xs">
              Open thread
            </Link>
            <button className="btn-ghost text-xs border-white/30">
              Skip · next lead
            </button>
          </div>
        </div>

        {/* What to say */}
        <div className="border-l border-white/[0.18] pl-7 hidden lg:block">
          <div className="text-[11px] font-semibold tracking-wider text-white/60">
            WHAT TO SAY
          </div>
          <ul className="mt-3 space-y-2 text-[13px] text-white leading-relaxed">
            <li>· Lead with the comp at $2,180 psf</li>
            <li>· Mention 4-min MRT walk (her brief)</li>
            <li>· Confirm Saturday 4pm viewing</li>
          </ul>
        </div>

        {/* Risk / Watchout */}
        <div className="border-l border-white/[0.18] pl-7 hidden lg:block">
          <div className="text-[11px] font-semibold tracking-wider text-white/60">
            RISK / WATCHOUT
          </div>
          <ul className="mt-3 space-y-2 text-[13px] text-white leading-relaxed">
            <li>· Asked about tenure — 99yr, 67yrs left</li>
            <li>· Spouse is the decision maker · loop in</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
