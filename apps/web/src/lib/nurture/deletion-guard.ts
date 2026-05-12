import type { TaskStatus } from './types';

/**
 * Determines whether a playbook can be deleted based on its associated task statuses.
 *
 * A playbook deletion is rejected if any associated nurture task has status "pending" or "snoozed".
 * Deletion is allowed only when all tasks are in terminal states ("done" or "skipped") or
 * when there are no associated tasks.
 *
 * @param taskStatuses - Array of statuses from all nurture tasks associated with the playbook
 * @returns true if deletion is allowed, false if it should be rejected
 */
export function canDeletePlaybook(taskStatuses: TaskStatus[]): boolean {
  return !taskStatuses.some(
    (status) => status === 'pending' || status === 'snoozed'
  );
}
