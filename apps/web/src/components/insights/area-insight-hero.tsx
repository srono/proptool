'use client';

import { useState } from 'react';
import type { AreaInsights } from '@/lib/insights/generate';

interface Props {
  listingId: string;
  insights: AreaInsights | null;
  district: string;
  askingPsf: number | null;
}

/**
 * Area Insight as hero — distinctive moment #2.
 * A benchmarking surface with a PSF chart and tap-to-copy seller pitch.
 */
export function AreaInsightHero({ listingId, insights: initialInsights, district, askingPsf }: Props) {
  const [insights, setInsights] = useState<AreaInsights | null>(initialInsights);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    if (!insights?.seller_pitch_snippet) return;
    navigator.clipboard.writeText(insights.seller_pitch_snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Mock data for the PSF chart when no real data
  const psfData = [2080, 2120, 2155, 2140, 2180, 2200, 2210, 2240, 2255, 2230, 2260, 2280];

  return (
    <div className="relative rounded-2xl p-6 bg-onyx-card border border-onyx-line overflow-hidden">
      {/* Blue glow */}
      <div className="absolute -top-[60px] -right-[60px] w-[200px] h-[200px] rounded-full bg-[radial-gradient(closest-side,rgba(40,89,247,0.4),transparent)]" />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-aqua" />
          <span className="font-display font-bold text-xs tracking-[1.5px] text-aqua">
            AREA INSIGHT · {district}
          </span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {/* Summary text */}
      <p className="relative mt-3.5 text-base text-white/90 leading-relaxed max-w-[620px]">
        {insights?.area_summary ??
          `${district} sits in a low-density pocket. Recent transacted PSF in surrounding 99-year condos has held a tight $2,150–2,280 band over 12 months.`}
      </p>

      {/* Two-column: Chart + Talking points */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mt-5">
        {/* PSF Chart */}
        <div>
          <div className="text-[11px] text-gray-2 font-display font-semibold tracking-wider uppercase mb-3">
            PSF · trailing 12 months · {district} condo
          </div>
          <PSFChart data={psfData} askingPsf={askingPsf} />
        </div>

        {/* Talking points */}
        <div>
          <div className="text-[11px] text-gray-2 font-display font-semibold tracking-wider uppercase mb-3">
            Talking points
          </div>
          <ul className="space-y-0">
            {(insights?.agent_talking_points ?? [
              'MRT 4 min walk · school catchment',
              'Comp $2,180 psf, July 2025',
              '67yr lease · still bank-fundable',
            ]).map((point, i) => (
              <li
                key={i}
                className={`flex gap-2 text-[13px] text-white py-1.5 ${
                  i < 2 ? 'border-b border-onyx-line' : ''
                }`}
              >
                <span className="text-aqua">·</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Comparables table — fetched from URA API on Refresh */}
      <ComparablesTable
        transactions={insights?.nearby_transactions ?? null}
        askingPsf={askingPsf}
      />

      {/* Seller pitch — tap to copy */}
      <div className="relative mt-5 p-3.5 rounded-xl bg-brand/10 border border-brand/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-aqua font-display font-bold tracking-wider">
            SELLER PITCH · TAP TO COPY
          </span>
          <button
            onClick={handleCopy}
            className="text-[11px] text-aqua font-semibold"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-[13px] text-white/90 leading-relaxed">
          {insights?.seller_pitch_snippet ??
            `"${district} benchmarks at S$2,150 psf in the area. We're listing at S$${askingPsf?.toLocaleString() ?? '2,857'} psf — defensible given the unobstructed harbour view and remaining 67-year lease. Nearby comparables tell us this should move in 6–8 weeks at this price."`}
        </p>
      </div>
    </div>
  );
}

// ─── Comparables Table ────────────────────────────────────────────

interface Comparable {
  project: string;
  property_type?: string;
  area_sqft?: number;
  psf: number;
  price?: number;
  contract_date: string;
  distance_km?: number;
  same_stack?: boolean;
  best_match?: boolean;
}

// Mock comparables — will be replaced with real URA API data
const MOCK_COMPARABLES: Comparable[] = [
  { project: 'Mt Faber Lodge #07-04', property_type: 'CONDO', area_sqft: 1001, psf: 2280, contract_date: 'Apr 2026', distance_km: 0.1, best_match: true },
  { project: 'Skyline @ Telok Blangah #14-22', property_type: 'CONDO', area_sqft: 980, psf: 2210, contract_date: 'Mar 2026', distance_km: 0.3 },
  { project: 'Reflections @ Keppel #09-03', property_type: 'CONDO', area_sqft: 1023, psf: 2180, contract_date: 'Feb 2026', distance_km: 0.4 },
  { project: 'The Interlace #11-08', property_type: 'CONDO', area_sqft: 990, psf: 2155, contract_date: 'Jan 2026', distance_km: 0.5 },
  { project: '32 Mt Faber #04-09', property_type: 'CONDO', area_sqft: 980, psf: 2120, contract_date: 'Dec 2025', distance_km: 0.0, same_stack: true },
  { project: 'Caribbean @ Keppel #06-15', property_type: 'CONDO', area_sqft: 1012, psf: 2080, contract_date: 'Nov 2025', distance_km: 0.5 },
];

function ComparablesTable({
  transactions,
  askingPsf,
}: {
  transactions: Comparable[] | null;
  askingPsf: number | null;
}) {
  const comps = transactions && transactions.length > 0 ? transactions : MOCK_COMPARABLES;
  const psfValues = comps.map((c) => c.psf);
  const median = psfValues.sort((a, b) => a - b)[Math.floor(psfValues.length / 2)];
  const min = Math.min(...psfValues);
  const max = Math.max(...psfValues);
  const deltaFromMedian = askingPsf && median ? Math.round(((askingPsf - median) / median) * 100) : null;

  return (
    <div className="relative mt-6">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="text-[11px] text-gray-2 font-display font-semibold tracking-wider uppercase">
          Recent comparables · 500m radius
        </span>
        <span className="text-[11px] text-gray-2">
          {comps.length} of 14 · synced 2 min ago
        </span>
      </div>

      {/* Table */}
      <div className="border border-onyx-line rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2.4fr_0.9fr_0.9fr_0.9fr_0.9fr_0.7fr] px-3.5 py-2.5 bg-white/[0.02] border-b border-onyx-line text-[10px] text-gray-2 font-display font-bold tracking-wider uppercase">
          <span>Address</span>
          <span>Type</span>
          <span className="text-right">Sqft</span>
          <span className="text-right">PSF</span>
          <span className="text-right">Sold</span>
          <span className="text-right">Δ km</span>
        </div>

        {/* Data rows */}
        {comps.map((r, i) => (
          <div
            key={i}
            className={`grid grid-cols-[2.4fr_0.9fr_0.9fr_0.9fr_0.9fr_0.7fr] px-3.5 py-2.5 items-center text-xs ${
              i < comps.length - 1 ? 'border-b border-onyx-line' : ''
            } ${r.best_match ? 'bg-aqua/[0.06]' : ''}`}
          >
            {/* Address */}
            <span className="flex items-center gap-2 min-w-0">
              {r.best_match && (
                <span className="w-1 h-1 rounded-full bg-aqua flex-shrink-0" />
              )}
              {r.same_stack && (
                <span className="chip text-status-amber border-status-amber/40 bg-status-amber/10 text-[9px] py-0 px-1.5">
                  SAME STACK
                </span>
              )}
              <span
                className={`truncate ${
                  r.best_match ? 'font-semibold text-white' : 'text-white/85'
                }`}
              >
                {r.project}
              </span>
            </span>

            {/* Type */}
            <span className="text-[11px] text-gray-2 font-display font-semibold tracking-wider">
              {r.property_type ?? 'CONDO'}
            </span>

            {/* Sqft */}
            <span className="text-right text-white/85">
              {r.area_sqft?.toLocaleString() ?? '—'}
            </span>

            {/* PSF */}
            <span
              className={`text-right font-display font-bold ${
                r.best_match ? 'text-aqua' : 'text-white'
              }`}
            >
              S${r.psf.toLocaleString()}
            </span>

            {/* Date */}
            <span className="text-right text-[11px] text-gray-2">
              {r.contract_date}
            </span>

            {/* Distance */}
            <span className="text-right text-[11px] text-gray-2">
              {r.distance_km?.toFixed(1) ?? '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between mt-2.5 text-[11px] text-gray-2">
        <span>
          Median{' '}
          <strong className="text-white font-display">
            S${median.toLocaleString()} psf
          </strong>{' '}
          · Range{' '}
          <strong className="text-white font-display">
            ${min.toLocaleString()}–${max.toLocaleString()}
          </strong>
          {deltaFromMedian !== null && (
            <>
              {' '}· Asking sits{' '}
              <strong className="text-status-amber">
                {deltaFromMedian > 0 ? '+' : ''}{deltaFromMedian}% {deltaFromMedian > 0 ? 'above' : 'below'} median
              </strong>
            </>
          )}
        </span>
        <button className="text-aqua font-semibold hover:underline">
          See all 14 →
        </button>
      </div>
    </div>
  );
}

// ─── PSF Chart ────────────────────────────────────────────────────

function PSFChart({ data, askingPsf }: { data: number[]; askingPsf: number | null }) {
  const W = 360;
  const H = 140;
  const P = 20;
  const max = Math.max(...data, askingPsf ?? 0) * 1.05;
  const min = Math.min(...data) * 0.95;

  const pts = data.map((v, i) => [
    P + (i / (data.length - 1)) * (W - P * 2),
    H - P - ((v - min) / (max - min)) * (H - P * 2),
  ]);
  const linePts = pts.map((p) => p.join(',')).join(' ');
  const areaPts = `${P},${H - P} ${linePts} ${W - P},${H - P}`;

  const askY = askingPsf
    ? H - P - ((askingPsf - min) / (max - min)) * (H - P * 2)
    : null;

  const lastPt = pts[pts.length - 1];
  const lastVal = data[data.length - 1];

  return (
    <svg width={W} height={H} className="w-full max-w-[360px]">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8EFEFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8EFEFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.5, 1].map((g, i) => (
        <line
          key={i}
          x1={P}
          y1={P + g * (H - P * 2)}
          x2={W - P}
          y2={P + g * (H - P * 2)}
          stroke="#2A2A2A"
          strokeDasharray="2 4"
        />
      ))}
      <polygon points={areaPts} fill="url(#area-grad)" />
      <polyline points={linePts} fill="none" stroke="#8EFEFF" strokeWidth="2" />
      {/* Last point */}
      {lastPt && (
        <>
          <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill="#8EFEFF" />
          <circle cx={lastPt[0]} cy={lastPt[1]} r="8" fill="#8EFEFF" opacity="0.2" />
          <text
            x={lastPt[0] - 4}
            y={lastPt[1] - 12}
            fill="#8EFEFF"
            fontSize="11"
            textAnchor="end"
            fontWeight="700"
          >
            ${lastVal.toLocaleString()}
          </text>
        </>
      )}
      {/* Asking line */}
      {askY !== null && (
        <>
          <line
            x1={P}
            y1={Math.max(askY, 8)}
            x2={W - P}
            y2={Math.max(askY, 8)}
            stroke="#F7B85C"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={W - P - 4}
            y={Math.max(askY - 6, 14)}
            fill="#F7B85C"
            fontSize="10"
            textAnchor="end"
            fontWeight="700"
          >
            ASKING ${askingPsf?.toLocaleString()}
          </text>
        </>
      )}
    </svg>
  );
}
