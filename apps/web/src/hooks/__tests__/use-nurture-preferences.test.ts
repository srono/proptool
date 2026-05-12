import { renderHook, act } from '@testing-library/react';
import { useNurturePreferences } from '../use-nurture-preferences';
import { DEFAULT_PREFERENCES } from '@/lib/nurture/types';

const STORAGE_KEY = 'nurture_preferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useNurturePreferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns DEFAULT_PREFERENCES when localStorage is empty', () => {
    const { result } = renderHook(() => useNurturePreferences());
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('reads valid preferences from localStorage', () => {
    const stored = {
      density: 'compact',
      groupBy: 'playbook',
      showLastActivity: false,
      tweaksPanelCollapsed: true,
    };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useNurturePreferences());
    expect(result.current.preferences).toEqual(stored);
  });

  it('falls back to DEFAULT_PREFERENCES on invalid JSON', () => {
    localStorageMock.setItem(STORAGE_KEY, 'not-valid-json');

    const { result } = renderHook(() => useNurturePreferences());
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('falls back to DEFAULT_PREFERENCES when schema validation fails', () => {
    const invalid = {
      density: 'invalid_value',
      groupBy: 'urgency',
      showLastActivity: true,
      tweaksPanelCollapsed: false,
    };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalid));

    const { result } = renderHook(() => useNurturePreferences());
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('setPreference updates a single key and persists to localStorage', () => {
    const { result } = renderHook(() => useNurturePreferences());

    act(() => {
      result.current.setPreference('density', 'compact');
    });

    expect(result.current.preferences.density).toBe('compact');
    expect(result.current.preferences.groupBy).toBe('urgency'); // unchanged

    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored.density).toBe('compact');
  });

  it('resetPreferences restores defaults and persists', () => {
    const { result } = renderHook(() => useNurturePreferences());

    act(() => {
      result.current.setPreference('density', 'compact');
      result.current.setPreference('groupBy', 'playbook');
    });

    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored).toEqual(DEFAULT_PREFERENCES);
  });

  it('handles localStorage being unavailable gracefully', () => {
    const originalGetItem = localStorageMock.getItem;
    localStorageMock.getItem = () => { throw new Error('localStorage unavailable'); };

    const { result } = renderHook(() => useNurturePreferences());
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);

    localStorageMock.getItem = originalGetItem;
  });
});
