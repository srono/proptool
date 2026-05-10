'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { PIPELINE_STAGES } from '@agentos/shared';
import type { PipelineStage, Urgency, DealType, LeadSource } from '@agentos/shared';

// --- Types ---

export type SortableColumn =
  | 'contact_name'
  | 'deal_type'
  | 'urgency'
  | 'stage'
  | 'source'
  | 'intent_score'
  | 'last_activity'
  | 'created_at';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: SortableColumn;
  direction: SortDirection;
}

export interface PipelineFilters {
  search: string;
  stages: PipelineStage[];
  urgency: Urgency | null;
  dealType: DealType | null;
  source: LeadSource | null;
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

export interface UsePipelineFilterReturn {
  filters: PipelineFilters;
  setSearch: (value: string) => void;
  setStages: (stages: PipelineStage[]) => void;
  setUrgency: (urgency: Urgency | null) => void;
  setDealType: (dealType: DealType | null) => void;
  setSource: (source: LeadSource | null) => void;
  clearAllFilters: () => void;
  sort: SortState;
  toggleSort: (column: SortableColumn) => void;
  resetSort: () => void;
  filteredLeads: LeadWithRelations[];
  sortedLeads: LeadWithRelations[];
  totalCount: number;
}

// --- Constants ---

const DEFAULT_SORT: SortState = { column: 'last_activity', direction: 'desc' };

const URGENCY_RANK: Record<string, number> = {
  hot: 3,
  warm: 2,
  cold: 1,
};

const STAGE_ORDER: Record<string, number> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.order])
);

// --- Comparators ---

/**
 * Returns a numeric value for sorting a given column.
 * For string columns, returns the lowercase string for comparison.
 * For custom-ranked columns (urgency, stage), returns the rank number.
 */
function getColumnValue(
  lead: LeadWithRelations,
  column: SortableColumn
): string | number | null {
  switch (column) {
    case 'contact_name':
      return lead.contact?.full_name?.toLowerCase() ?? null;
    case 'deal_type':
      return lead.deal_type?.toLowerCase() ?? null;
    case 'urgency':
      return URGENCY_RANK[lead.urgency] ?? null;
    case 'stage':
      return STAGE_ORDER[lead.status] ?? null;
    case 'source':
      return lead.source?.toLowerCase() ?? null;
    case 'intent_score':
      return lead.intent_score;
    case 'last_activity':
      return lead.last_activity_at ?? null;
    case 'created_at':
      return lead.created_at ?? null;
    default:
      return null;
  }
}

function compareValues(
  a: string | number | null,
  b: string | number | null,
  direction: SortDirection
): number {
  // Null values sort to end regardless of direction
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  let result: number;
  if (typeof a === 'number' && typeof b === 'number') {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b));
  }

  return direction === 'asc' ? result : -result;
}

// --- Filtering logic (exported for testing) ---

export function filterLeads(
  leads: LeadWithRelations[],
  filters: PipelineFilters,
  debouncedSearch: string
): LeadWithRelations[] {
  return leads.filter((lead) => {
    // Text search filter (only applied when debounced search has 2+ chars)
    if (debouncedSearch.length >= 2) {
      const searchLower = debouncedSearch.toLowerCase();
      const nameMatch = lead.contact?.full_name?.toLowerCase().includes(searchLower) ?? false;
      const phoneMatch = lead.contact?.phone?.toLowerCase().includes(searchLower) ?? false;
      if (!nameMatch && !phoneMatch) return false;
    }

    // Stage filter (multi-select)
    if (filters.stages.length > 0) {
      if (!filters.stages.includes(lead.status)) return false;
    }

    // Urgency filter
    if (filters.urgency !== null) {
      if (lead.urgency !== filters.urgency) return false;
    }

    // Deal type filter
    if (filters.dealType !== null) {
      if (lead.deal_type !== filters.dealType) return false;
    }

    // Source filter
    if (filters.source !== null) {
      if (lead.source !== filters.source) return false;
    }

    return true;
  });
}

// --- Sorting logic (exported for testing) ---

export function sortLeads(
  leads: LeadWithRelations[],
  sort: SortState
): LeadWithRelations[] {
  return [...leads].sort((a, b) => {
    const aVal = getColumnValue(a, sort.column);
    const bVal = getColumnValue(b, sort.column);

    const primary = compareValues(aVal, bVal, sort.direction);
    if (primary !== 0) return primary;

    // Tie-break by created_at descending
    const aCreated = a.created_at ?? null;
    const bCreated = b.created_at ?? null;
    return compareValues(aCreated, bCreated, 'desc');
  });
}

// --- Hook ---

export function usePipelineFilter(leads: LeadWithRelations[]): UsePipelineFilterReturn {
  // Filter state
  const [filters, setFilters] = useState<PipelineFilters>({
    search: '',
    stages: [],
    urgency: null,
    dealType: null,
    source: null,
  });

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sort state
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  // Debounce the search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters.search]);

  // Filter setters
  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const setStages = useCallback((stages: PipelineStage[]) => {
    setFilters((prev) => ({ ...prev, stages }));
  }, []);

  const setUrgency = useCallback((urgency: Urgency | null) => {
    setFilters((prev) => ({ ...prev, urgency }));
  }, []);

  const setDealType = useCallback((dealType: DealType | null) => {
    setFilters((prev) => ({ ...prev, dealType }));
  }, []);

  const setSource = useCallback((source: LeadSource | null) => {
    setFilters((prev) => ({ ...prev, source }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      stages: [],
      urgency: null,
      dealType: null,
      source: null,
    });
    setDebouncedSearch('');
  }, []);

  // Sort toggle logic
  const toggleSort = useCallback((column: SortableColumn) => {
    setSort((prev) => {
      if (prev.column === column) {
        // Same column: toggle direction
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      // Different column: ascending on new column
      return { column, direction: 'asc' };
    });
  }, []);

  // Reset sort to default (used when toggling from list to board)
  const resetSort = useCallback(() => {
    setSort(DEFAULT_SORT);
  }, []);

  // Derived: filtered leads
  const filteredLeads = useMemo(
    () => filterLeads(leads, filters, debouncedSearch),
    [leads, filters, debouncedSearch]
  );

  // Derived: sorted leads (filtered + sorted)
  const sortedLeads = useMemo(
    () => sortLeads(filteredLeads, sort),
    [filteredLeads, sort]
  );

  return {
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
    totalCount: leads.length,
  };
}
