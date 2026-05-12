'use client';

import type { FilterState } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PillTab = FilterState['activePill'];
export type ConsentFilter = FilterState['consentFilter'];

export interface PlaybookOption {
  id: string;
  name: string;
}

export interface FilterBarProps {
  activePill: PillTab;
  onPillChange: (pill: PillTab) => void;
  playbookFilter: string;
  onPlaybookFilterChange: (id: string) => void;
  consentFilter: ConsentFilter;
  onConsentFilterChange: (filter: ConsentFilter) => void;
  myTasksOnly: boolean;
  onMyTasksToggle: (enabled: boolean) => void;
  taskCount: number;
  playbooks: PlaybookOption[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PILL_TABS: { value: PillTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'snoozed', label: 'Snoozed' },
];

const PILL_ACTIVE_COLORS: Record<PillTab, string> = {
  all: 'bg-brand text-white',
  overdue: 'bg-status-red text-white',
  today: 'bg-status-amber text-onyx',
  upcoming: 'bg-gray-1 text-white',
  snoozed: 'bg-gray-1 text-white',
};

const CONSENT_OPTIONS: { value: ConsentFilter; label: string }[] = [
  { value: '', label: 'All Consent' },
  { value: 'green', label: 'Valid' },
  { value: 'yellow', label: 'Partial' },
  { value: 'red', label: 'No Consent' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function FilterBar({
  activePill,
  onPillChange,
  playbookFilter,
  onPlaybookFilterChange,
  consentFilter,
  onConsentFilterChange,
  myTasksOnly,
  onMyTasksToggle,
  taskCount,
  playbooks,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap" role="toolbar" aria-label="Task filters">
      {/* Pill Tabs */}
      <div className="flex items-center gap-1.5" role="tablist" aria-label="Urgency filter">
        {PILL_TABS.map((tab) => {
          const isActive = activePill === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Filter by ${tab.label}`}
              onClick={() => onPillChange(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[14px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
                isActive
                  ? PILL_ACTIVE_COLORS[tab.value]
                  : 'bg-transparent text-gray-2 border border-onyx-line hover:text-white hover:border-gray-1'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-onyx-line" aria-hidden="true" />

      {/* Playbook Dropdown */}
      <select
        value={playbookFilter}
        onChange={(e) => onPlaybookFilterChange(e.target.value)}
        aria-label="Filter by playbook"
        className="bg-onyx-card text-sm text-gray-3 border border-onyx-line rounded-[14px] px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 transition-colors duration-150 hover:border-gray-1 appearance-none cursor-pointer"
      >
        <option value="">All Playbooks</option>
        {playbooks.map((pb) => (
          <option key={pb.id} value={pb.name}>
            {pb.name}
          </option>
        ))}
      </select>

      {/* Consent Dropdown */}
      <select
        value={consentFilter}
        onChange={(e) => onConsentFilterChange(e.target.value as ConsentFilter)}
        aria-label="Filter by consent status"
        className="bg-onyx-card text-sm text-gray-3 border border-onyx-line rounded-[14px] px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 transition-colors duration-150 hover:border-gray-1 appearance-none cursor-pointer"
      >
        {CONSENT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Separator */}
      <div className="w-px h-5 bg-onyx-line" aria-hidden="true" />

      {/* My Tasks Toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <span className="text-xs text-gray-2">My Tasks</span>
        <button
          type="button"
          role="switch"
          aria-checked={myTasksOnly}
          aria-label="Show only my tasks"
          onClick={() => onMyTasksToggle(!myTasksOnly)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
            myTasksOnly ? 'bg-brand' : 'bg-onyx-raised border border-onyx-line'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150 ${
              myTasksOnly ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </label>

      {/* Task Count */}
      <span className="text-xs text-gray-2 ml-auto" aria-live="polite" aria-atomic="true">
        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
      </span>
    </div>
  );
}
