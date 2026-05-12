'use client';

import { useState, useCallback } from 'react';
import type { FilterState } from '@/lib/nurture/types';

export type PillTab = FilterState['activePill'];
export type ConsentFilter = FilterState['consentFilter'];

const DEFAULT_FILTERS: FilterState = {
  activePill: 'all',
  playbookFilter: '',
  consentFilter: '',
  myTasksOnly: false,
};

export function useNurtureFilters() {
  const [activePill, setActivePillState] = useState<PillTab>(DEFAULT_FILTERS.activePill);
  const [playbookFilter, setPlaybookFilterState] = useState<string>(DEFAULT_FILTERS.playbookFilter);
  const [consentFilter, setConsentFilterState] = useState<ConsentFilter>(DEFAULT_FILTERS.consentFilter);
  const [myTasksOnly, setMyTasksOnlyState] = useState<boolean>(DEFAULT_FILTERS.myTasksOnly);

  const setActivePill = useCallback((pill: PillTab) => {
    setActivePillState(pill);
  }, []);

  const setPlaybookFilter = useCallback((id: string) => {
    setPlaybookFilterState(id);
  }, []);

  const setConsentFilter = useCallback((filter: ConsentFilter) => {
    setConsentFilterState(filter);
  }, []);

  const setMyTasksOnly = useCallback((enabled: boolean) => {
    setMyTasksOnlyState(enabled);
  }, []);

  const clearFilters = useCallback(() => {
    setActivePillState(DEFAULT_FILTERS.activePill);
    setPlaybookFilterState(DEFAULT_FILTERS.playbookFilter);
    setConsentFilterState(DEFAULT_FILTERS.consentFilter);
    setMyTasksOnlyState(DEFAULT_FILTERS.myTasksOnly);
  }, []);

  return {
    activePill,
    playbookFilter,
    consentFilter,
    myTasksOnly,
    setActivePill,
    setPlaybookFilter,
    setConsentFilter,
    setMyTasksOnly,
    clearFilters,
  };
}
