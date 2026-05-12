'use client';

import { useState, useCallback } from 'react';
import {
  NurturePreferences,
  DEFAULT_PREFERENCES,
  nurturePreferencesSchema,
} from '@/lib/nurture/types';

const STORAGE_KEY = 'nurture_preferences';

function readPreferences(): NurturePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    const result = nurturePreferencesSchema.safeParse(parsed);
    return result.success ? result.data : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(prefs: NurturePreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function useNurturePreferences() {
  const [preferences, setPreferences] = useState<NurturePreferences>(readPreferences);

  const setPreference = useCallback(
    <K extends keyof NurturePreferences>(key: K, value: NurturePreferences[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        writePreferences(next);
        return next;
      });
    },
    []
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    writePreferences(DEFAULT_PREFERENCES);
  }, []);

  return { preferences, setPreference, resetPreferences };
}
