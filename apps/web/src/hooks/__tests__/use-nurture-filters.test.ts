import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useNurtureFilters } from '../use-nurture-filters';

describe('useNurtureFilters', () => {
  it('returns default filter values on initial render', () => {
    const { result } = renderHook(() => useNurtureFilters());

    expect(result.current.activePill).toBe('all');
    expect(result.current.playbookFilter).toBe('');
    expect(result.current.consentFilter).toBe('');
    expect(result.current.myTasksOnly).toBe(false);
  });

  it('updates activePill when setActivePill is called', () => {
    const { result } = renderHook(() => useNurtureFilters());

    act(() => {
      result.current.setActivePill('overdue');
    });

    expect(result.current.activePill).toBe('overdue');
  });

  it('updates playbookFilter when setPlaybookFilter is called', () => {
    const { result } = renderHook(() => useNurtureFilters());

    act(() => {
      result.current.setPlaybookFilter('playbook-123');
    });

    expect(result.current.playbookFilter).toBe('playbook-123');
  });

  it('updates consentFilter when setConsentFilter is called', () => {
    const { result } = renderHook(() => useNurtureFilters());

    act(() => {
      result.current.setConsentFilter('green');
    });

    expect(result.current.consentFilter).toBe('green');
  });

  it('updates myTasksOnly when setMyTasksOnly is called', () => {
    const { result } = renderHook(() => useNurtureFilters());

    act(() => {
      result.current.setMyTasksOnly(true);
    });

    expect(result.current.myTasksOnly).toBe(true);
  });

  it('resets all filters to defaults when clearFilters is called', () => {
    const { result } = renderHook(() => useNurtureFilters());

    // Set all filters to non-default values
    act(() => {
      result.current.setActivePill('snoozed');
      result.current.setPlaybookFilter('playbook-456');
      result.current.setConsentFilter('red');
      result.current.setMyTasksOnly(true);
    });

    // Verify they changed
    expect(result.current.activePill).toBe('snoozed');
    expect(result.current.playbookFilter).toBe('playbook-456');
    expect(result.current.consentFilter).toBe('red');
    expect(result.current.myTasksOnly).toBe(true);

    // Clear all filters
    act(() => {
      result.current.clearFilters();
    });

    // Verify all reset to defaults
    expect(result.current.activePill).toBe('all');
    expect(result.current.playbookFilter).toBe('');
    expect(result.current.consentFilter).toBe('');
    expect(result.current.myTasksOnly).toBe(false);
  });

  it('allows setting activePill to each valid value', () => {
    const { result } = renderHook(() => useNurtureFilters());
    const pills = ['all', 'overdue', 'today', 'upcoming', 'snoozed'] as const;

    for (const pill of pills) {
      act(() => {
        result.current.setActivePill(pill);
      });
      expect(result.current.activePill).toBe(pill);
    }
  });

  it('allows setting consentFilter to each valid value', () => {
    const { result } = renderHook(() => useNurtureFilters());
    const filters = ['', 'green', 'yellow', 'red'] as const;

    for (const filter of filters) {
      act(() => {
        result.current.setConsentFilter(filter);
      });
      expect(result.current.consentFilter).toBe(filter);
    }
  });
});
