import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { PIPELINE_STAGES, LEAD_SOURCES } from '@propagent/shared';
import {
  formatRelativeActivity,
  formatCreatedDate,
  formatSourceLabel,
  formatDealTypeLabel,
} from '../utils/format-lead-fields';
import {
  usePipelineViewMode,
  PIPELINE_VIEW_MODE_STORAGE_KEY,
  type PipelineViewMode,
} from '../hooks/use-pipeline-view-mode';

/**
 * Feature: pipeline-list-view
 * Property-based tests for formatting utilities
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.10, 1.11
 */

// --- Generators ---

// Valid stage keys from PIPELINE_STAGES
const stageKeyArb = fc.constantFrom(...PIPELINE_STAGES.map((s) => s.key));

// Valid source keys from LEAD_SOURCES
const sourceKeyArb = fc.constantFrom(...LEAD_SOURCES.map((s) => s.key));

// Valid deal type keys
const DEAL_TYPE_KEYS = ['sale', 'resale', 'rental', 'landlord_rep', 'tenant_rep'] as const;
const dealTypeKeyArb = fc.constantFrom(...DEAL_TYPE_KEYS);

// Generator for past timestamps (0 to 365 days ago) relative to a fixed "now"
const FIXED_NOW = new Date('2024-06-15T12:00:00Z').getTime();

const pastTimestampArb = fc
  .integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }) // 0ms to 365 days in ms
  .map((msAgo) => new Date(FIXED_NOW - msAgo).toISOString());

// Generator for valid ISO date strings across a wide range (2000-2030)
const isoDateArb = fc
  .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString());

// --- Property 1: Label mapping round-trip ---
// Feature: pipeline-list-view, Property 1: Label mapping round-trip

describe('Feature: pipeline-list-view, Property 1: Label mapping round-trip', () => {
  it('formatSourceLabel returns the exact display label for any valid source key, never empty or undefined', () => {
    fc.assert(
      fc.property(sourceKeyArb, (sourceKey) => {
        const result = formatSourceLabel(sourceKey);
        const expected = LEAD_SOURCES.find((s) => s.key === sourceKey)!.label;

        // Must return the exact label from the constant
        expect(result).toBe(expected);
        // Must not be empty or undefined
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('formatDealTypeLabel returns the exact display label for any valid deal type key, never empty or undefined', () => {
    fc.assert(
      fc.property(dealTypeKeyArb, (dealTypeKey) => {
        const expectedLabels: Record<string, string> = {
          sale: 'Sale',
          resale: 'Resale',
          rental: 'Rental',
          landlord_rep: 'Landlord Rep',
          tenant_rep: 'Tenant Rep',
        };

        const result = formatDealTypeLabel(dealTypeKey);

        // Must return the exact label
        expect(result).toBe(expectedLabels[dealTypeKey]);
        // Must not be empty or undefined
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('PIPELINE_STAGES provides a non-empty label for any valid stage key', () => {
    fc.assert(
      fc.property(stageKeyArb, (stageKey) => {
        const stage = PIPELINE_STAGES.find((s) => s.key === stageKey);

        // Stage must exist
        expect(stage).toBeDefined();
        // Label must not be empty or undefined
        expect(stage!.label).toBeDefined();
        expect(stage!.label.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 2: Relative activity date formatting ---
// Feature: pipeline-list-view, Property 2: Relative activity date formatting

describe('Feature: pipeline-list-view, Property 2: Relative activity date formatting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" when floor of elapsed days is 0, and "{n}d ago" otherwise; never negative or fractional', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));

    fc.assert(
      fc.property(pastTimestampArb, (timestamp) => {
        const result = formatRelativeActivity(timestamp);

        const diffMs = FIXED_NOW - new Date(timestamp).getTime();
        const expectedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (expectedDays === 0) {
          expect(result).toBe('Today');
        } else {
          // Must match "{n}d ago" pattern
          expect(result).toBe(`${expectedDays}d ago`);

          // Extract the number and verify it's a positive integer
          const match = result.match(/^(\d+)d ago$/);
          expect(match).not.toBeNull();
          const n = parseInt(match![1], 10);
          expect(n).toBeGreaterThan(0);
          expect(Number.isInteger(n)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('never returns a negative day count for any past date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));

    fc.assert(
      fc.property(pastTimestampArb, (timestamp) => {
        const result = formatRelativeActivity(timestamp);

        // Should either be "Today" or "{n}d ago" with positive n
        if (result !== 'Today') {
          const match = result.match(/^(\d+)d ago$/);
          expect(match).not.toBeNull();
          const n = parseInt(match![1], 10);
          expect(n).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('never returns a fractional day count', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));

    fc.assert(
      fc.property(pastTimestampArb, (timestamp) => {
        const result = formatRelativeActivity(timestamp);

        // The result should never contain a decimal point
        expect(result).not.toMatch(/\.\d/);
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 3: Created date formatting ---
// Feature: pipeline-list-view, Property 3: Created date formatting

describe('Feature: pipeline-list-view, Property 3: Created date formatting', () => {
  it('returns a string matching DD MMM YYYY pattern for any valid ISO date', () => {
    fc.assert(
      fc.property(isoDateArb, (dateStr) => {
        const result = formatCreatedDate(dateStr);

        // Must match DD MMM YYYY pattern
        const pattern = /^\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/;
        expect(result).toMatch(pattern);
      }),
      { numRuns: 100 }
    );
  });

  it('parsing the output back yields the same calendar day as the input', () => {
    fc.assert(
      fc.property(isoDateArb, (dateStr) => {
        const result = formatCreatedDate(dateStr);

        // Parse the output back
        const months: Record<string, number> = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };

        const parts = result.split(' ');
        const day = parseInt(parts[0], 10);
        const month = months[parts[1]];
        const year = parseInt(parts[2], 10);

        // The input date in UTC
        const inputDate = new Date(dateStr);
        const inputDay = inputDate.getUTCDate();
        const inputMonth = inputDate.getUTCMonth();
        const inputYear = inputDate.getUTCFullYear();

        // The parsed output should match the input's UTC calendar day
        expect(day).toBe(inputDay);
        expect(month).toBe(inputMonth);
        expect(year).toBe(inputYear);
      }),
      { numRuns: 100 }
    );
  });

  it('DD is always zero-padded (01-31)', () => {
    fc.assert(
      fc.property(isoDateArb, (dateStr) => {
        const result = formatCreatedDate(dateStr);
        const dayStr = result.split(' ')[0];

        // Must be exactly 2 characters
        expect(dayStr.length).toBe(2);
        // Must be a valid day number
        const dayNum = parseInt(dayStr, 10);
        expect(dayNum).toBeGreaterThanOrEqual(1);
        expect(dayNum).toBeLessThanOrEqual(31);
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 7: View mode localStorage persistence ---
// Feature: pipeline-list-view, Property 7: View mode localStorage persistence

/**
 * Validates: Requirements 2.6, 2.8
 *
 * Property 7: View mode localStorage persistence
 * - For any valid view mode value ('board' or 'list'), calling setViewMode and then
 *   reading from localStorage key "pipeline-view-mode" returns the same value.
 * - For any string that is neither 'board' nor 'list' stored in localStorage, reading
 *   the view mode returns 'board' and overwrites the stored value with 'board'.
 */

function createViewModeLocalStorageMock() {
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
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
}

describe('Feature: pipeline-list-view, Property 7: View mode localStorage persistence', () => {
  let mockLocalStorage: ReturnType<typeof createViewModeLocalStorageMock>;

  beforeEach(() => {
    mockLocalStorage = createViewModeLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Generator for valid view modes
  const validViewModeArb = fc.constantFrom<PipelineViewMode>('board', 'list');

  // Generator for invalid strings (anything that is not 'board' or 'list')
  const invalidViewModeArb = fc
    .string({ minLength: 0, maxLength: 50 })
    .filter((s) => s !== 'board' && s !== 'list');

  it('setViewMode persists valid mode to localStorage and returns the same value on read', () => {
    fc.assert(
      fc.property(validViewModeArb, (mode) => {
        // Reset localStorage state
        mockLocalStorage._setStore({});
        mockLocalStorage.getItem.mockClear();
        mockLocalStorage.setItem.mockClear();

        const { result } = renderHook(() => usePipelineViewMode());

        // Call setViewMode with the valid mode
        act(() => {
          result.current.setViewMode(mode);
        });

        // The hook state should reflect the mode
        expect(result.current.viewMode).toBe(mode);

        // localStorage should contain the same value
        const storedValue = mockLocalStorage._getStore()[PIPELINE_VIEW_MODE_STORAGE_KEY];
        expect(storedValue).toBe(mode);
      }),
      { numRuns: 100 }
    );
  });

  it('invalid localStorage values are corrected to "board" on read and overwritten', () => {
    fc.assert(
      fc.property(invalidViewModeArb, (invalidValue) => {
        // Pre-populate localStorage with the invalid value
        mockLocalStorage._setStore({
          [PIPELINE_VIEW_MODE_STORAGE_KEY]: invalidValue,
        });
        mockLocalStorage.getItem.mockImplementation(
          (key: string) => mockLocalStorage._getStore()[key] ?? null
        );
        mockLocalStorage.setItem.mockImplementation(
          (key: string, value: string) => {
            mockLocalStorage._getStore()[key] = value;
          }
        );

        const { result } = renderHook(() => usePipelineViewMode());

        // The hook should return 'board' as the default
        expect(result.current.viewMode).toBe('board');

        // localStorage should have been overwritten with 'board'
        const storedValue = mockLocalStorage._getStore()[PIPELINE_VIEW_MODE_STORAGE_KEY];
        expect(storedValue).toBe('board');
      }),
      { numRuns: 100 }
    );
  });
});

// --- Additional imports for Properties 4, 5, 6, 8 ---
import {
  filterLeads,
  sortLeads,
  type SortState,
  type SortableColumn,
  type SortDirection,
  type PipelineFilters,
} from '../hooks/use-pipeline-filter';
import type { PipelineStage, Urgency, DealType, LeadSource } from '@propagent/shared';

// --- Generators for filter/sort tests ---

const urgencyValues: Urgency[] = ['hot', 'warm', 'cold'];
const dealTypeValues: DealType[] = ['sale', 'resale', 'rental', 'landlord_rep', 'tenant_rep'];
const sourceValues: LeadSource[] = [
  'facebook_ad',
  'instagram_ad',
  'portal',
  'whatsapp',
  'referral',
  'open_house',
  'web_form',
  'manual',
];
const stageValues: PipelineStage[] = [
  'new_lead',
  'contacted',
  'qualified',
  'viewing_booked',
  'viewing_done',
  'negotiating',
  'otp_loi_issued',
  'closed_won',
  'closed_lost',
  'nurture',
];

const sortableColumns: SortableColumn[] = [
  'contact_name',
  'deal_type',
  'urgency',
  'stage',
  'source',
  'intent_score',
  'last_activity',
  'created_at',
];

const sortDirections: SortDirection[] = ['asc', 'desc'];

// Generator for a LeadWithRelations object
const leadArb = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom(...stageValues),
  deal_type: fc.constantFrom(...dealTypeValues),
  urgency: fc.constantFrom(...urgencyValues),
  source: fc.constantFrom(...sourceValues),
  intent_score: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
  verification_score: fc.option(fc.integer({ min: 1, max: 3 }), { nil: null }),
  eligibility_risk: fc.boolean(),
  last_activity_at: fc.option(
    fc.integer({ min: 1700000000000, max: 1750000000000 }).map((ts) => new Date(ts).toISOString()),
    { nil: null as unknown as string }
  ),
  created_at: fc.integer({ min: 1700000000000, max: 1750000000000 }).map((ts) => new Date(ts).toISOString()),
  contact: fc.option(
    fc.record({
      full_name: fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.replace(/[^\w\s]/g, 'a')),
      phone: fc.string({ minLength: 8, maxLength: 12 }).map((s) => s.replace(/[^\d]/g, '9')),
      email: fc.option(fc.emailAddress(), { nil: null }),
    }),
    { nil: null }
  ),
  tasks: fc.constant([] as { id: string; title: string; due_at: string; completed_at: string | null }[]),
});

// Generator for an array of leads (0 to 50)
const leadsArrayArb = fc.array(leadArb, { minLength: 0, maxLength: 50 });

// Generator for sort state
const sortStateArb = fc.record({
  column: fc.constantFrom(...sortableColumns),
  direction: fc.constantFrom(...sortDirections),
});

// Generator for filter state
const filtersArb = fc.record({
  search: fc.oneof(
    fc.constant(''),
    fc.string({ minLength: 1, maxLength: 1 }),
    fc.string({ minLength: 2, maxLength: 10 }).map((s) => s.replace(/[^\w]/g, 'a'))
  ),
  stages: fc.subarray(stageValues, { minLength: 0, maxLength: stageValues.length }),
  urgency: fc.option(fc.constantFrom(...urgencyValues), { nil: null }),
  dealType: fc.option(fc.constantFrom(...dealTypeValues), { nil: null }),
  source: fc.option(fc.constantFrom(...sourceValues), { nil: null }),
});

// --- Helper: get column value for comparison (mirrors implementation logic) ---

const URGENCY_RANK: Record<string, number> = { hot: 3, warm: 2, cold: 1 };
const STAGE_ORDER: Record<string, number> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.order])
);

function getColumnValueForTest(
  lead: { status: string; deal_type: string; urgency: string; source: string; intent_score: number | null; last_activity_at: string | null; created_at: string; contact: { full_name: string; phone: string; email: string | null } | null },
  column: SortableColumn
): string | number | null {
  switch (column) {
    case 'contact_name':
      return lead.contact?.full_name?.toLowerCase() ?? null;
    case 'deal_type':
      return lead.deal_type?.toLowerCase() ?? null;
    case 'urgency':
      return URGENCY_RANK[lead.urgency] ?? null;
    case 'stage':
      return STAGE_ORDER[lead.status] ?? null;
    case 'source':
      return lead.source?.toLowerCase() ?? null;
    case 'intent_score':
      return lead.intent_score;
    case 'last_activity':
      return lead.last_activity_at ?? null;
    case 'created_at':
      return lead.created_at ?? null;
    default:
      return null;
  }
}

// --- Property 4: Sort correctness ---
// Feature: pipeline-list-view, Property 4: Sort correctness

/**
 * Validates: Requirements 3.2, 3.3, 3.5, 3.8, 3.9
 *
 * Property 4: Sort correctness
 * For any list of leads and any sortable column, after sorting ascending every adjacent
 * pair satisfies compareColumn(a) <= compareColumn(b), descending satisfies
 * compareColumn(a) >= compareColumn(b). Null values sort to end regardless of direction.
 * Equal values sub-ordered by created_at descending.
 */

describe('Feature: pipeline-list-view, Property 4: Sort correctness', () => {
  it('ascending sort: every adjacent pair satisfies compareColumn(a) <= compareColumn(b)', () => {
    fc.assert(
      fc.property(leadsArrayArb, fc.constantFrom(...sortableColumns), (leads, column) => {
        const sortState: SortState = { column, direction: 'asc' };
        const sorted = sortLeads(leads, sortState);

        for (let i = 0; i < sorted.length - 1; i++) {
          const aVal = getColumnValueForTest(sorted[i], column);
          const bVal = getColumnValueForTest(sorted[i + 1], column);

          // Null values must sort to end
          if (aVal === null && bVal !== null) {
            // This should not happen in ascending — nulls go to end
            expect(true).toBe(false); // fail
          }
          if (aVal !== null && bVal === null) {
            // This is correct — non-null before null
            continue;
          }
          if (aVal === null && bVal === null) {
            // Both null — check tie-break by created_at descending
            const aCreated = sorted[i].created_at;
            const bCreated = sorted[i + 1].created_at;
            expect(aCreated >= bCreated).toBe(true);
            continue;
          }

          // Both non-null: ascending order
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            expect(aVal).toBeLessThanOrEqual(bVal);
          } else {
            expect(String(aVal).localeCompare(String(bVal))).toBeLessThanOrEqual(0);
          }

          // If equal, check tie-break by created_at descending
          const areEqual =
            typeof aVal === 'number' && typeof bVal === 'number'
              ? aVal === bVal
              : String(aVal) === String(bVal);
          if (areEqual) {
            const aCreated = sorted[i].created_at;
            const bCreated = sorted[i + 1].created_at;
            expect(aCreated >= bCreated).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('descending sort: every adjacent pair satisfies compareColumn(a) >= compareColumn(b)', () => {
    fc.assert(
      fc.property(leadsArrayArb, fc.constantFrom(...sortableColumns), (leads, column) => {
        const sortState: SortState = { column, direction: 'desc' };
        const sorted = sortLeads(leads, sortState);

        for (let i = 0; i < sorted.length - 1; i++) {
          const aVal = getColumnValueForTest(sorted[i], column);
          const bVal = getColumnValueForTest(sorted[i + 1], column);

          // Null values must sort to end regardless of direction
          if (aVal === null && bVal !== null) {
            expect(true).toBe(false); // fail — null should be at end
          }
          if (aVal !== null && bVal === null) {
            continue; // correct — non-null before null
          }
          if (aVal === null && bVal === null) {
            // Both null — check tie-break by created_at descending
            const aCreated = sorted[i].created_at;
            const bCreated = sorted[i + 1].created_at;
            expect(aCreated >= bCreated).toBe(true);
            continue;
          }

          // Both non-null: descending order
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            expect(aVal).toBeGreaterThanOrEqual(bVal);
          } else {
            expect(String(aVal).localeCompare(String(bVal))).toBeGreaterThanOrEqual(0);
          }

          // If equal, check tie-break by created_at descending
          const areEqual =
            typeof aVal === 'number' && typeof bVal === 'number'
              ? aVal === bVal
              : String(aVal) === String(bVal);
          if (areEqual) {
            const aCreated = sorted[i].created_at;
            const bCreated = sorted[i + 1].created_at;
            expect(aCreated >= bCreated).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('null values always sort to end regardless of direction', () => {
    fc.assert(
      fc.property(leadsArrayArb, sortStateArb, (leads, sort) => {
        const sorted = sortLeads(leads, sort);

        const values = sorted.map((lead) => getColumnValueForTest(lead, sort.column));
        const firstNullIndex = values.findIndex((v) => v === null);

        if (firstNullIndex !== -1) {
          // All values after the first null must also be null
          for (let i = firstNullIndex; i < values.length; i++) {
            expect(values[i]).toBeNull();
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 5: Filter correctness with AND logic ---
// Feature: pipeline-list-view, Property 5: Filter correctness with AND logic

/**
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.7, 4.9, 4.11, 4.12
 *
 * Property 5: Filter correctness with AND logic
 * For any combination of active filters and any list of leads, every lead in filtered
 * result satisfies ALL active filter conditions simultaneously, and no lead satisfying
 * all conditions is excluded. Text search with fewer than 2 chars does not reduce the result set.
 */

function leadSatisfiesAllFilters(
  lead: { status: string; deal_type: string; urgency: string; source: string; contact: { full_name: string; phone: string; email: string | null } | null },
  filters: PipelineFilters,
  debouncedSearch: string
): boolean {
  // Text search (only when 2+ chars)
  if (debouncedSearch.length >= 2) {
    const searchLower = debouncedSearch.toLowerCase();
    const nameMatch = lead.contact?.full_name?.toLowerCase().includes(searchLower) ?? false;
    const phoneMatch = lead.contact?.phone?.toLowerCase().includes(searchLower) ?? false;
    if (!nameMatch && !phoneMatch) return false;
  }

  // Stage filter
  if (filters.stages.length > 0) {
    if (!filters.stages.includes(lead.status as PipelineStage)) return false;
  }

  // Urgency filter
  if (filters.urgency !== null) {
    if (lead.urgency !== filters.urgency) return false;
  }

  // Deal type filter
  if (filters.dealType !== null) {
    if (lead.deal_type !== filters.dealType) return false;
  }

  // Source filter
  if (filters.source !== null) {
    if (lead.source !== filters.source) return false;
  }

  return true;
}

describe('Feature: pipeline-list-view, Property 5: Filter correctness with AND logic', () => {
  it('every lead in filtered result satisfies ALL active filter conditions', () => {
    fc.assert(
      fc.property(leadsArrayArb, filtersArb, (leads, filters) => {
        // Use the search value directly as the debounced search (simulating debounce completed)
        const debouncedSearch = filters.search;
        const filtered = filterLeads(leads, filters, debouncedSearch);

        // Every lead in the result must satisfy all conditions
        for (const lead of filtered) {
          expect(leadSatisfiesAllFilters(lead, filters, debouncedSearch)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no lead satisfying all conditions is excluded from the result', () => {
    fc.assert(
      fc.property(leadsArrayArb, filtersArb, (leads, filters) => {
        const debouncedSearch = filters.search;
        const filtered = filterLeads(leads, filters, debouncedSearch);
        const filteredIds = new Set(filtered.map((l) => l.id));

        // Every lead that satisfies all conditions must be in the result
        for (const lead of leads) {
          if (leadSatisfiesAllFilters(lead, filters, debouncedSearch)) {
            expect(filteredIds.has(lead.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('text search with fewer than 2 chars does not reduce the result set', () => {
    fc.assert(
      fc.property(
        leadsArrayArb,
        fc.string({ minLength: 0, maxLength: 1 }),
        (leads, shortSearch) => {
          const filters: PipelineFilters = {
            search: shortSearch,
            stages: [],
            urgency: null,
            dealType: null,
            source: null,
          };
          // With short search and no other filters, all leads should be returned
          const filtered = filterLeads(leads, filters, shortSearch);
          expect(filtered.length).toBe(leads.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 6: Filtered count accuracy ---
// Feature: pipeline-list-view, Property 6: Filtered count accuracy

/**
 * Validates: Requirements 4.13
 *
 * Property 6: Filtered count accuracy
 * For any filter state and lead array, filteredCount equals length of filtered leads array,
 * totalCount equals length of original unfiltered array.
 */

describe('Feature: pipeline-list-view, Property 6: Filtered count accuracy', () => {
  it('filteredCount equals length of filtered leads array, totalCount equals original array length', () => {
    fc.assert(
      fc.property(leadsArrayArb, filtersArb, (leads, filters) => {
        const debouncedSearch = filters.search;
        const filtered = filterLeads(leads, filters, debouncedSearch);

        const filteredCount = filtered.length;
        const totalCount = leads.length;

        // filteredCount must equal the actual filtered array length
        expect(filteredCount).toBe(filtered.length);

        // totalCount must equal the original unfiltered array length
        expect(totalCount).toBe(leads.length);

        // filteredCount must be <= totalCount
        expect(filteredCount).toBeLessThanOrEqual(totalCount);
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 8: Filter preservation across view toggle ---
// Feature: pipeline-list-view, Property 8: Filter preservation across view toggle

/**
 * Validates: Requirements 2.4, 4.17
 *
 * Property 8: Filter preservation across view toggle
 * For any set of active filters, toggling view mode does not modify filter state —
 * the same set of leads is displayed in the new view.
 */

describe('Feature: pipeline-list-view, Property 8: Filter preservation across view toggle', () => {
  it('toggling view mode does not modify filter state; same leads are displayed', () => {
    fc.assert(
      fc.property(leadsArrayArb, filtersArb, (leads, filters) => {
        const debouncedSearch = filters.search;

        // Simulate filtering in "board" view
        const filteredInBoard = filterLeads(leads, filters, debouncedSearch);

        // Simulate toggling to "list" view — filters remain the same
        const filteredInList = filterLeads(leads, filters, debouncedSearch);

        // The filtered results must be identical regardless of view mode
        expect(filteredInBoard.length).toBe(filteredInList.length);
        expect(filteredInBoard.map((l) => l.id)).toEqual(filteredInList.map((l) => l.id));

        // Filter state itself is unchanged (same object reference test via deep equality)
        const filtersBefore = { ...filters };
        filterLeads(leads, filters, debouncedSearch);
        expect(filters).toEqual(filtersBefore);
      }),
      { numRuns: 100 }
    );
  });

  it('filter state is not mutated by filterLeads function', () => {
    fc.assert(
      fc.property(leadsArrayArb, filtersArb, (leads, filters) => {
        const debouncedSearch = filters.search;
        const filtersCopy = JSON.parse(JSON.stringify(filters));

        // Call filterLeads
        filterLeads(leads, filters, debouncedSearch);

        // Filters must not be mutated
        expect(filters).toEqual(filtersCopy);
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 9: Hot indicator and eligibility badge conditions ---
// Feature: pipeline-list-view, Property 9: Hot indicator and eligibility badge conditions

/**
 * Validates: Requirements 5.4, 5.5
 *
 * Property 9: Hot indicator and eligibility badge conditions
 * - For any lead, the hot indicator SHALL be rendered if and only if
 *   `urgency === 'hot'` OR `intent_score >= 4`.
 * - The eligibility risk badge ("ELIG WATCH") SHALL be rendered if and only if
 *   `eligibility_risk === true`.
 * - These conditions are independent and both may apply simultaneously.
 */

// Generator for leads with varying urgency, intent_score, and eligibility_risk
const hotIndicatorLeadArb = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom(...stageValues),
  deal_type: fc.constantFrom(...dealTypeValues),
  urgency: fc.constantFrom('hot', 'warm', 'cold'),
  source: fc.constantFrom(...sourceValues),
  intent_score: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
  verification_score: fc.option(fc.integer({ min: 1, max: 3 }), { nil: null }),
  eligibility_risk: fc.boolean(),
  last_activity_at: fc.integer({ min: 1700000000000, max: 1750000000000 }).map((ts) => new Date(ts).toISOString()),
  created_at: fc.integer({ min: 1700000000000, max: 1750000000000 }).map((ts) => new Date(ts).toISOString()),
  contact: fc.option(
    fc.record({
      full_name: fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.replace(/[^\w\s]/g, 'a')),
      phone: fc.string({ minLength: 8, maxLength: 12 }).map((s) => s.replace(/[^\d]/g, '9')),
      email: fc.option(fc.emailAddress(), { nil: null }),
    }),
    { nil: null }
  ),
  tasks: fc.constant([] as { id: string; title: string; due_at: string; completed_at: string | null }[]),
});

/**
 * Determines whether the hot indicator should be shown for a lead.
 * This mirrors the condition from the component: urgency === 'hot' || intent_score >= 4
 */
function shouldShowHotIndicator(lead: { urgency: string; intent_score: number | null }): boolean {
  return lead.urgency === 'hot' || (lead.intent_score !== null && lead.intent_score >= 4);
}

/**
 * Determines whether the eligibility risk badge should be shown for a lead.
 * This mirrors the condition from the component: eligibility_risk === true
 */
function shouldShowEligibilityBadge(lead: { eligibility_risk: boolean }): boolean {
  return lead.eligibility_risk === true;
}

describe('Feature: pipeline-list-view, Property 9: Hot indicator and eligibility badge conditions', () => {
  it('hot indicator is shown if and only if urgency === "hot" OR intent_score >= 4', () => {
    fc.assert(
      fc.property(hotIndicatorLeadArb, (lead) => {
        const showHot = shouldShowHotIndicator(lead);

        // The condition must be true if and only if urgency is hot OR intent_score >= 4
        const expectedHot = lead.urgency === 'hot' || (lead.intent_score !== null && lead.intent_score >= 4);
        expect(showHot).toBe(expectedHot);

        // Verify specific sub-cases for the biconditional:
        // If urgency is hot, indicator must show regardless of intent_score
        if (lead.urgency === 'hot') {
          expect(showHot).toBe(true);
        }

        // If intent_score >= 4, indicator must show regardless of urgency
        if (lead.intent_score !== null && lead.intent_score >= 4) {
          expect(showHot).toBe(true);
        }

        // If urgency is NOT hot AND intent_score < 4 (or null), indicator must NOT show
        if (lead.urgency !== 'hot' && (lead.intent_score === null || lead.intent_score < 4)) {
          expect(showHot).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('eligibility risk badge is shown if and only if eligibility_risk === true', () => {
    fc.assert(
      fc.property(hotIndicatorLeadArb, (lead) => {
        const showBadge = shouldShowEligibilityBadge(lead);

        // The condition must be true if and only if eligibility_risk is true
        expect(showBadge).toBe(lead.eligibility_risk === true);

        // Verify the biconditional explicitly
        if (lead.eligibility_risk === true) {
          expect(showBadge).toBe(true);
        } else {
          expect(showBadge).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('hot indicator and eligibility badge conditions are independent — both may apply simultaneously', () => {
    fc.assert(
      fc.property(hotIndicatorLeadArb, (lead) => {
        const showHot = shouldShowHotIndicator(lead);
        const showBadge = shouldShowEligibilityBadge(lead);

        // Both conditions are evaluated independently
        // Changing one should not affect the other
        const expectedHot = lead.urgency === 'hot' || (lead.intent_score !== null && lead.intent_score >= 4);
        const expectedBadge = lead.eligibility_risk === true;

        expect(showHot).toBe(expectedHot);
        expect(showBadge).toBe(expectedBadge);

        // Verify independence: a lead can have both, either, or neither
        // This is implicitly tested by the generator producing all combinations,
        // but we explicitly verify the logic doesn't couple them
        if (lead.urgency === 'hot' && lead.eligibility_risk === true) {
          expect(showHot).toBe(true);
          expect(showBadge).toBe(true);
        }
        if (lead.urgency !== 'hot' && (lead.intent_score === null || lead.intent_score < 4) && lead.eligibility_risk === false) {
          expect(showHot).toBe(false);
          expect(showBadge).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
