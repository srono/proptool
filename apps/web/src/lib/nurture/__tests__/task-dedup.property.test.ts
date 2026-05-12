import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { deduplicateTasks, TaskGenerationAttempt } from '../task-dedup';

// --- Generators ---

/** Generate a UUID-like string for IDs */
const uuidArb = fc.uuid();

/** Generate a step_id that is either a UUID or null (for ad-hoc tasks) */
const stepIdArb: fc.Arbitrary<string | null> = fc.oneof(
  { weight: 3, arbitrary: uuidArb },
  { weight: 1, arbitrary: fc.constant(null) }
);

/** Generate a task channel */
const channelArb = fc.constantFrom('whatsapp', 'email', 'call', 'note');

/** Generate a task status */
const statusArb = fc.constantFrom('pending', 'done', 'skipped', 'snoozed');

/** Generate a due_at ISO date string */
const dueAtArb = fc.integer({ min: 0, max: 1095 }).map(offset => {
  const base = new Date('2024-01-01T00:00:00.000Z');
  base.setDate(base.getDate() + offset);
  return base.toISOString();
});

/** Generate a single task generation attempt */
const taskAttemptArb: fc.Arbitrary<TaskGenerationAttempt> = fc.record({
  contact_id: uuidArb,
  playbook_id: uuidArb,
  step_id: stepIdArb,
  assigned_to: uuidArb,
  due_at: dueAtArb,
  status: statusArb,
  channel: channelArb,
});

/**
 * Generate a sequence of task generation attempts with controlled duplication.
 * Uses a small pool of IDs to increase the chance of collisions.
 */
const taskAttemptSequenceWithDupsArb: fc.Arbitrary<TaskGenerationAttempt[]> = fc
  .tuple(
    fc.array(uuidArb, { minLength: 1, maxLength: 5 }),  // contact pool
    fc.array(uuidArb, { minLength: 1, maxLength: 3 }),  // playbook pool
    fc.array(uuidArb, { minLength: 1, maxLength: 5 }),  // step pool
  )
  .chain(([contacts, playbooks, steps]) => {
    const attemptFromPoolArb: fc.Arbitrary<TaskGenerationAttempt> = fc.record({
      contact_id: fc.constantFrom(...contacts),
      playbook_id: fc.constantFrom(...playbooks),
      step_id: fc.oneof(
        { weight: 4, arbitrary: fc.constantFrom(...steps) },
        { weight: 1, arbitrary: fc.constant(null) }
      ),
      assigned_to: uuidArb,
      due_at: dueAtArb,
      status: statusArb,
      channel: channelArb,
    });
    return fc.array(attemptFromPoolArb, { minLength: 1, maxLength: 30 });
  });

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 7: Task Deduplication
 *
 * **Validates: Requirements 4.6, 14.4**
 *
 * For any sequence of Task_Generator runs, at most one nurture_task SHALL exist
 * for any given combination of (contact_id, playbook_id, step_id) where step_id
 * is not null. Running the generator multiple times with the same inputs SHALL NOT
 * create duplicate tasks.
 */
describe('Feature: nurture-playbooks, Property 7: Task Deduplication', () => {
  it('at most one task per (contact_id, playbook_id, step_id) where step_id is not null', () => {
    fc.assert(
      fc.property(taskAttemptSequenceWithDupsArb, (attempts) => {
        const result = deduplicateTasks(attempts);

        // Count occurrences of each (contact_id, playbook_id, step_id) where step_id is not null
        const keyCounts = new Map<string, number>();
        for (const task of result) {
          if (task.step_id !== null) {
            const key = `${task.contact_id}|${task.playbook_id}|${task.step_id}`;
            keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
          }
        }

        // Verify at most one task per key
        for (const [key, count] of keyCounts) {
          expect(count).toBe(1);
        }
      }),
      { numRuns: 500 }
    );
  });

  it('running deduplication multiple times with the same inputs produces the same result (idempotent)', () => {
    fc.assert(
      fc.property(taskAttemptSequenceWithDupsArb, (attempts) => {
        const firstRun = deduplicateTasks(attempts);
        // Simulate running the generator again with the same + new attempts
        const secondRun = deduplicateTasks([...firstRun, ...attempts]);

        // The second run should produce the same set of non-null step_id tasks
        const firstKeys = new Set(
          firstRun
            .filter(t => t.step_id !== null)
            .map(t => `${t.contact_id}|${t.playbook_id}|${t.step_id}`)
        );
        const secondKeys = new Set(
          secondRun
            .filter(t => t.step_id !== null)
            .map(t => `${t.contact_id}|${t.playbook_id}|${t.step_id}`)
        );

        // Same unique keys in both runs
        expect(secondKeys).toEqual(firstKeys);
      }),
      { numRuns: 200 }
    );
  });

  it('ad-hoc tasks (step_id = null) are never deduplicated', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            contact_id: fc.constantFrom('c1', 'c2'),
            playbook_id: fc.constantFrom('p1', 'p2'),
            step_id: fc.constant(null),
            assigned_to: uuidArb,
            due_at: dueAtArb,
            status: statusArb,
            channel: channelArb,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (attempts) => {
          const result = deduplicateTasks(attempts);
          // All ad-hoc tasks should be preserved
          expect(result.length).toBe(attempts.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('first occurrence wins for duplicate (contact_id, playbook_id, step_id)', () => {
    fc.assert(
      fc.property(taskAttemptSequenceWithDupsArb, (attempts) => {
        const result = deduplicateTasks(attempts);

        // For each non-null step_id task in the result, verify it matches the first
        // occurrence in the input sequence
        for (const task of result) {
          if (task.step_id !== null) {
            const firstInInput = attempts.find(
              a =>
                a.contact_id === task.contact_id &&
                a.playbook_id === task.playbook_id &&
                a.step_id === task.step_id
            );
            expect(task).toEqual(firstInInput);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  it('result is a subset of the input attempts', () => {
    fc.assert(
      fc.property(taskAttemptSequenceWithDupsArb, (attempts) => {
        const result = deduplicateTasks(attempts);

        // Every task in the result must exist in the input
        for (const task of result) {
          expect(attempts).toContainEqual(task);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('result length is at most the input length', () => {
    fc.assert(
      fc.property(taskAttemptSequenceWithDupsArb, (attempts) => {
        const result = deduplicateTasks(attempts);
        expect(result.length).toBeLessThanOrEqual(attempts.length);
      }),
      { numRuns: 200 }
    );
  });

  it('different step_ids for same (contact_id, playbook_id) are kept separately', () => {
    fc.assert(
      fc.property(
        fc.tuple(uuidArb, uuidArb, fc.array(uuidArb, { minLength: 2, maxLength: 10 })),
        ([contactId, playbookId, stepIds]) => {
          // Ensure unique step IDs
          const uniqueStepIds = [...new Set(stepIds)];
          if (uniqueStepIds.length < 2) return; // Need at least 2 distinct step IDs

          const attempts: TaskGenerationAttempt[] = uniqueStepIds.map(stepId => ({
            contact_id: contactId,
            playbook_id: playbookId,
            step_id: stepId,
            assigned_to: 'agent-1',
            due_at: '2024-06-15T00:00:00.000Z',
            status: 'pending',
            channel: 'whatsapp',
          }));

          const result = deduplicateTasks(attempts);
          // All should be kept since they have different step_ids
          expect(result.length).toBe(uniqueStepIds.length);
        }
      ),
      { numRuns: 200 }
    );
  });
});
