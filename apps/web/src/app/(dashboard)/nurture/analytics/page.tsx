'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnalyticsFunnel, type DateRangePreset } from '@/components/nurture/analytics-funnel';
import { AnalyticsPerformance, type PlaybookPerformanceRow } from '@/components/nurture/analytics-performance';
import type { FunnelMetrics } from '@/lib/nurture/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FunnelResponse {
  metrics: FunnelMetrics;
  empty: boolean;
  message?: string;
}

interface PerformanceResponse {
  performance: PlaybookPerformanceRow[];
  empty: boolean;
  message?: string;
}

// ─── Page Component ──────────────────────────────────────────────────────────

/**
 * Nurture Analytics page.
 *
 * Fetches data from the analytics API routes and renders both
 * AnalyticsFunnel and AnalyticsPerformance components with shared
 * date range state.
 *
 * Validates: Requirements 11.1, 11.5, 11.7
 */
export default function NurtureAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [funnelData, setFunnelData] = useState<FunnelMetrics | null>(null);
  const [performanceData, setPerformanceData] = useState<PlaybookPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (preset: DateRangePreset) => {
    setLoading(true);
    setError(null);

    try {
      const [funnelRes, performanceRes] = await Promise.all([
        fetch(`/api/nurture/analytics/funnel?preset=${preset}`),
        fetch(`/api/nurture/analytics/performance?preset=${preset}`),
      ]);

      if (!funnelRes.ok || !performanceRes.ok) {
        const errBody = !funnelRes.ok
          ? await funnelRes.json()
          : await performanceRes.json();
        setError(errBody.error ?? 'Failed to load analytics');
        return;
      }

      const funnelJson: FunnelResponse = await funnelRes.json();
      const performanceJson: PerformanceResponse = await performanceRes.json();

      setFunnelData(funnelJson.metrics ?? null);
      setPerformanceData(performanceJson.performance ?? []);
    } catch {
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(dateRange);
  }, [dateRange, fetchAnalytics]);

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRange(preset);
  };

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Page header */}
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
          Nurture Analytics
        </h1>
        <p className="text-[13px] text-gray-2 mt-1">
          Track your nurture funnel and playbook performance.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="space-y-5">
          <div className="bg-onyx-card border border-onyx-line rounded-2xl h-64 animate-pulse" />
          <div className="bg-onyx-card border border-onyx-line rounded-2xl h-64 animate-pulse" />
        </div>
      )}

      {/* Analytics content */}
      {!loading && !error && (
        <div className="space-y-5">
          <AnalyticsFunnel
            data={funnelData}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
          <AnalyticsPerformance
            data={performanceData}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      )}
    </div>
  );
}
