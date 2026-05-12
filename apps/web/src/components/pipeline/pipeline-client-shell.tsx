'use client';

import Link from 'next/link';
import type { PipelineStage } from '@agentos/shared';
import { usePipelineViewMode } from './hooks/use-pipeline-view-mode';
import type { PipelineViewMode } from './hooks/use-pipeline-view-mode';
import { usePipelineFilter } from './hooks/use-pipeline-filter';
import { useBreakpoint } from '@/components/listings/hooks/use-breakpoint';
import { PipelineViewToggle } from './pipeline-view-toggle';
import { PipelineFilterBar } from './pipeline-filter-bar';
import { PipelineBoard } from './pipeline-board';
import { PipelineListView } from './pipeline-list-view';

// --- Types ---

interface PipelineStageConfig {
  key: PipelineStage;
  label: string;
  order: number;
}

interface LeadWithRelations {
  id: string;
  status: PipelineStage;
  deal_type: string;
  urgency: string;
  source: string;
  intent_score: number | null;
  verification_score: number | null;
  eligibility_risk: boolean;
  last_activity_at: string | null;
  created_at: string;
  contact: {
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
  tasks: {
    id: string;
    title: string;
    due_at: string;
    completed_at: string | null;
  }[];
}

interface PipelineClientShellProps {
  leads: LeadWithRelations[];
  stages: PipelineStageConfig[];
}

export function PipelineClientShell({ leads, stages }: PipelineClientShellProps) {
  const { viewMode, setViewMode } = usePipelineViewMode();
  const breakpoint = useBreakpoint();
  const {
    filters,
    setSearch,
    setStages,
    setUrgency,
    setDealType,
    setSource,
    clearAllFilters,
    sort,
    toggleSort,
    resetSort,
    filteredLeads,
    sortedLeads,
    totalCount,
  } = usePipelineFilter(leads);

  const isMobile = breakpoint === 'mobile';

  // Force Board_View on mobile regardless of stored preference (without overwriting localStorage)
  const effectiveViewMode: PipelineViewMode = isMobile ? 'board' : viewMode;

  const showList = effectiveViewMode === 'list';
  const showBoard = effectiveViewMode === 'board';

  // Handle view toggle with sort reset when switching from list to board
  function handleViewToggle(mode: PipelineViewMode) {
    if (mode === 'board' && viewMode === 'list') {
      resetSort();
    }
    setViewMode(mode);
  }

  return (
    <div className="space-y-4">
      {/* View Toggle — hidden on mobile */}
      {!isMobile && (
        <div className="flex items-center justify-end">
          <PipelineViewToggle
            viewMode={effectiveViewMode}
            onToggle={handleViewToggle}
          />
        </div>
      )}

      {/* Filter Bar — shared across both views */}
      <PipelineFilterBar
        filters={filters}
        onSearchChange={setSearch}
        onStagesChange={setStages}
        onUrgencyChange={setUrgency}
        onDealTypeChange={setDealType}
        onSourceChange={setSource}
        onClearAll={clearAllFilters}
        filteredCount={filteredLeads.length}
        totalCount={totalCount}
      />

      {/* Content */}
      {totalCount === 0 ? (
        /* Empty state: no leads exist at all */
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-aqua" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-white font-medium text-sm">No leads yet</p>
          <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
            Create your first lead to start building your pipeline.
          </p>
          <Link
            href="/leads/new"
            className="inline-flex items-center mt-4 btn-primary text-xs"
          >
            + New lead
          </Link>
        </div>
      ) : filteredLeads.length === 0 ? (
        /* Empty state: filters produced zero results */
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-white font-medium text-sm">No leads match filters</p>
          <p className="text-gray-2 text-xs mt-1">
            Try adjusting your search or filter criteria.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-4 text-sm text-brand hover:text-brand/70 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : showList ? (
        <PipelineListView
          leads={sortedLeads}
          sort={sort}
          onSort={toggleSort}
          breakpoint={breakpoint}
        />
      ) : showBoard ? (
        <PipelineBoard leads={filteredLeads} stages={stages} />
      ) : null}
    </div>
  );
}
