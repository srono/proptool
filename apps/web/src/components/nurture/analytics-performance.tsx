'use client';

import type { PlaybookPerformance } from '@/lib/nurture/analytics';
import type { DateRangePreset } from './analytics-funnel';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlaybookPerformanceRow extends PlaybookPerformance {
  playbook_name: string;
}

export interface AnalyticsPerformanceProps {
  data: PlaybookPerformanceRow[];
  dateRange: DateRangePreset;
  onDateRangeChange: (preset: DateRangePreset) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const COLUMNS = [
  { key: 'playbook', label: 'Playbook' },
  { key: 'completed', label: 'Completed' },
  { key: 'response_rate', label: 'Response Rate' },
  { key: 'deals_won', label: 'Deals Won' },
  { key: 'commission', label: 'Commission' },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Performance table component showing per-playbook metrics:
 * tasks completed, response rate, deals won, and net commission.
 *
 * Includes a date range selector with preset buttons (7d, 30d, 90d).
 * Shows an empty state when no data is available.
 *
 * Validates: Requirements 11.2, 11.6, 11.7
 */
export function AnalyticsPerformance({
  data,
  dateRange,
  onDateRangeChange,
}: AnalyticsPerformanceProps) {
  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl overflow-hidden">
      {/* Header with date range selector */}
      <div className="px-5 py-4 border-b border-onyx-line flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-white">
          Playbook Performance
        </h3>
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
      </div>

      {/* Content */}
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <PerformanceTable data={data} />
      )}
    </div>
  );
}

// ─── Date Range Selector ─────────────────────────────────────────────────────

function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Date range">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onChange(preset.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            value === preset.value
              ? 'bg-brand text-white'
              : 'text-gray-2 hover:text-white hover:bg-onyx-line/50'
          }`}
          aria-pressed={value === preset.value}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

// ─── Performance Table ───────────────────────────────────────────────────────

function PerformanceTable({ data }: { data: PlaybookPerformanceRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left" role="grid" aria-label="Playbook performance metrics">
        <thead>
          <tr className="border-b border-onyx-line bg-onyx/30">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-label text-gray-2 ${
                  col.key !== 'playbook' ? 'text-right' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.playbook_id}
              className="border-b border-onyx-line/50 last:border-b-0 hover:bg-onyx-line/20 transition-colors"
            >
              <td className="px-4 py-3 text-sm text-white font-medium truncate max-w-[200px]">
                {row.playbook_name}
              </td>
              <td className="px-4 py-3 text-sm text-white text-right tabular-nums">
                {row.tasks_completed.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-right tabular-nums">
                <span className={getResponseRateColor(row.response_rate)}>
                  {formatPercent(row.response_rate)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-white text-right tabular-nums">
                {row.deals_won.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-white text-right tabular-nums">
                {formatCurrency(row.net_commission)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-12 px-5">
      <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
        <svg
          className="w-5 h-5 text-aqua"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
          />
        </svg>
      </div>
      <p className="text-white font-medium text-sm">No performance data</p>
      <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
        No playbook metrics are available for the selected date range. Complete nurture tasks to see performance data here.
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getResponseRateColor(rate: number): string {
  if (rate >= 0.3) return 'text-status-green';
  if (rate >= 0.15) return 'text-status-amber';
  return 'text-white';
}
