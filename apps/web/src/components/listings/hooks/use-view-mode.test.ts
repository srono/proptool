import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useViewMode, VIEW_MODE_STORAGE_KEY } from './use-view-mode';

// Mock useBreakpoint
vi.mock('./use-breakpoint', () => ({
  useBreakpoint: vi.fn(() => 'desktop'),
}));

import { useBreakpoint } from './use-breakpoint';

const mockUseBreakpoint = vi.mocked(useBreakpoint);

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _store: store,
    _setStore(newStore: Record<string, string>) {
      store = newStore;
      // Re-bind getItem/setItem to use new store reference
      this.getItem.mockImplementation((key: string) => store[key] ?? null);
      this.setItem.mockImplementation((key: string, value: string) => {
        store[key] = value;
      });
      this.removeItem.mockImplementation((key: string) => {
        delete store[key];
      });
    },
  };
}

describe('useViewMode', () => {
  let mockLocalStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockLocalStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    mockUseBreakpoint.mockReturnValue('desktop');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "list" when no stored value exists', () => {
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');
  });

  it('reads stored "card" preference from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('card');
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('card');
  });

  it('reads stored "list" preference from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('list');
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');
  });

  it('overwrites corrupted value with "list" on read', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-value');
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(VIEW_MODE_STORAGE_KEY, 'list');
  });

  it('overwrites empty string with "list" on read', () => {
    mockLocalStorage.getItem.mockReturnValue('');
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(VIEW_MODE_STORAGE_KEY, 'list');
  });

  it('persists view mode to localStorage when setViewMode is called', () => {
    const { result } = renderHook(() => useViewMode());

    act(() => {
      result.current.setViewMode('card');
    });

    expect(result.current.viewMode).toBe('card');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(VIEW_MODE_STORAGE_KEY, 'card');
  });

  it('handles SecurityError by falling back to in-memory state', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');

    // setViewMode should still work in-memory
    act(() => {
      result.current.setViewMode('card');
    });

    expect(result.current.viewMode).toBe('card');
  });

  it('overrides stored preference to "card" when viewport is mobile', () => {
    mockLocalStorage.getItem.mockReturnValue('list');
    mockUseBreakpoint.mockReturnValue('mobile');

    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('card');
  });

  it('uses stored preference on tablet breakpoint', () => {
    mockLocalStorage.getItem.mockReturnValue('list');
    mockUseBreakpoint.mockReturnValue('tablet');

    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('list');
  });

  it('uses stored preference on desktop breakpoint', () => {
    mockLocalStorage.getItem.mockReturnValue('card');
    mockUseBreakpoint.mockReturnValue('desktop');

    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe('card');
  });

  it('still persists setViewMode calls even when mobile overrides display', () => {
    mockUseBreakpoint.mockReturnValue('mobile');

    const { result } = renderHook(() => useViewMode());

    act(() => {
      result.current.setViewMode('list');
    });

    // Display is still 'card' because mobile overrides
    expect(result.current.viewMode).toBe('card');
    // But the stored value should be 'list'
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(VIEW_MODE_STORAGE_KEY, 'list');
  });
});
