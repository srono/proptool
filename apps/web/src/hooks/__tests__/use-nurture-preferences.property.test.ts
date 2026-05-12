import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import {
  nurturePreferencesSchema,
  DEFAULT_PREFERENCES,
  type NurturePreferences,
} from '@/lib/nurture/types';
import { useNurturePreferences } from '../use-nurture-preferences';

// --- Generators ---

const densityArb: fc.Arbitrary<'comfortable' | 'compact'> = fc.constantFrom(
  'comfortable',
  'compact'
);

const groupByArb: fc.Arbitrary<'urgency' | 'playbook'> = fc.constantFrom(
  'urgency',
  'playbook'
);

const validPreferencesArb: fc.Arbitrary<NurturePreferences> = fc.record({
  density: densityArb,
  groupBy: groupByArb,
  showLastActivity: fc.boolean(),
  tweaksPanelCollapsed: fc.boolean(),
});

/** Generate arbitrary strings that may be corrupted/invalid JSON */
const corruptedJsonArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(), // random strings
  fc.constant('{invalid json}'),
  fc.constant('null'),
  fc.constant('undefined'),
  fc.constant(''),
  fc.constant('[]'),
  fc.constant('{"density":"invalid"}'),
  fc.constant('{"density":123,"groupBy":true}'),
  fc.constant('{"density":"comfortable"}'), // missing fields
  fc.constant('{"groupBy":"urgency","showLastActivity":"yes"}') // wrong types
);

// --- localStorage mock ---

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    },
    writable: true,
  });
});

// --- Property Tests ---

/**
 * Feature: nurture-page-redesign, Property 7: Preference serialization round-trip
 *
 * **Validates: Requirements 7.6, 7.9**
 *
 * For any valid NurturePreferences object, serializing it to JSON and writing to localStorage,
 * then reading and deserializing, SHALL produce an object deeply equal to the original.
 * For any invalid or corrupted JSON string, the deserializer SHALL return the default
 * preferences object.
 */
describe('Feature: nurture-page-redesign, Property 7: Preference serialization round-trip', () => {
  it('valid preferences survive a serialize → localStorage → deserialize round-trip', () => {
    fc.assert(
      fc.property(validPreferencesArb, (prefs) => {
        // Write valid preferences to localStorage
        const serialized = JSON.stringify(prefs);
        store['nurture_preferences'] = serialized;

        // Read back via the hook
        const { result } = renderHook(() => useNurturePreferences());

        // The deserialized preferences should deeply equal the original
        expect(result.current.preferences).toEqual(prefs);
      }),
      { numRuns: 100 }
    );
  });

  it('setPreference persists and round-trips correctly for any valid preference value', () => {
    fc.assert(
      fc.property(validPreferencesArb, (prefs) => {
        // Start with empty localStorage
        store = {};

        const { result } = renderHook(() => useNurturePreferences());

        // Set each preference individually
        act(() => {
          result.current.setPreference('density', prefs.density);
        });
        act(() => {
          result.current.setPreference('groupBy', prefs.groupBy);
        });
        act(() => {
          result.current.setPreference('showLastActivity', prefs.showLastActivity);
        });
        act(() => {
          result.current.setPreference('tweaksPanelCollapsed', prefs.tweaksPanelCollapsed);
        });

        // Verify the hook state matches
        expect(result.current.preferences).toEqual(prefs);

        // Verify localStorage was written correctly
        const stored = store['nurture_preferences'];
        expect(stored).toBeDefined();
        const parsed = JSON.parse(stored);
        const validated = nurturePreferencesSchema.safeParse(parsed);
        expect(validated.success).toBe(true);
        if (validated.success) {
          expect(validated.data).toEqual(prefs);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('corrupted or invalid JSON in localStorage returns DEFAULT_PREFERENCES', () => {
    fc.assert(
      fc.property(corruptedJsonArb, (corruptedValue) => {
        // Write corrupted data to localStorage
        store['nurture_preferences'] = corruptedValue;

        // Attempt to parse with the schema
        let parsedResult: NurturePreferences;
        try {
          const parsed = JSON.parse(corruptedValue);
          const result = nurturePreferencesSchema.safeParse(parsed);
          parsedResult = result.success ? result.data : DEFAULT_PREFERENCES;
        } catch {
          parsedResult = DEFAULT_PREFERENCES;
        }

        // Read via the hook
        const { result } = renderHook(() => useNurturePreferences());

        // If the corrupted value happens to be valid JSON that passes schema validation,
        // the hook should return that valid value. Otherwise, it should return defaults.
        expect(result.current.preferences).toEqual(parsedResult);
      }),
      { numRuns: 100 }
    );
  });

  it('non-parseable strings always produce DEFAULT_PREFERENCES', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false; // exclude valid JSON
          } catch {
            return true; // keep only non-parseable strings
          }
        }),
        (invalidJson) => {
          store['nurture_preferences'] = invalidJson;

          const { result } = renderHook(() => useNurturePreferences());

          expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
        }
      ),
      { numRuns: 100 }
    );
  });
});
