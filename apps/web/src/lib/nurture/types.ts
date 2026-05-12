import { z } from 'zod';

// ─── Channel Enums ───────────────────────────────────────────────────────────

export const STEP_CHANNELS = ['whatsapp', 'email', 'call', 'task_only'] as const;
export type StepChannel = (typeof STEP_CHANNELS)[number];

export const TASK_CHANNELS = ['whatsapp', 'email', 'call', 'note'] as const;
export type TaskChannel = (typeof TASK_CHANNELS)[number];

export const TEMPLATE_CHANNELS = ['whatsapp', 'email'] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

// ─── Task Status ─────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'done' | 'skipped' | 'snoozed';

// ─── Filter Condition ────────────────────────────────────────────────────────

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'before' | 'after' | 'between';
  value: string | string[] | { from: string; to: string };
  source: 'contact' | 'lead';
}

// ─── Segment Definition ──────────────────────────────────────────────────────

export interface SegmentDefinition {
  conditions: FilterCondition[];
}

// ─── Playbook Step ───────────────────────────────────────────────────────────

export interface PlaybookStep {
  id: string;
  offset_days: number;
  channel: StepChannel;
  template_id: string | null;
  create_task: boolean;
  title: string;
}

// ─── Create Playbook Request ─────────────────────────────────────────────────

export interface CreatePlaybookRequest {
  name: string;
  description: string;
  segment_definition_json: SegmentDefinition;
  trigger_field: string;
  steps_json: PlaybookStep[];
  target_ad_purpose?: string;
}

// ─── Create Template Request ─────────────────────────────────────────────────

export interface CreateTemplateRequest {
  name: string;
  channel: TemplateChannel;
  body: string;
}

// ─── Nurture Task Row ────────────────────────────────────────────────────────

export interface NurtureTaskRow {
  id: string;
  contact_id: string;
  contact_name: string;
  owned_property_summary: string;
  segment_tags: string[];
  next_action_title: string;
  due_at: string;
  last_activity_date: string | null;
  consent_badge: 'green' | 'yellow' | 'red';
  channel: TaskChannel;
  playbook_name: string;
  status: TaskStatus;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const filterConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'in', 'before', 'after', 'between']),
  value: z.union([
    z.string(),
    z.array(z.string()),
    z.object({ from: z.string(), to: z.string() }),
  ]),
  source: z.enum(['contact', 'lead']),
});

export const segmentDefinitionSchema = z.object({
  conditions: z.array(filterConditionSchema).max(10),
});

export const playbookStepSchema = z.object({
  id: z.string().min(1),
  offset_days: z.number().int().min(-365).max(365),
  channel: z.enum(STEP_CHANNELS),
  template_id: z.string().nullable(),
  create_task: z.boolean(),
  title: z.string().min(1).max(80),
});

export const createPlaybookSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  segment_definition_json: segmentDefinitionSchema,
  trigger_field: z.string().min(1),
  steps_json: z.array(playbookStepSchema).min(1).max(50),
  target_ad_purpose: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  channel: z.enum(TEMPLATE_CHANNELS),
  body: z.string().min(1).max(2000),
});

export const updatePlaybookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  segment_definition_json: segmentDefinitionSchema.optional(),
  trigger_field: z.string().min(1).optional(),
  steps_json: z.array(playbookStepSchema).min(1).max(50).optional(),
  target_ad_purpose: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export const taskStatusUpdateSchema = z.object({
  status: z.enum(['done', 'skipped', 'snoozed']),
  due_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
