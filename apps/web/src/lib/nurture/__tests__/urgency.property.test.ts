import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  classifyUrgency,
  computeStatsCounts,
  formatRelativeActivity,
  formatSingaporePhone,
  getContactInitials,
  groupTasksByUrgency,
  groupTasksByPlaybook,
} from '../urgency';
import type { EnrichedNurtureTask } from '../types';

// ─── Generators ──────────────────────────────────────────────────────────────

const taskChannelArb = fc.constantFrom('whatsapp', 'email', 'call', 'note') as fc.Arbitrary<
  'whatsapp' | 'email' | 'call' | 'note'
>;

const taskStatusArb = fc.constantFrom('pending', 'done', 'skipped', 'snoozed') as fc.Arbitrary<
  'pending' | 'done' | 'skipped' | 'snoozed'
>;

const consentBadgeArb = fc.constantFrom('green', 'yellow', 'red') as fc.Arbitrary<
  'green' | 'yellow' | 'red'
>;

const playbookNameArb = fc.constantFrom(
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi'
);

/** Generate a due_at ISO string within a reasonable range around "now" */
const dueAtArb = fc
  .integer({
    min: new Date('2024-06-10T00:00:00.000Z').getTime(),
    max: new Date('2024-06-20T00:00:00.000Z').getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

/** Generate an EnrichedNurtureTask with arbitrary values */
const enrichedTaskArb = (overrides?: Partial<EnrichedNurtureTask>): fc.Arbitrary<EnrichedNurtureTask> =>
  fc
    .record({
      id: fc.uuid(),
      contact_id: fc.uuid(),
      contact_name: fc.string({ minLength: 1, maxLength: 30 }),
      owned_property_summary: fc.constant('Condo · Tampines'),
      segment_tags: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 }),
      next_action_title: fc.string({ minLength: 1, maxLength: 50 }),
      due_at: dueAtArb,
      last_activity_date: fc.option(dueAtArb, { nil: null }),
      consent_badge: consentBadgeArb,
      channel: taskChannelArb,
      playbook_name: playbookNameArb,
      status: taskStatusArb,
      contact_phone: fc.option(fc.constant('91234567'), { nil: null }),
      owned_property_label: fc.option(fc.constant('Condo'), { nil: null }),
      owned_property_town: fc.option(fc.constant('Tampines'), { nil: null }),
      owned_property_type: fc.constant('Condo'),
      owned_property_flat_type: fc.option(fc.constant('4-room'), { nil: null }),
      mop_date: fc.option(fc.constant('2025-01-01'), { nil: null }),
      playbook_steps: fc.constant(null),
    })
    .map((task) => ({ ...task, ...overrides }));

/** Generate a pending (non-done, non-snoozed) task */
const pendingTaskArb = enrichedTaskArb({ status: 'pending' });

/** Generate a non-snoozed task (pending, done, or skipped) */
const nonSnoozedTaskArb = enrichedTaskArb().map((task) => ({
  ...task,
  status: task.status === 'snoozed' ? 'pending' : task.status,
})) as fc.Arbitrary<EnrichedNurtureTask>;

// ─── Property 1: Stats computation partitions all pending tasks ──────────────

/**
 * Feature: nurture-page-redesign, Property 1: Stats computation partitions all pending tasks into urgency categories
 *
 * **Validates: Requirements 2.2, 2.3, 2.4, 9.2**
 *
 * For any array of tasks with varying due_at dates and statuses, computeStatsCounts SHALL produce
 * counts where: (a) overdue + today + upcoming equals the total number of pending (non-done,
 * non-snoozed) tasks, (b) every task counted as overdue has due_at before the start of the current
 * calendar day, (c) every task counted as today has due_at within the current calendar day, and
 * (d) every task counted as upcoming has due_at after the end of the current calendar day.
 */
describe('Feature: nurture-page-redesign, Property 1: Stats computation partitions all pending tasks into urgency categories', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('(a) overdue + today + upcoming equals total pending tasks', () => {
    fc.assert(
      fc.property(fc.array(enrichedTaskArb(), { minLength: 0, maxLength: 50 }), (tasks) => {
        const counts = computeStatsCounts(tasks);
        const pendingCount = tasks.filter(
          (t) => t.status !== 'done' && t.status !== 'snoozed'
        ).length;

        expect(counts.overdue + counts.today + counts.upcoming).toBe(pendingCount);
      }),
      { numRuns: 100 }
    );
  });

  it('(b) every task counted as overdue has due_at before start of current day', () => {
    fc.assert(
      fc.property(fc.array(pendingTaskArb, { minLength: 1, maxLength: 50 }), (tasks) => {
        const counts = computeStatsCounts(tasks);
        const overdueTasks = tasks.filter((t) => classifyUrgency(t.due_at) === 'overdue');

        expect(overdueTasks.length).toBe(counts.overdue);

        // Start of day in SG: 2024-06-15 00:00 SGT = 2024-06-14T16:00:00Z
        const startOfDaySG = new Date('2024-06-14T16:00:00.000Z');
        for (const task of overdueTasks) {
          expect(new Date(task.due_at).getTime()).toBeLessThan(startOfDaySG.getTime());
        }
      }),
      { numRuns: 100 }
    );
  });

  it('(c) every task counted as today has due_at within current calendar day', () => {
    fc.assert(
      fc.property(fc.array(pendingTaskArb, { minLength: 1, maxLength: 50 }), (tasks) => {
        const counts = computeStatsCounts(tasks);
        const todayTasks = tasks.filter((t) => classifyUrgency(t.due_at) === 'today');

        expect(todayTasks.length).toBe(counts.today);

        const startOfDaySG = new Date('2024-06-14T16:00:00.000Z');
        const endOfDaySG = new Date('2024-06-15T16:00:00.000Z');
        for (const task of todayTasks) {
          const dueTime = new Date(task.due_at).getTime();
          expect(dueTime).toBeGreaterThanOrEqual(startOfDaySG.getTime());
          expect(dueTime).toBeLessThan(endOfDaySG.getTime());
        }
      }),
      { numRuns: 100 }
    );
  });

  it('(d) every task counted as upcoming has due_at after end of current day', () => {
    fc.assert(
      fc.property(fc.array(pendingTaskArb, { minLength: 1, maxLength: 50 }), (tasks) => {
        const counts = computeStatsCounts(tasks);
        const upcomingTasks = tasks.filter((t) => classifyUrgency(t.due_at) === 'upcoming');

        expect(upcomingTasks.length).toBe(counts.upcoming);

        const endOfDaySG = new Date('2024-06-15T16:00:00.000Z');
        for (const task of upcomingTasks) {
          expect(new Date(task.due_at).getTime()).toBeGreaterThanOrEqual(endOfDaySG.getTime());
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Urgency grouping places tasks correctly ─────────────────────

/**
 * Feature: nurture-page-redesign, Property 3: Urgency grouping places tasks correctly and maintains sort order
 *
 * **Validates: Requirements 4.2, 4.5, 4.8**
 *
 * For any array of non-snoozed pending tasks, groupTasksByUrgency SHALL: (a) place each task in
 * exactly one group matching its urgency classification, (b) exclude all snoozed tasks from all
 * groups, (c) sort tasks within each group by due_at ascending, (d) produce no empty groups.
 */
describe('Feature: nurture-page-redesign, Property 3: Urgency grouping places tasks correctly and maintains sort order', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T02:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('(a) each task appears in exactly one group matching its urgency classification', () => {
    fc.assert(
      fc.property(fc.array(nonSnoozedTaskArb, { minLength: 1, maxLength: 50 }), (tasks) => {
        const groups = groupTasksByUrgency(tasks);
        const allGroupedTasks = Object.values(groups).flat();

        // Non-snoozed tasks should all appear
        const nonSnoozed = tasks.filter((t) => t.status !== 'snoozed');
        expect(allGroupedTasks.length).toBe(nonSnoozed.length);

        // Each task is in the correct group
        for (const [groupKey, groupTasks] of Object.entries(groups)) {
          for (const task of groupTasks) {
            expect(classifyUrgency(task.due_at)).toBe(groupKey);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('(b) excludes all snoozed tasks from all groups', () => {
    fc.assert(
      fc.property(fc.array(enrichedTaskArb(), { minLength: 1, maxLength: 50 }), (tasks) => {
        const groups = groupTasksByUrgency(tasks);
        const allGroupedTasks = Object.values(groups).flat();

        for (const task of allGroupedTasks) {
          expect(task.status).not.toBe('snoozed');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('(c) tasks within each group are sorted by due_at ascending', () => {
    fc.assert(
      fc.property(fc.array(nonSnoozedTaskArb, { minLength: 1, maxLength: 50 }), (tasks) => {
        const groups = groupTasksByUrgency(tasks);

        for (const groupTasks of Object.values(groups)) {
          for (let i = 1; i < groupTasks.length; i++) {
            const prev = new Date(groupTasks[i - 1].due_at).getTime();
            const curr = new Date(groupTasks[i].due_at).getTime();
            expect(prev).toBeLessThanOrEqual(curr);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('(d) produces no empty groups', () => {
    fc.assert(
      fc.property(fc.array(enrichedTaskArb(), { minLength: 0, maxLength: 50 }), (tasks) => {
        const groups = groupTasksByUrgency(tasks);

        for (const groupTasks of Object.values(groups)) {
          expect(groupTasks.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Playbook grouping produces alphabetically sorted sections ───

/**
 * Feature: nurture-page-redesign, Property 4: Playbook grouping produces alphabetically sorted sections with internal sort
 *
 * **Validates: Requirements 4.3**
 *
 * For any array of tasks, groupTasksByPlaybook SHALL: (a) produce section keys sorted alphabetically
 * by playbook name, (b) sort tasks within each section by due_at ascending, (c) include every input
 * task in exactly one section matching its playbook_name.
 */
describe('Feature: nurture-page-redesign, Property 4: Playbook grouping produces alphabetically sorted sections with internal sort', () => {
  it('(a) section keys are sorted alphabetically by playbook name', () => {
    fc.assert(
      fc.property(fc.array(enrichedTaskArb(), { minLength: 1, maxLength: 50 }), (tasks) => {
        const groups = groupTasksByPlaybook(tasks);
        const keys = Object.keys(groups);
        const sortedKeys = [...keys].sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        expect(keys).toEqual(sortedKeys);
      }),
      { numRuns: 100 }
    );
  });

  it('(b) tasks within each section are sorted by due_at ascending', () => {
    fc.assert(
      fc.property(fc.array(enrichedTaskArb(), { minLength: 1, maxLength: 50 }), (tasks) => {
        const groups = groupTasksByPlaybook(tasks);

        for (const groupTasks of Object.values(groups)) {
          for (let i = 1; i < groupTasks.length; i++) {
            const prev = new Date(groupTasks[i - 1].due_at).getTime();
            const curr = new Date(groupTasks[i].due_at).getTime();
            expect(prev).toBeLessThanOrEqual(curr);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('(c) every input task appears in exactly one section matching its playbook_name', () => {
    fc.assert(
      fc.property(fc.array(enrichedTaskArb(), { minLength: 1, maxLength: 50 }), (tasks) => {
        const groups = groupTasksByPlaybook(tasks);

        // Total tasks in all groups equals input length
        const totalGrouped = Object.values(groups).flat().length;
        expect(totalGrouped).toBe(tasks.length);

        // Each task is in the correct section
        for (const [key, groupTasks] of Object.entries(groups)) {
          for (const task of groupTasks) {
            expect(task.playbook_name).toBe(key);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Contact initials extraction ─────────────────────────────────

/**
 * Feature: nurture-page-redesign, Property 5: Contact initials extraction
 *
 * **Validates: Requirements 5.2**
 *
 * For any non-empty contact name string, getContactInitials SHALL return a string of at most 2
 * uppercase characters derived from the first character of the first word and the first character
 * of the last word.
 */
describe('Feature: nurture-page-redesign, Property 5: Contact initials extraction', () => {
  /** Generate non-empty name strings with alphabetic words */
  const wordArb = fc.string({
    minLength: 1,
    maxLength: 15,
    unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  });
  const nameArb = fc
    .array(wordArb, { minLength: 1, maxLength: 5 })
    .map((words) => words.join(' '));

  it('returns at most 2 characters', () => {
    fc.assert(
      fc.property(nameArb, (name) => {
        const initials = getContactInitials(name);
        expect(initials.length).toBeLessThanOrEqual(2);
      }),
      { numRuns: 100 }
    );
  });

  it('returns at least 1 character for non-empty names', () => {
    fc.assert(
      fc.property(nameArb, (name) => {
        const initials = getContactInitials(name);
        expect(initials.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('returns only uppercase characters', () => {
    fc.assert(
      fc.property(nameArb, (name) => {
        const initials = getContactInitials(name);
        expect(initials).toMatch(/^[A-Z]{1,2}$/);
      }),
      { numRuns: 100 }
    );
  });

  it('first character matches first character of first word (uppercased)', () => {
    fc.assert(
      fc.property(nameArb, (name) => {
        const initials = getContactInitials(name);
        const words = name.trim().split(/\s+/);
        expect(initials[0]).toBe(words[0][0].toUpperCase());
      }),
      { numRuns: 100 }
    );
  });

  it('second character (if present) matches first character of last word (uppercased)', () => {
    fc.assert(
      fc.property(nameArb, (name) => {
        const initials = getContactInitials(name);
        const words = name.trim().split(/\s+/);
        if (words.length > 1) {
          expect(initials[1]).toBe(words[words.length - 1][0].toUpperCase());
        } else {
          expect(initials.length).toBe(1);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 6: Relative time formatting follows format rules ───────────────

/**
 * Feature: nurture-page-redesign, Property 6: Relative time formatting follows format rules
 *
 * **Validates: Requirements 5.3**
 *
 * For any date string representing a past date, formatRelativeActivity SHALL return: (a) a string
 * matching the pattern "Xh ago" or "Xd ago" when the date is within the past 7 days, or (b) a
 * short date string when the date is older than 7 days. For null input, it SHALL return "—".
 */
describe('Feature: nurture-page-redesign, Property 6: Relative time formatting follows format rules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "—" for null input', () => {
    expect(formatRelativeActivity(null)).toBe('—');
  });

  it('returns "Xh ago" pattern for dates within the past 24 hours', () => {
    // Generate dates within the past 24 hours (0 to 23 hours ago)
    const recentDateArb = fc
      .integer({ min: 0, max: 23 })
      .map((hoursAgo) => {
        const d = new Date('2024-06-15T10:00:00.000Z');
        d.setHours(d.getHours() - hoursAgo);
        return d.toISOString();
      });

    fc.assert(
      fc.property(recentDateArb, (dateStr) => {
        const result = formatRelativeActivity(dateStr);
        expect(result).toMatch(/^\d+h ago$/);
      }),
      { numRuns: 100 }
    );
  });

  it('returns "Xd ago" pattern for dates 1-7 days ago', () => {
    // Generate dates 1 to 7 days ago
    const daysAgoArb = fc
      .integer({ min: 1, max: 7 })
      .map((daysAgo) => {
        const d = new Date('2024-06-15T10:00:00.000Z');
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString();
      });

    fc.assert(
      fc.property(daysAgoArb, (dateStr) => {
        const result = formatRelativeActivity(dateStr);
        expect(result).toMatch(/^\d+d ago$/);
      }),
      { numRuns: 100 }
    );
  });

  it('returns short date pattern for dates older than 7 days', () => {
    // Generate dates 8 to 180 days ago
    const oldDateArb = fc
      .integer({ min: 8, max: 180 })
      .map((daysAgo) => {
        const d = new Date('2024-06-15T10:00:00.000Z');
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString();
      });

    fc.assert(
      fc.property(oldDateArb, (dateStr) => {
        const result = formatRelativeActivity(dateStr);
        // Should match pattern like "12 Jan", "1 Jun", etc.
        expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8: Singapore phone number formatting ───────────────────────────

/**
 * Feature: nurture-page-redesign, Property 8: Singapore phone number formatting
 *
 * **Validates: Requirements 9.3, 9.4**
 *
 * For any valid 8-digit Singapore phone number string (digits only, starting with 6, 8, or 9),
 * formatSingaporePhone SHALL return a string matching the pattern "+65 XXXX XXXX". For any null
 * value or string that is not a valid 8-digit Singapore number, it SHALL return "–".
 */
describe('Feature: nurture-page-redesign, Property 8: Singapore phone number formatting', () => {
  const digitUnit = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9');

  /** Generate valid 8-digit Singapore phone numbers (starting with 6, 8, or 9) */
  const validSgPhoneArb = fc
    .tuple(
      fc.constantFrom('6', '8', '9'),
      fc.string({ minLength: 7, maxLength: 7, unit: digitUnit })
    )
    .map(([first, rest]) => `${first}${rest}`);

  /** Generate invalid phone numbers */
  const invalidPhoneArb = fc.oneof(
    // Numbers starting with invalid digits (0-5, 7)
    fc
      .tuple(
        fc.constantFrom('0', '1', '2', '3', '4', '5', '7'),
        fc.string({ minLength: 7, maxLength: 7, unit: digitUnit })
      )
      .map(([first, rest]) => `${first}${rest}`),
    // Too short (less than 8 digits)
    fc.string({ minLength: 1, maxLength: 7, unit: digitUnit }),
    // Too long (more than 8 digits, not matching country code pattern)
    fc.string({ minLength: 9, maxLength: 12, unit: digitUnit }).filter(
      (s) => !s.startsWith('65') || s.length !== 10
    ),
    // Empty string
    fc.constant('')
  );

  it('returns "+65 XXXX XXXX" for valid 8-digit Singapore numbers', () => {
    fc.assert(
      fc.property(validSgPhoneArb, (phone) => {
        const result = formatSingaporePhone(phone);
        expect(result).toMatch(/^\+65 \d{4} \d{4}$/);
      }),
      { numRuns: 100 }
    );
  });

  it('preserves original digits in formatted output', () => {
    fc.assert(
      fc.property(validSgPhoneArb, (phone) => {
        const result = formatSingaporePhone(phone);
        const formattedDigits = result.replace(/\D/g, '');
        // Should be "65" + original 8 digits
        expect(formattedDigits).toBe(`65${phone}`);
      }),
      { numRuns: 100 }
    );
  });

  it('returns "–" for null input', () => {
    expect(formatSingaporePhone(null)).toBe('–');
  });

  it('returns "–" for invalid phone numbers', () => {
    fc.assert(
      fc.property(invalidPhoneArb, (phone) => {
        const result = formatSingaporePhone(phone);
        expect(result).toBe('–');
      }),
      { numRuns: 100 }
    );
  });
});
