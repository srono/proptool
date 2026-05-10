'use client';

import { useState, useCallback, useRef } from 'react';

export type PipelineViewMode = 'board' | 'list';

export const PIPELINE_VIEW_MODE_STORAGE_KEY = 'pipeline-view-mode';

export interface UsePipelineViewModeReturn {
  viewMode: PipelineViewMode;
  setViewMode: (mode: PipelineViewMode) => void;
}

function isValidViewMode(value: unknown): value is PipelineViewMode {
  return value === 'board' || value === 'list';
}

/**
 * Reads the view mode from localStorage.
 * Returns the stored value if valid, otherwise overwrites with 'board' and returns 'board'.
 * Handles SecurityError (private browsing) by returning null to signal fallback to in-memory state.
 */
function readStoredViewMode(): { mode: PipelineViewMode; storageAvailable: boolean } {
  try {
    const stored = localStorage.getItem(PIPELINE_VIEW_MODE_STORAGE_KEY);
    if (isValidViewMode(stored)) {
      return { mode: stored, storageAvailable: true };
    }
    // Overwrite corrupted/invalid value with default
    localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'board');
    return { mode: 'board', storageAvailable: true };
  } catch {
    // SecurityError or other localStorage access error (e.g. private browsing)
    return { mode: 'board', storageAvailable: false };
  }
}

/**
 * Manages pipeline view mode preference with localStorage persistence.
 *
 * Behavior:
 * - Reads from localStorage key "pipeline-view-mode", defaults to 'board'
 * - Overwrites corrupted/invalid values with 'board' on read
 * - Falls back to in-memory state when localStorage is unavailable (SecurityError)
 * - Does NOT override on mobile — the shell component handles breakpoint logic
 */
export function usePipelineViewMode(): UsePipelineViewModeReturn {
  const storageAvailableRef = useRef(true);

  const [viewMode, setViewModeState] = useState<PipelineViewMode>(() => {
    // Lazy initialization: read from localStorage on first render
    if (typeof window === 'undefined') return 'board';
    const { mode, storageAvailable } = readStoredViewMode();
    storageAvailableRef.current = storageAvailable;
    return mode;
  });

  const setViewMode = useCallback((mode: PipelineViewMode) => {
    setViewModeState(mode);
    if (storageAvailableRef.current) {
      try {
        localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, mode);
      } catch {
        // If storage becomes unavailable, continue with in-memory state
        storageAvailableRef.current = false;
      }
    }
  }, []);

  return { viewMode, setViewMode };
}
