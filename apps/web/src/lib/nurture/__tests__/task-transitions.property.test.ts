import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidTransition } from '../task-transitions';
import type { TaskStatus } from '../types';

// --- Constants ---

const ALL_STATUSES: TaskStatus[] = ['pending', 'done', 'skipped', 'snoozed'];

const VALID_TRANSITION_SET: [TaskStatus, TaskStatus][] = [
  ['pending', 'done'],
  ['pending', 'skipped'],
  ['pending', 'snoozed'],
  ['snoozed', 'pending'],
];

// --- Generators ---

/** Generate an arbitrary TaskStatus */
const taskStatusArb: fc.Arbitrary<TaskStatus> = fc.constantFrom(...ALL_STATUSES);

/** Generate a valid (from, to) transition pair */
const validTransitionArb: fc.Arbitrary<[TaskStatus, TaskStatus]> = fc.constantFrom(
  ...VALID_TRANSITION_SET
);

/** Generate an invalid (from, to) transition pair */
const invalidTransitionArb: fc.Arbitrary<[TaskStatus, TaskStatus]> = fc
  .tuple(taskStatusArb, taskStatusArb)
  .filter(
    ([from, to]) =>
      !VALID_TRANSITION_SET.some(([vf, vt]) => vf === from && vt === to)
  );

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 9: Task Status Transitions
 *
 * **Validates: Requirements 5.1, 5.8**
 *
 * For any nurture task with a current status, a status transition SHALL succeed
 * if and only if the (from, to) pair is in the set:
 * {(pending, done), (pending, skipped), (pending, snoozed), (snoozed, pending)}.
 * All other transitions SHALL be rejected.
 */
describe('Feature: nurture-playbooks, Property 9: Task Status Transitions', () => {
  it('accepts all valid transitions', () => {
    fc.assert(
      fc.property(validTransitionArb, ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects all invalid transitions', () => {
    fc.assert(
      fc.property(invalidTransitionArb, ([from, to]) => {
        expect(isValidTransition(from, to)).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('transition succeeds iff (from, to) is in the valid set', () => {
    fc.assert(
      fc.property(taskStatusArb, taskStatusArb, (from, to) => {
        const result = isValidTransition(from, to);
        const expectedValid = VALID_TRANSITION_SET.some(
          ([vf, vt]) => vf === from && vt === to
        );
        expect(result).toBe(expectedValid);
      }),
      { numRuns: 200 }
    );
  });

  it('done is a terminal state (no transitions out)', () => {
    fc.assert(
      fc.property(taskStatusArb, (to) => {
        expect(isValidTransition('done', to)).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it('skipped is a terminal state (no transitions out)', () => {
    fc.assert(
      fc.property(taskStatusArb, (to) => {
        expect(isValidTransition('skipped', to)).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it('self-transitions are never valid', () => {
    fc.assert(
      fc.property(taskStatusArb, (status) => {
        expect(isValidTransition(status, status)).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});
