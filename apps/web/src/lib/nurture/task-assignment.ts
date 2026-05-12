/**
 * Task Assignment Priority Resolution
 *
 * Determines who a nurture task should be assigned to based on the priority rule:
 * - If the contact has a lead with an assigned_to value, use that (lead assignment takes precedence)
 * - Otherwise, fall back to the playbook's created_by value
 *
 * This mirrors the logic in the Task Generator Edge Function.
 */

/**
 * Resolves the assigned_to value for a nurture task.
 *
 * @param leadAssignedTo - The assigned_to value from the contact's lead (null if no lead assignment exists)
 * @param playbookCreatedBy - The created_by value from the playbook
 * @returns The user ID that the task should be assigned to
 */
export function resolveTaskAssignment(
  leadAssignedTo: string | null,
  playbookCreatedBy: string
): string {
  return leadAssignedTo ?? playbookCreatedBy;
}
