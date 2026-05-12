import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { canDeletePlaybook } from '../deletion-guard';
import type { TaskStatus } from '../types';

// --- Constants ---

const ALL_STATUSES: TaskStatus[] = ['pending', 'done', 'skipped', 'snoozed'];
const BLOCKING_STATUSES: TaskStatus[] = ['pending', 'snoozed'];
const TERMINAL_STATUSES: TaskStatus[] = ['done', 'skipped'];

// --- Generators ---

/** Generate an arbitrary TaskStatus */
const taskStatusArb: fc.Arbitrary<TaskStatus> = fc.constantFrom(...ALL_STATUSES);

/** Generate an arbitrary array of task statuses (0 to 50 tasks) */
const taskStatusArrayArb: fc.Arbitrary<TaskStatus[]> = fc.array(taskStatusArb, {
  minLength: 0,
  maxLength: 50,
});

/** Generate an array containing only terminal statuses */
const terminalOnlyArrayArb: fc.Arbitrary<TaskStatus[]> = fc.array(
  fc.constantFrom(...TERMINAL_STATUSES),
  { minLength: 1, maxLength: 50 }
);

/** Generate an array that contains at least one blocking status */
const arrayWithBlockingArb: fc.Arbitrary<TaskStatus[]> = fc
  .tuple(
    fc.array(taskStatusArb, { minLength: 0, maxLength: 49 }),
    fc.constantFrom(...BLOCKING_STATUSES)
  )
  .map(([rest, blocking]) => {
    const insertIdx = Math.floor(Math.random() * (rest.length + 1));
    const result = [...rest];
    result.splice(insertIdx, 0, blocking);
    return result;
  });

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 17: Playbook Deletion Guard
 *
 * **Validates: Requirements 2.11, 14.7**
 *
 * For any playbook that has at least one associated nurture_task with status
 * "pending" or "snoozed", deletion of that playbook SHALL be rejected.
 */
describe('Feature: nurture-playbooks, Property 17: Playbook Deletion Guard', () => {
  it('deletion rejected iff any task has status pending or snoozed', () => {
    fc.assert(
      fc.property(taskStatusArrayArb, (statuses) => {
        const result = canDeletePlaybook(statuses);
        const hasBlocking = statuses.some(
          (s) => s === 'pending' || s === 'snoozed'
        );
        expect(result).toBe(!hasBlocking);
      }),
      { numRuns: 200 }
    );
  });

  it('allows deletion when all tasks are in terminal states (done or skipped)', () => {
    fc.assert(
      fc.property(terminalOnlyArrayArb, (statuses) => {
        expect(canDeletePlaybook(statuses)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects deletion when at least one task is pending or snoozed', () => {
    fc.assert(
      fc.property(arrayWithBlockingArb, (statuses) => {
        expect(canDeletePlaybook(statuses)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('allows deletion when there are no tasks (empty array)', () => {
    expect(canDeletePlaybook([])).toBe(true);
  });

  it('a single pending task blocks deletion', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...TERMINAL_STATUSES), { minLength: 0, maxLength: 49 }),
        (terminalStatuses) => {
          const statuses: TaskStatus[] = [...terminalStatuses, 'pending'];
          expect(canDeletePlaybook(statuses)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('a single snoozed task blocks deletion', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...TERMINAL_STATUSES), { minLength: 0, maxLength: 49 }),
        (terminalStatuses) => {
          const statuses: TaskStatus[] = [...terminalStatuses, 'snoozed'];
          expect(canDeletePlaybook(statuses)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
