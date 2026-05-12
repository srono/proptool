'use client';

import type { NurturePreferences } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TweaksPanelProps {
  preferences: NurturePreferences;
  onPreferenceChange: (key: keyof NurturePreferences, value: any) => void;
}

// ─── Toggle Option Config ────────────────────────────────────────────────────

interface ToggleOption<T extends string | boolean> {
  label: string;
  value: T;
}

interface ToggleRowProps<T extends string | boolean> {
  label: string;
  options: [ToggleOption<T>, ToggleOption<T>];
  activeValue: T;
  onChange: (value: T) => void;
}

// ─── ToggleRow Sub-Component ─────────────────────────────────────────────────

function ToggleRow<T extends string | boolean>({
  label,
  options,
  activeValue,
  onChange,
}: ToggleRowProps<T>) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-2">{label}</span>
      <div className="flex items-center gap-1">
        {options.map((option) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              aria-label={`${label}: ${option.label}`}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-[14px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
                isActive
                  ? 'bg-brand text-white'
                  : 'bg-onyx-raised text-gray-2 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Settings Gear Icon ──────────────────────────────────────────────────────

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * TweaksPanel is a floating card in the bottom-right corner that allows
 * the agent to adjust display preferences: row density, grouping mode,
 * and last activity visibility.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8
 */
export function TweaksPanel({ preferences, onPreferenceChange }: TweaksPanelProps) {
  const isCollapsed = preferences.tweaksPanelCollapsed;

  function handleToggleCollapse() {
    onPreferenceChange('tweaksPanelCollapsed', !isCollapsed);
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 transition-all duration-200 ease-in-out"
      role="region"
      aria-label="Display preferences"
    >
      {isCollapsed ? (
        /* Collapsed state: settings icon button only */
        <button
          type="button"
          onClick={handleToggleCollapse}
          aria-label="Expand display preferences"
          aria-expanded={false}
          className="flex items-center justify-center w-10 h-10 rounded-[16px] bg-onyx-card border border-onyx-line text-gray-2 hover:text-white transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
        >
          <SettingsIcon />
        </button>
      ) : (
        /* Expanded state: full panel with controls */
        <div className="w-[240px] rounded-[16px] bg-onyx-card border border-onyx-line p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-white font-display">
              Tweaks
            </span>
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label="Collapse display preferences"
              aria-expanded={true}
              className="flex items-center justify-center w-6 h-6 rounded text-gray-2 hover:text-white transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
            >
              <SettingsIcon />
            </button>
          </div>

          {/* Toggle Controls */}
          <div className="flex flex-col gap-3">
            <ToggleRow
              label="Row Density"
              options={[
                { label: 'Comfortable', value: 'comfortable' as const },
                { label: 'Compact', value: 'compact' as const },
              ]}
              activeValue={preferences.density}
              onChange={(value) => onPreferenceChange('density', value)}
            />

            <ToggleRow
              label="Group By"
              options={[
                { label: 'Urgency', value: 'urgency' as const },
                { label: 'Playbook', value: 'playbook' as const },
              ]}
              activeValue={preferences.groupBy}
              onChange={(value) => onPreferenceChange('groupBy', value)}
            />

            <ToggleRow
              label="Show Last Activity"
              options={[
                { label: 'On', value: true },
                { label: 'Off', value: false },
              ]}
              activeValue={preferences.showLastActivity}
              onChange={(value) => onPreferenceChange('showLastActivity', value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
