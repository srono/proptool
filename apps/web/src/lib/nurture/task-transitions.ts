import { type TaskStatus } from './types';

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['done', 'skipped', 'snoozed'],
  snoozed: ['pending'],
  done: [],
  skipped: [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateSnoozeDate(dueAt: Date): { valid: boolean; error?: string } {
  const now = new Date();
  const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  if (dueAt < minDate) return { valid: false, error: 'Snooze date must be at least 1 day in the future' };
  if (dueAt > maxDate) return { valid: false, error: 'Snooze date must be within 90 days' };
  return { valid: true };
}

export { VALID_TRANSITIONS };
