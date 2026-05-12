/**
 * Task Deduplication Logic
 *
 * Simulates the database-level unique constraint on (contact_id, playbook_id, step_id)
 * WHERE step_id IS NOT NULL. This ensures that for any sequence of task generation
 * attempts, at most one nurture_task exists per (contact_id, playbook_id, step_id)
 * combination when step_id is not null.
 *
 * Ad-hoc tasks (step_id = null) are NOT subject to deduplication and may have
 * multiple entries for the same contact and playbook.
 */

export interface TaskGenerationAttempt {
  contact_id: string;
  playbook_id: string;
  step_id: string | null;
  assigned_to: string;
  due_at: string;
  status: string;
  channel: string;
}

/**
 * Deduplicates a sequence of task generation attempts.
 *
 * For tasks where step_id is not null, only the first occurrence of each
 * (contact_id, playbook_id, step_id) combination is kept (simulating
 * INSERT ... ON CONFLICT DO NOTHING behavior).
 *
 * For tasks where step_id is null (ad-hoc tasks), all entries are kept
 * since the unique constraint does not apply.
 *
 * @param attempts - The sequence of task generation attempts in order
 * @returns The deduplicated set of tasks that would be stored
 */
export function deduplicateTasks(attempts: TaskGenerationAttempt[]): TaskGenerationAttempt[] {
  const seen = new Set<string>();
  const result: TaskGenerationAttempt[] = [];

  for (const attempt of attempts) {
    if (attempt.step_id === null) {
      // Ad-hoc tasks are never deduplicated
      result.push(attempt);
    } else {
      // Build composite key for deduplication
      const key = `${attempt.contact_id}|${attempt.playbook_id}|${attempt.step_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(attempt);
      }
      // Duplicate — ignored (ON CONFLICT DO NOTHING)
    }
  }

  return result;
}
