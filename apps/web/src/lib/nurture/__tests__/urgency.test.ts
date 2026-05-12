import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  classifyUrgency,
  computeStatsCounts,
  formatRelativeActivity,
  formatSingaporePhone,
  getContactInitials,
  groupTasksByUrgency,
  groupTasksByPlaybook,
  filterTasks,
} from '../urgency';
import type { EnrichedNurtureTask, FilterState } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<EnrichedNurtureTask> = {}): EnrichedNurtureTask {
  return {
    id: 'task-1',
    contact_id: 'contact-1',
    contact_name: 'John Doe',
    owned_property_summary: 'Condo · Tampines',
    segment_tags: [],
    next_action_title: 'Follow up',
    due_at: new Date().toISOString(),
    last_activity_date: null,
    consent_badge: 'green',
    channel: 'whatsapp',
    playbook_name: 'Default Playbook',
    status: 'pending',
    contact_phone: '91234567',
    owned_property_label: 'Condo',
    owned_property_town: 'Tampines',
    owned_property_type: 'Condo',
    owned_property_flat_type: null,
    mop_date: null,
    playbook_steps: null,
    ...overrides,
  };
}

// ─── classifyUrgency ─────────────────────────────────────────────────────────

describe('classifyUrgency', () => {
  beforeEach(() => {
    // Fix time to 2024-06-15 10:00:00 SGT (02:00:00 UTC)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('classifies a past date as overdue', () => {
    // 2024-06-14 10:00 SGT = 2024-06-14T02:00:00Z (yesterday in SG)
    expect(classifyUrgency('2024-06-14T02:00:00.000Z')).toBe('overdue');
  });

  it('classifies a date earlier today as today', () => {
    // 2024-06-15 08:00 SGT = 2024-06-15T00:00:00Z (today in SG)
    expect(classifyUrgency('2024-06-15T00:00:00.000Z')).toBe('today');
  });

  it('classifies a future date as upcoming', () => {
    // 2024-06-16 10:00 SGT = 2024-06-16T02:00:00Z (tomorrow in SG)
    expect(classifyUrgency('2024-06-16T02:00:00.000Z')).toBe('upcoming');
  });

  it('classifies start of today (midnight SG) as today', () => {
    // Midnight SG on 2024-06-15 = 2024-06-14T16:00:00Z
    expect(classifyUrgency('2024-06-14T16:00:00.000Z')).toBe('today');
  });

  it('classifies just before midnight SG as today', () => {
    // 23:59:59 SG on 2024-06-15 = 2024-06-15T15:59:59Z
    expect(classifyUrgency('2024-06-15T15:59:59.000Z')).toBe('today');
  });

  it('classifies midnight next day SG as upcoming', () => {
    // Midnight SG on 2024-06-16 = 2024-06-15T16:00:00Z
    expect(classifyUrgency('2024-06-15T16:00:00.000Z')).toBe('upcoming');
  });
});

// ─── computeStatsCounts ──────────────────────────────────────────────────────

describe('computeStatsCounts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts pending tasks by urgency', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z', status: 'pending' }), // overdue
      makeTask({ id: '2', due_at: '2024-06-15T00:00:00.000Z', status: 'pending' }), // today
      makeTask({ id: '3', due_at: '2024-06-16T02:00:00.000Z', status: 'pending' }), // upcoming
    ];

    expect(computeStatsCounts(tasks)).toEqual({ overdue: 1, today: 1, upcoming: 1 });
  });

  it('excludes done tasks', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z', status: 'done' }),
      makeTask({ id: '2', due_at: '2024-06-15T00:00:00.000Z', status: 'pending' }),
    ];

    expect(computeStatsCounts(tasks)).toEqual({ overdue: 0, today: 1, upcoming: 0 });
  });

  it('excludes snoozed tasks', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z', status: 'snoozed' }),
      makeTask({ id: '2', due_at: '2024-06-15T00:00:00.000Z', status: 'pending' }),
    ];

    expect(computeStatsCounts(tasks)).toEqual({ overdue: 0, today: 1, upcoming: 0 });
  });

  it('returns zeros for empty array', () => {
    expect(computeStatsCounts([])).toEqual({ overdue: 0, today: 0, upcoming: 0 });
  });
});

// ─── formatRelativeActivity ──────────────────────────────────────────────────

describe('formatRelativeActivity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "—" for null', () => {
    expect(formatRelativeActivity(null)).toBe('—');
  });

  it('returns "0h ago" for just now', () => {
    expect(formatRelativeActivity('2024-06-15T10:00:00.000Z')).toBe('0h ago');
  });

  it('returns "5h ago" for 5 hours ago', () => {
    expect(formatRelativeActivity('2024-06-15T05:00:00.000Z')).toBe('5h ago');
  });

  it('returns "2d ago" for 2 days ago', () => {
    expect(formatRelativeActivity('2024-06-13T10:00:00.000Z')).toBe('2d ago');
  });

  it('returns "7d ago" for exactly 7 days ago', () => {
    expect(formatRelativeActivity('2024-06-08T10:00:00.000Z')).toBe('7d ago');
  });

  it('returns short date for more than 7 days ago', () => {
    expect(formatRelativeActivity('2024-06-01T10:00:00.000Z')).toBe('1 Jun');
  });

  it('returns short date for much older dates', () => {
    expect(formatRelativeActivity('2024-01-12T10:00:00.000Z')).toBe('12 Jan');
  });
});

// ─── formatSingaporePhone ────────────────────────────────────────────────────

describe('formatSingaporePhone', () => {
  it('returns "–" for null', () => {
    expect(formatSingaporePhone(null)).toBe('–');
  });

  it('formats valid 8-digit number starting with 9', () => {
    expect(formatSingaporePhone('91234567')).toBe('+65 9123 4567');
  });

  it('formats valid 8-digit number starting with 8', () => {
    expect(formatSingaporePhone('81234567')).toBe('+65 8123 4567');
  });

  it('formats valid 8-digit number starting with 6', () => {
    expect(formatSingaporePhone('61234567')).toBe('+65 6123 4567');
  });

  it('formats number with +65 prefix', () => {
    expect(formatSingaporePhone('+6591234567')).toBe('+65 9123 4567');
  });

  it('formats number with 65 prefix', () => {
    expect(formatSingaporePhone('6591234567')).toBe('+65 9123 4567');
  });

  it('returns "–" for number starting with invalid digit', () => {
    expect(formatSingaporePhone('71234567')).toBe('–');
  });

  it('returns "–" for too short number', () => {
    expect(formatSingaporePhone('9123456')).toBe('–');
  });

  it('returns "–" for too long number', () => {
    expect(formatSingaporePhone('912345678')).toBe('–');
  });

  it('returns "–" for empty string', () => {
    expect(formatSingaporePhone('')).toBe('–');
  });

  it('handles number with spaces', () => {
    expect(formatSingaporePhone('9123 4567')).toBe('+65 9123 4567');
  });

  it('handles number with dashes', () => {
    expect(formatSingaporePhone('9123-4567')).toBe('+65 9123 4567');
  });
});

// ─── getContactInitials ──────────────────────────────────────────────────────

describe('getContactInitials', () => {
  it('returns two initials for two-word name', () => {
    expect(getContactInitials('John Doe')).toBe('JD');
  });

  it('returns single initial for single-word name', () => {
    expect(getContactInitials('John')).toBe('J');
  });

  it('returns first and last initials for multi-word name', () => {
    expect(getContactInitials('John Michael Doe')).toBe('JD');
  });

  it('returns uppercase initials', () => {
    expect(getContactInitials('john doe')).toBe('JD');
  });

  it('handles extra whitespace', () => {
    expect(getContactInitials('  John   Doe  ')).toBe('JD');
  });

  it('returns empty string for empty name', () => {
    expect(getContactInitials('')).toBe('');
  });

  it('returns empty string for whitespace-only name', () => {
    expect(getContactInitials('   ')).toBe('');
  });
});

// ─── groupTasksByUrgency ─────────────────────────────────────────────────────

describe('groupTasksByUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups tasks by urgency classification', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z' }),
      makeTask({ id: '2', due_at: '2024-06-15T00:00:00.000Z' }),
      makeTask({ id: '3', due_at: '2024-06-16T02:00:00.000Z' }),
    ];

    const groups = groupTasksByUrgency(tasks);
    expect(Object.keys(groups)).toHaveLength(3);
    expect(groups['overdue']).toHaveLength(1);
    expect(groups['today']).toHaveLength(1);
    expect(groups['upcoming']).toHaveLength(1);
  });

  it('excludes snoozed tasks', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z', status: 'snoozed' }),
      makeTask({ id: '2', due_at: '2024-06-15T00:00:00.000Z', status: 'pending' }),
    ];

    const groups = groupTasksByUrgency(tasks);
    expect(groups['overdue']).toBeUndefined();
    expect(groups['today']).toHaveLength(1);
  });

  it('sorts tasks within groups by due_at ascending', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T10:00:00.000Z' }),
      makeTask({ id: '2', due_at: '2024-06-14T05:00:00.000Z' }),
      makeTask({ id: '3', due_at: '2024-06-14T08:00:00.000Z' }),
    ];

    const groups = groupTasksByUrgency(tasks);
    expect(groups['overdue']!.map((t) => t.id)).toEqual(['2', '3', '1']);
  });

  it('produces no empty groups', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-15T00:00:00.000Z' }),
    ];

    const groups = groupTasksByUrgency(tasks);
    expect(groups['overdue']).toBeUndefined();
    expect(groups['upcoming']).toBeUndefined();
    expect(groups['today']).toHaveLength(1);
  });
});

// ─── groupTasksByPlaybook ────────────────────────────────────────────────────

describe('groupTasksByPlaybook', () => {
  it('groups tasks by playbook name', () => {
    const tasks = [
      makeTask({ id: '1', playbook_name: 'Alpha' }),
      makeTask({ id: '2', playbook_name: 'Beta' }),
      makeTask({ id: '3', playbook_name: 'Alpha' }),
    ];

    const groups = groupTasksByPlaybook(tasks);
    expect(Object.keys(groups)).toEqual(['Alpha', 'Beta']);
    expect(groups['Alpha']).toHaveLength(2);
    expect(groups['Beta']).toHaveLength(1);
  });

  it('sorts section keys alphabetically', () => {
    const tasks = [
      makeTask({ id: '1', playbook_name: 'Zeta' }),
      makeTask({ id: '2', playbook_name: 'Alpha' }),
      makeTask({ id: '3', playbook_name: 'Mango' }),
    ];

    const groups = groupTasksByPlaybook(tasks);
    expect(Object.keys(groups)).toEqual(['Alpha', 'Mango', 'Zeta']);
  });

  it('sorts tasks within each section by due_at ascending', () => {
    const tasks = [
      makeTask({ id: '1', playbook_name: 'Alpha', due_at: '2024-06-15T10:00:00.000Z' }),
      makeTask({ id: '2', playbook_name: 'Alpha', due_at: '2024-06-15T05:00:00.000Z' }),
      makeTask({ id: '3', playbook_name: 'Alpha', due_at: '2024-06-15T08:00:00.000Z' }),
    ];

    const groups = groupTasksByPlaybook(tasks);
    expect(groups['Alpha']!.map((t) => t.id)).toEqual(['2', '3', '1']);
  });
});

// ─── filterTasks ─────────────────────────────────────────────────────────────

describe('filterTasks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultFilters: FilterState = {
    activePill: 'all',
    playbookFilter: '',
    consentFilter: '',
    myTasksOnly: false,
  };

  it('returns all tasks when no filters are active', () => {
    const tasks = [
      makeTask({ id: '1' }),
      makeTask({ id: '2' }),
    ];

    expect(filterTasks(tasks, defaultFilters)).toHaveLength(2);
  });

  it('filters by overdue pill tab', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z', status: 'pending' }),
      makeTask({ id: '2', due_at: '2024-06-15T00:00:00.000Z', status: 'pending' }),
    ];

    const result = filterTasks(tasks, { ...defaultFilters, activePill: 'overdue' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by snoozed pill tab', () => {
    const tasks = [
      makeTask({ id: '1', status: 'snoozed' }),
      makeTask({ id: '2', status: 'pending' }),
    ];

    const result = filterTasks(tasks, { ...defaultFilters, activePill: 'snoozed' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes snoozed tasks from urgency pill filters', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z', status: 'snoozed' }),
      makeTask({ id: '2', due_at: '2024-06-14T00:00:00.000Z', status: 'pending' }),
    ];

    const result = filterTasks(tasks, { ...defaultFilters, activePill: 'overdue' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by playbook name', () => {
    const tasks = [
      makeTask({ id: '1', playbook_name: 'Alpha' }),
      makeTask({ id: '2', playbook_name: 'Beta' }),
    ];

    const result = filterTasks(tasks, { ...defaultFilters, playbookFilter: 'Alpha' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by consent badge', () => {
    const tasks = [
      makeTask({ id: '1', consent_badge: 'green' }),
      makeTask({ id: '2', consent_badge: 'red' }),
    ];

    const result = filterTasks(tasks, { ...defaultFilters, consentFilter: 'green' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('applies AND logic for multiple filters', () => {
    const tasks = [
      makeTask({ id: '1', due_at: '2024-06-14T00:00:00.000Z', playbook_name: 'Alpha', consent_badge: 'green', status: 'pending' }),
      makeTask({ id: '2', due_at: '2024-06-14T00:00:00.000Z', playbook_name: 'Beta', consent_badge: 'green', status: 'pending' }),
      makeTask({ id: '3', due_at: '2024-06-14T00:00:00.000Z', playbook_name: 'Alpha', consent_badge: 'red', status: 'pending' }),
      makeTask({ id: '4', due_at: '2024-06-15T00:00:00.000Z', playbook_name: 'Alpha', consent_badge: 'green', status: 'pending' }),
    ];

    const result = filterTasks(tasks, {
      activePill: 'overdue',
      playbookFilter: 'Alpha',
      consentFilter: 'green',
      myTasksOnly: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
