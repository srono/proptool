'use client';

import type { FunnelMetrics } from '@/lib/nurture/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DateRangePreset = '7d' | '30d' | '90d';

export interface AnalyticsFunnelProps {
  data: FunnelMetrics | null;
  dateRange: DateRangePreset;
  onDateRangeChange: (preset: DateRangePreset) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

interface FunnelStage {
  key: keyof FunnelMetrics;
  label: string;
}

const FUNNEL_STAGES: FunnelStage[] = [
  { key: 'total_contacts', label: 'Contacts' },
  { key: 'tasks_created', label: 'Tasks Created' },
  { key: 'tasks_completed', label: 'Tasks Completed' },
  { key: 'deals_from_nurtured', label: 'Deals' },
];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Funnel chart component showing the nurture pipeline:
 * contacts → tasks created → tasks completed → deals.
 *
 * Includes a date range selector with preset buttons (7d, 30d, 90d).
 * Shows an empty state when no data is available.
 *
 * Validates: Requirements 11.1, 11.6, 11.7
 */
export function AnalyticsFunnel({
  data,
  dateRange,
  onDateRangeChange,
}: AnalyticsFunnelProps) {
  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl overflow-hidden">
      {/* Header with date range selector */}
      <div className="px-5 py-4 border-b border-onyx-line flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-white">
          Nurture Funnel
        </h3>
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
      </div>

      {/* Content */}
      <div className="px-5 py-6">
        {!data || isEmptyFunnel(data) ? (
          <EmptyState />
        ) : (
          <FunnelChart data={data} />
        )}
      </div>
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

// ─── Funnel Chart ────────────────────────────────────────────────────────────

function FunnelChart({ data }: { data: FunnelMetrics }) {
  const maxValue = Math.max(
    data.total_contacts,
    data.tasks_created,
    data.tasks_completed,
    data.deals_from_nurtured,
    1
  );

  return (
    <div className="space-y-3" role="img" aria-label="Nurture funnel chart">
      {FUNNEL_STAGES.map((stage, index) => {
        const value = data[stage.key];
        const widthPercent = Math.max((value / maxValue) * 100, 8);
        const conversionRate =
          index > 0
            ? computeConversionRate(data[FUNNEL_STAGES[index - 1].key], value)
            : null;

        return (
          <div key={stage.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-2">{stage.label}</span>
              <div className="flex items-center gap-2">
                {conversionRate !== null && (
                  <span className="text-[10px] text-gray-2">
                    {conversionRate}%
                  </span>
                )}
                <span className="text-sm font-semibold text-white tabular-nums">
                  {value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-8 bg-onyx rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-500 ease-out"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: getFunnelColor(index),
                }}
                role="meter"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={maxValue}
                aria-label={`${stage.label}: ${value}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-8">
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
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      </div>
      <p className="text-white font-medium text-sm">No analytics data</p>
      <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
        No nurture tasks or deals exist for the selected date range. Activate a playbook to start tracking your funnel.
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isEmptyFunnel(data: FunnelMetrics): boolean {
  return (
    data.total_contacts === 0 &&
    data.tasks_created === 0 &&
    data.tasks_completed === 0 &&
    data.deals_from_nurtured === 0
  );
}

function computeConversionRate(from: number, to: number): string {
  if (from === 0) return '0';
  return ((to / from) * 100).toFixed(1);
}

function getFunnelColor(index: number): string {
  const colors = [
    'rgba(0, 200, 255, 0.7)',   // aqua - contacts
    'rgba(0, 200, 255, 0.55)',  // aqua lighter - tasks created
    'rgba(0, 200, 255, 0.4)',   // aqua lighter - tasks completed
    'rgba(0, 200, 255, 0.25)',  // aqua lightest - deals
  ];
  return colors[index] ?? colors[0];
}
