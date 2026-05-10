import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  usePipelineViewMode,
  PIPELINE_VIEW_MODE_STORAGE_KEY,
} from './use-pipeline-view-mode';

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
  };
}

describe('usePipelineViewMode', () => {
  let mockLocalStorage: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mockLocalStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "board" when no stored value exists', () => {
    const { result } = renderHook(() => usePipelineViewMode());
    expect(result.current.viewMode).toBe('board');
  });

  it('reads stored "list" preference from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('list');
    const { result } = renderHook(() => usePipelineViewMode());
    expect(result.current.viewMode).toBe('list');
  });

  it('reads stored "board" preference from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('board');
    const { result } = renderHook(() => usePipelineViewMode());
    expect(result.current.viewMode).toBe('board');
  });

  it('overwrites invalid value with "board" on read', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-value');
    const { result } = renderHook(() => usePipelineViewMode());
    expect(result.current.viewMode).toBe('board');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      PIPELINE_VIEW_MODE_STORAGE_KEY,
      'board'
    );
  });

  it('overwrites empty string with "board" on read', () => {
    mockLocalStorage.getItem.mockReturnValue('');
    const { result } = renderHook(() => usePipelineViewMode());
    expect(result.current.viewMode).toBe('board');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      PIPELINE_VIEW_MODE_STORAGE_KEY,
      'board'
    );
  });

  it('persists view mode to localStorage when setViewMode is called', () => {
    const { result } = renderHook(() => usePipelineViewMode());

    act(() => {
      result.current.setViewMode('list');
    });

    expect(result.current.viewMode).toBe('list');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      PIPELINE_VIEW_MODE_STORAGE_KEY,
      'list'
    );
  });

  it('handles SecurityError by falling back to in-memory state', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    const { result } = renderHook(() => usePipelineViewMode());
    expect(result.current.viewMode).toBe('board');

    // setViewMode should still work in-memory
    act(() => {
      result.current.setViewMode('list');
    });

    expect(result.current.viewMode).toBe('list');
  });

  it('does not persist when localStorage throws on setViewMode', () => {
    // First read succeeds
    mockLocalStorage.getItem.mockReturnValue('board');

    const { result } = renderHook(() => usePipelineViewMode());

    // Now make setItem throw
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceeded', 'QuotaExceededError');
    });

    // Should still update in-memory state without throwing
    act(() => {
      result.current.setViewMode('list');
    });

    expect(result.current.viewMode).toBe('list');
  });
});
