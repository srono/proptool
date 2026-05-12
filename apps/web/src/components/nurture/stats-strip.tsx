'use client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UrgencyFilter = 'overdue' | 'today' | 'upcoming';

export interface StatsStripProps {
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  activeFilter: UrgencyFilter | null;
  onFilterChange: (filter: UrgencyFilter | null) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(count: number): string {
  return count > 999 ? '999+' : String(count);
}

// ─── Tile Config ─────────────────────────────────────────────────────────────

interface TileConfig {
  key: UrgencyFilter;
  label: string;
  color: string;
  borderColor: string;
}

const TILES: TileConfig[] = [
  { key: 'overdue', label: 'Overdue', color: '#EF4444', borderColor: '#EF4444' },
  { key: 'today', label: 'Due Today', color: '#F59E0B', borderColor: '#F59E0B' },
  { key: 'upcoming', label: 'Upcoming', color: '#6B7280', borderColor: '#6B7280' },
];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * StatsStrip displays three clickable stat tiles showing task counts
 * grouped by urgency: Overdue (red), Due Today (amber), Upcoming (gray).
 *
 * Clicking a tile activates the corresponding filter.
 * Clicking an already-active tile deactivates it (passes null).
 *
 * Validates: Requirements 2.1, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10
 */
export function StatsStrip({
  overdueCount,
  todayCount,
  upcomingCount,
  activeFilter,
  onFilterChange,
}: StatsStripProps) {
  const counts: Record<UrgencyFilter, number> = {
    overdue: overdueCount,
    today: todayCount,
    upcoming: upcomingCount,
  };

  function handleTileClick(filter: UrgencyFilter) {
    if (activeFilter === filter) {
      onFilterChange(null);
    } else {
      onFilterChange(filter);
    }
  }

  return (
    <div className="flex gap-4" role="group" aria-label="Task urgency stats">
      {TILES.map((tile) => {
        const isActive = activeFilter === tile.key;
        const count = counts[tile.key];

        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => handleTileClick(tile.key)}
            aria-pressed={isActive}
            aria-label={`${tile.label}: ${formatCount(count)} tasks${isActive ? ' (active filter)' : ''}`}
            className="flex-1 rounded-[16px] bg-onyx-card px-4 py-3 text-left transition-all duration-150 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
            style={{
              border: isActive
                ? `2px solid ${tile.borderColor}`
                : '2px solid #2A2A2A',
            }}
          >
            <p
              className="text-xs font-medium mb-1"
              style={{ color: tile.color }}
            >
              {tile.label}
            </p>
            <p
              className="text-2xl font-bold font-display"
              style={{ color: tile.color }}
            >
              {formatCount(count)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
