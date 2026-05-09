'use client';

import { useState, useCallback, useRef } from 'react';
import { useBreakpoint } from './use-breakpoint';

export type ViewMode = 'list' | 'card';

export const VIEW_MODE_STORAGE_KEY = 'listings-view-mode';

export interface UseViewModeReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

function isValidViewMode(value: unknown): value is ViewMode {
  return value === 'list' || value === 'card';
}

/**
 * Reads the view mode from localStorage.
 * Returns the stored value if valid, otherwise overwrites with 'list' and returns 'list'.
 * Handles SecurityError (private browsing) by returning null to signal fallback to in-memory state.
 */
function readStoredViewMode(): { mode: ViewMode; storageAvailable: boolean } {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (isValidViewMode(stored)) {
      return { mode: stored, storageAvailable: true };
    }
    // Overwrite corrupted/invalid value with default
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, 'list');
    return { mode: 'list', storageAvailable: true };
  } catch {
    // SecurityError or other localStorage access error (e.g. private browsing)
    return { mode: 'list', storageAvailable: false };
  }
}

/**
 * Manages view mode preference with localStorage persistence.
 *
 * Behavior:
 * - Reads from localStorage key "listings-view-mode", defaults to 'list'
 * - Overwrites corrupted/invalid values with 'list' on read
 * - Falls back to in-memory state when localStorage is unavailable (SecurityError)
 * - Overrides stored preference to 'card' when viewport < 768px (mobile breakpoint)
 */
export function useViewMode(): UseViewModeReturn {
  const breakpoint = useBreakpoint();
  const storageAvailableRef = useRef(true);

  const [storedMode, setStoredMode] = useState<ViewMode>(() => {
    // Lazy initialization: read from localStorage on first render
    if (typeof window === 'undefined') return 'list';
    const { mode, storageAvailable } = readStoredViewMode();
    storageAvailableRef.current = storageAvailable;
    return mode;
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setStoredMode(mode);
    if (storageAvailableRef.current) {
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      } catch {
        // If storage becomes unavailable, continue with in-memory state
        storageAvailableRef.current = false;
      }
    }
  }, []);

  // Override to 'card' on mobile regardless of stored preference
  const viewMode: ViewMode = breakpoint === 'mobile' ? 'card' : storedMode;

  return { viewMode, setViewMode };
}
