import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterTasks, classifyUrgency } from '../urgency';
import type { EnrichedNurtureTask, FilterState, TaskStatus } from '../types';

// --- Generators ---

/** Generate a task status */
const taskStatusArb: fc.Arbitrary<TaskStatus> = fc.constantFrom(
  'pending',
  'done',
  'skipped',
  'snoozed'
);

/** Generate a consent badge value */
const consentBadgeArb = fc.constantFrom('green', 'yellow', 'red') as fc.Arbitrary<
  'green' | 'yellow' | 'red'
>;

/** Generate a task channel */
const taskChannelArb = fc.constantFrom('whatsapp', 'email', 'call', 'note') as fc.Arbitrary<
  'whatsapp' | 'email' | 'call' | 'note'
>;

/** Generate a playbook name from a small set to increase filter hit rate */
const playbookNameArb = fc.constantFrom(
  'Welcome Sequence',
  'Re-engagement',
  'Property Alert',
  'Follow-up',
  'Anniversary'
);

/** Generate a due_at date string spanning past, today, and future */
const dueAtArb = fc
  .integer({
    min: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    max: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
  })
  .map((ts) => new Date(ts).toISOString());

/** Generate an arbitrary EnrichedNurtureTask */
const enrichedTaskArb: fc.Arbitrary<EnrichedNurtureTask> = fc.record({
  id: fc.uuid(),
  contact_id: fc.uuid(),
  contact_name: fc.string({ minLength: 1, maxLength: 30 }),
  owned_property_summary: fc.string({ maxLength: 50 }),
  segment_tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  next_action_title: fc.string({ minLength: 1, maxLength: 50 }),
  due_at: dueAtArb,
  last_activity_date: fc.oneof(fc.constant(null), dueAtArb),
  consent_badge: consentBadgeArb,
  channel: taskChannelArb,
  playbook_name: playbookNameArb,
  status: taskStatusArb,
  contact_phone: fc.option(fc.string({ minLength: 8, maxLength: 12 }), { nil: null }),
  owned_property_label: fc.option(fc.string({ maxLength: 30 }), { nil: null }),
  owned_property_town: fc.option(fc.string({ maxLength: 30 }), { nil: null }),
  owned_property_type: fc.string({ minLength: 1, maxLength: 20 }),
  owned_property_flat_type: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  mop_date: fc.oneof(fc.constant(null), dueAtArb),
  playbook_steps: fc.constant(null),
});

/** Generate an arbitrary FilterState */
const filterStateArb: fc.Arbitrary<FilterState> = fc.record({
  activePill: fc.constantFrom('all', 'overdue', 'today', 'upcoming', 'snoozed') as fc.Arbitrary<
    FilterState['activePill']
  >,
  playbookFilter: fc.constantFrom(
    '',
    'Welcome Sequence',
    'Re-engagement',
    'Property Alert',
    'Follow-up',
    'Anniversary'
  ),
  consentFilter: fc.constantFrom('', 'green', 'yellow', 'red') as fc.Arbitrary<
    FilterState['consentFilter']
  >,
  myTasksOnly: fc.boolean(),
});

// --- Reference predicate: independently checks if a task satisfies all active filters ---

function taskSatisfiesAllPredicates(task: EnrichedNurtureTask, filters: FilterState): boolean {
  // Pill tab filter
  if (filters.activePill !== 'all') {
    if (filters.activePill === 'snoozed') {
      if (task.status !== 'snoozed') return false;
    } else {
      // For urgency pills, exclude snoozed tasks
      if (task.status === 'snoozed') return false;
      const urgency = classifyUrgency(task.due_at);
      if (urgency !== filters.activePill) return false;
    }
  }

  // Playbook filter
  if (filters.playbookFilter && task.playbook_name !== filters.playbookFilter) {
    return false;
  }

  // Consent filter
  if (filters.consentFilter && task.consent_badge !== filters.consentFilter) {
    return false;
  }

  // myTasksOnly is handled at the component level (not by filterTasks utility)
  // so we don't check it here

  return true;
}

// --- Property Tests ---

/**
 * Feature: nurture-page-redesign, Property 2: Filter AND logic produces correct subset
 *
 * **Validates: Requirements 3.10, 3.11**
 *
 * For any array of tasks and any combination of filter state (pill tab, playbook filter,
 * consent filter, my-tasks toggle), every task in the filterTasks output SHALL satisfy
 * ALL active filter predicates simultaneously, and no task satisfying all predicates
 * SHALL be excluded from the output.
 */
describe('Feature: nurture-page-redesign, Property 2: Filter AND logic produces correct subset', () => {
  it('every task in the output satisfies ALL active filter predicates (soundness)', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 0, maxLength: 30 }),
        filterStateArb,
        (tasks, filters) => {
          const result = filterTasks(tasks, filters);

          for (const task of result) {
            expect(taskSatisfiesAllPredicates(task, filters)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no task satisfying all predicates is excluded from the output (completeness)', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 0, maxLength: 30 }),
        filterStateArb,
        (tasks, filters) => {
          const result = filterTasks(tasks, filters);
          const resultIds = new Set(result.map((t) => t.id));

          for (const task of tasks) {
            if (taskSatisfiesAllPredicates(task, filters)) {
              expect(resultIds.has(task.id)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('output is always a subset of the input (no new tasks introduced)', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 0, maxLength: 30 }),
        filterStateArb,
        (tasks, filters) => {
          const result = filterTasks(tasks, filters);
          const inputIds = new Set(tasks.map((t) => t.id));

          for (const task of result) {
            expect(inputIds.has(task.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('output length is at most the input length', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 0, maxLength: 30 }),
        filterStateArb,
        (tasks, filters) => {
          const result = filterTasks(tasks, filters);
          expect(result.length).toBeLessThanOrEqual(tasks.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('with "all" pill and no other filters active, all tasks pass through', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 0, maxLength: 30 }),
        (tasks) => {
          const noFilters: FilterState = {
            activePill: 'all',
            playbookFilter: '',
            consentFilter: '',
            myTasksOnly: false,
          };
          const result = filterTasks(tasks, noFilters);
          expect(result.length).toBe(tasks.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pill filter "snoozed" only includes tasks with status "snoozed"', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 1, maxLength: 30 }),
        (tasks) => {
          const snoozedFilter: FilterState = {
            activePill: 'snoozed',
            playbookFilter: '',
            consentFilter: '',
            myTasksOnly: false,
          };
          const result = filterTasks(tasks, snoozedFilter);

          for (const task of result) {
            expect(task.status).toBe('snoozed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('urgency pill filters exclude snoozed tasks', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 1, maxLength: 30 }),
        fc.constantFrom('overdue', 'today', 'upcoming') as fc.Arbitrary<'overdue' | 'today' | 'upcoming'>,
        (tasks, pill) => {
          const filters: FilterState = {
            activePill: pill,
            playbookFilter: '',
            consentFilter: '',
            myTasksOnly: false,
          };
          const result = filterTasks(tasks, filters);

          for (const task of result) {
            expect(task.status).not.toBe('snoozed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('playbook filter only includes tasks matching the specified playbook', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 1, maxLength: 30 }),
        playbookNameArb,
        (tasks, playbook) => {
          const filters: FilterState = {
            activePill: 'all',
            playbookFilter: playbook,
            consentFilter: '',
            myTasksOnly: false,
          };
          const result = filterTasks(tasks, filters);

          for (const task of result) {
            expect(task.playbook_name).toBe(playbook);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('consent filter only includes tasks matching the specified consent badge', () => {
    fc.assert(
      fc.property(
        fc.array(enrichedTaskArb, { minLength: 1, maxLength: 30 }),
        fc.constantFrom('green', 'yellow', 'red') as fc.Arbitrary<'green' | 'yellow' | 'red'>,
        (tasks, consent) => {
          const filters: FilterState = {
            activePill: 'all',
            playbookFilter: '',
            consentFilter: consent,
            myTasksOnly: false,
          };
          const result = filterTasks(tasks, filters);

          for (const task of result) {
            expect(task.consent_badge).toBe(consent);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
