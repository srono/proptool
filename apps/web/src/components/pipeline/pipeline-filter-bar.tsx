'use client';

import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { PIPELINE_STAGES, LEAD_SOURCES } from '@agentos/shared';
import type { PipelineStage, Urgency, DealType, LeadSource } from '@agentos/shared';
import type { PipelineFilters } from './hooks/use-pipeline-filter';

// --- Types ---

export interface PipelineFilterBarProps {
  filters: PipelineFilters;
  onSearchChange: (value: string) => void;
  onStagesChange: (stages: PipelineStage[]) => void;
  onUrgencyChange: (urgency: Urgency | null) => void;
  onDealTypeChange: (dealType: DealType | null) => void;
  onSourceChange: (source: LeadSource | null) => void;
  onClearAll: () => void;
  filteredCount: number;
  totalCount: number;
}

// --- Constants ---

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
];

const DEAL_TYPE_OPTIONS: { value: DealType; label: string }[] = [
  { value: 'sale', label: 'Sale' },
  { value: 'resale', label: 'Resale' },
  { value: 'rental', label: 'Rental' },
  { value: 'landlord_rep', label: 'Landlord Rep' },
  { value: 'tenant_rep', label: 'Tenant Rep' },
];

// --- Helper: check if any filter is active ---

function hasActiveFilters(filters: PipelineFilters): boolean {
  return (
    filters.search.length > 0 ||
    filters.stages.length > 0 ||
    filters.urgency !== null ||
    filters.dealType !== null ||
    filters.source !== null
  );
}

// --- Sub-components ---

function StageMultiSelect({
  selected,
  onChange,
}: {
  selected: PipelineStage[];
  onChange: (stages: PipelineStage[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  function handleToggle(key: PipelineStage) {
    if (selected.includes(key)) {
      onChange(selected.filter((s) => s !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  const label = selected.length > 0 ? `Stage (${selected.length})` : 'Stage';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Filter by stage"
        className="flex items-center gap-1.5 rounded-lg border border-onyx-line bg-onyx-card px-3 py-1.5 text-sm text-gray-2 hover:text-white hover:border-white/30 transition-colors"
      >
        <span>{label}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 max-h-64 overflow-y-auto rounded-lg border border-onyx-line bg-onyx-card shadow-lg">
          {PIPELINE_STAGES.map((stage) => (
            <label
              key={stage.key}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-2 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(stage.key)}
                onChange={() => handleToggle(stage.key)}
                className="h-3.5 w-3.5 rounded border-onyx-line bg-onyx text-aqua focus:ring-aqua/50 focus:ring-offset-0"
              />
              <span className="truncate">{stage.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export function PipelineFilterBar({
  filters,
  onSearchChange,
  onStagesChange,
  onUrgencyChange,
  onDealTypeChange,
  onSourceChange,
  onClearAll,
  filteredCount,
  totalCount,
}: PipelineFilterBarProps) {
  const showClear = hasActiveFilters(filters);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Text search input */}
      <div className="w-64">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full bg-onyx-card border border-onyx-line rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Stage multi-select dropdown */}
      <StageMultiSelect selected={filters.stages} onChange={onStagesChange} />

      {/* Urgency single-select dropdown */}
      <select
        value={filters.urgency ?? ''}
        onChange={(e) =>
          onUrgencyChange(e.target.value === '' ? null : (e.target.value as Urgency))
        }
        className="bg-onyx-raised border border-onyx-line rounded-xl px-4 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
        aria-label="Filter by urgency"
      >
        <option value="">All Urgency</option>
        {URGENCY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Deal type single-select dropdown */}
      <select
        value={filters.dealType ?? ''}
        onChange={(e) =>
          onDealTypeChange(e.target.value === '' ? null : (e.target.value as DealType))
        }
        className="bg-onyx-raised border border-onyx-line rounded-xl px-4 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
        aria-label="Filter by deal type"
      >
        <option value="">All Deal Types</option>
        {DEAL_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Source single-select dropdown */}
      <select
        value={filters.source ?? ''}
        onChange={(e) =>
          onSourceChange(e.target.value === '' ? null : (e.target.value as LeadSource))
        }
        className="bg-onyx-raised border border-onyx-line rounded-xl px-4 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
        aria-label="Filter by source"
      >
        <option value="">All Sources</option>
        {LEAD_SOURCES.map((src) => (
          <option key={src.key} value={src.key}>
            {src.label}
          </option>
        ))}
      </select>

      {/* Clear all filters button */}
      {showClear && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm text-brand hover:text-brand/70 transition-colors"
        >
          Clear all filters
        </button>
      )}

      {/* Count display */}
      <span className="ml-auto text-sm text-gray-2">
        Showing {filteredCount} of {totalCount} leads
      </span>
    </div>
  );
}
