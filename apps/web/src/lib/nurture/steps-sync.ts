import type { PlaybookStep } from './types';

/**
 * Represents a row in the playbook_steps table after synchronisation.
 */
export interface PlaybookStepRow {
  id: string;
  playbook_id: string;
  offset_days: number;
  channel: string;
  template_id: string | null;
  create_task: boolean;
  title: string;
  sort_order: number;
}

/**
 * Synchronise steps_json array into playbook_steps rows.
 *
 * For a given playbook_id and steps_json array, produces the exact set of
 * playbook_steps rows that should exist in the database. Each row maps 1:1
 * to a step in the JSON array, with sort_order reflecting the array index.
 *
 * Requirements 15.2, 15.3: The Nurture_System SHALL maintain a flattened
 * playbook_steps view and synchronise it whenever steps_json is created or updated.
 */
export function syncSteps(playbookId: string, stepsJson: PlaybookStep[]): PlaybookStepRow[] {
  return stepsJson.map((step, index) => ({
    id: step.id,
    playbook_id: playbookId,
    offset_days: step.offset_days,
    channel: step.channel,
    template_id: step.template_id,
    create_task: step.create_task,
    title: step.title,
    sort_order: index,
  }));
}
