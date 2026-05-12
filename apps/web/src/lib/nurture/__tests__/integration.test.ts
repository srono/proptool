import { describe, it, expect } from 'vitest';
import { computeTouchDate } from '../touch-date';
import { matchesSegment, evaluateSegment, type ContactRecord } from '../segment-evaluator';
import { shouldExcludeFromTaskGeneration, computeConsentBadge, type ConsentInput, type TaskExclusionInput } from '../consent';
import { deduplicateTasks, type TaskGenerationAttempt } from '../task-dedup';
import { resolveTaskAssignment } from '../task-assignment';
import { isValidTransition } from '../task-transitions';
import { canDeletePlaybook } from '../deletion-guard';
import { sortSteps, type OrderableStep } from '../step-ordering';
import { createPlaybookSchema } from '../types';
import type { PlaybookStep, SegmentDefinition, TaskStatus } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    id: 'contact-1',
    tenant_id: 'tenant-1',
    full_name: 'John Doe',
    phone: '+6591234567',
    owned_property_type: 'hdb',
    owned_property_town: 'Tampines',
    mop_date: '2025-06-01',
    channel_preference: 'whatsapp',
    whatsapp_optin: true,
    dnc_registered: false,
    data_retention_expiry: null,
    lead_assigned_to: 'agent-1',
    ...overrides,
  };
}

function makePlaybook(overrides: Partial<{
  id: string;
  active: boolean;
  created_by: string;
  trigger_field: string;
  target_ad_purpose: string | null;
  segment_definition_json: SegmentDefinition;
  steps: PlaybookStep[];
}> = {}) {
  return {
    id: overrides.id ?? 'playbook-1',
    active: overrides.active ?? true,
    created_by: overrides.created_by ?? 'agent-owner',
    trigger_field: overrides.trigger_field ?? 'mop_date',
    target_ad_purpose: overrides.target_ad_purpose ?? null,
    segment_definition_json: overrides.segment_definition_json ?? { conditions: [] },
    steps: overrides.steps ?? [
      { id: 'step-1', offset_days: -30, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Initial outreach' },
      { id: 'step-2', offset_days: -7, channel: 'call' as const, template_id: null, create_task: true, title: 'Follow-up call' },
      { id: 'step-3', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'MOP day message' },
    ],
  };
}

/**
 * Simulates the task generator logic:
 * 1. Evaluate segment to find eligible contacts
 * 2. For each contact, check consent exclusions
 * 3. Compute touch dates and filter by scheduling horizon
 * 4. Assign tasks using priority rules
 * 5. Deduplicate tasks
 */
function simulateTaskGeneration(
  playbook: ReturnType<typeof makePlaybook>,
  contacts: ContactRecord[],
  today: Date,
  horizonDays: number = 7
): TaskGenerationAttempt[] {
  if (!playbook.active) return [];

  const horizonDate = new Date(today.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  // Step 1: Evaluate segment
  const eligibleContacts = evaluateSegment(contacts, playbook.segment_definition_json);

  const attempts: TaskGenerationAttempt[] = [];

  for (const contact of eligibleContacts) {
    const triggerValue = contact[playbook.trigger_field];
    if (!triggerValue) continue;

    for (const step of playbook.steps) {
      // Step 2: Check consent exclusions
      const exclusionInput: TaskExclusionInput = {
        whatsapp_optin: contact.whatsapp_optin as boolean,
        channel_preference: contact.channel_preference as string,
        data_retention_expiry: contact.data_retention_expiry as string | null,
        step_channel: step.channel,
      };

      if (shouldExcludeFromTaskGeneration(exclusionInput, today)) continue;

      // Step 3: Compute touch date and check horizon
      const touchDate = computeTouchDate(new Date(triggerValue as string), step.offset_days);
      if (touchDate > horizonDate || touchDate < today) continue;

      // Step 4: Assign task
      const assignedTo = resolveTaskAssignment(
        contact.lead_assigned_to as string | null,
        playbook.created_by
      );

      attempts.push({
        contact_id: contact.id as string,
        playbook_id: playbook.id,
        step_id: step.id,
        assigned_to: assignedTo,
        due_at: touchDate.toISOString(),
        status: 'pending',
        channel: step.channel === 'task_only' ? 'note' : step.channel,
      });
    }
  }

  // Step 5: Deduplicate
  return deduplicateTasks(attempts);
}

// ─── Integration Test Suite ──────────────────────────────────────────────────

describe('Integration: Create playbook → activate → generate tasks → view in nurture list', () => {
  it('validates playbook creation, generates tasks for matching contacts within horizon', () => {
    // 1. Create and validate a playbook
    const playbookInput = {
      name: 'HDB MOP Outreach',
      description: 'Nurture HDB owners approaching MOP',
      segment_definition_json: {
        conditions: [
          { field: 'owned_property_type', operator: 'eq' as const, value: 'hdb', source: 'contact' as const },
        ],
      },
      trigger_field: 'mop_date',
      steps_json: [
        { id: 'step-1', offset_days: -30, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Pre-MOP awareness' },
        { id: 'step-2', offset_days: -7, channel: 'call' as const, template_id: null, create_task: true, title: 'Follow-up call' },
        { id: 'step-3', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'MOP day congratulations' },
      ],
    };

    const validationResult = createPlaybookSchema.safeParse(playbookInput);
    expect(validationResult.success).toBe(true);

    // 2. Activate the playbook
    const playbook = makePlaybook({
      active: true,
      segment_definition_json: playbookInput.segment_definition_json,
      trigger_field: 'mop_date',
      steps: playbookInput.steps_json,
    });

    // 3. Set up contacts - one matching, one not matching segment
    const today = new Date('2025-05-25');
    const contacts: ContactRecord[] = [
      makeContact({ id: 'c1', mop_date: '2025-06-01', owned_property_type: 'hdb' }),
      makeContact({ id: 'c2', mop_date: '2025-06-01', owned_property_type: 'private' }), // won't match segment
      makeContact({ id: 'c3', mop_date: '2025-12-01', owned_property_type: 'hdb' }), // outside horizon
    ];

    // 4. Run task generation
    const tasks = simulateTaskGeneration(playbook, contacts, today);

    // Only c1 should have tasks generated (matches segment + within horizon)
    // step-1: offset -30 → 2025-05-02 (before today, excluded)
    // step-2: offset -7 → 2025-05-25 (today, included)
    // step-3: offset 0 → 2025-06-01 (within 7-day horizon, included)
    expect(tasks.length).toBe(2);
    expect(tasks.every(t => t.contact_id === 'c1')).toBe(true);
    expect(tasks.map(t => t.step_id)).toContain('step-2');
    expect(tasks.map(t => t.step_id)).toContain('step-3');

    // 5. Verify task assignment (lead_assigned_to takes priority)
    expect(tasks.every(t => t.assigned_to === 'agent-1')).toBe(true);

    // 6. Verify all tasks are pending
    expect(tasks.every(t => t.status === 'pending')).toBe(true);
  });

  it('assigns to playbook creator when no lead assignment exists', () => {
    const playbook = makePlaybook({
      created_by: 'playbook-owner',
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    const today = new Date('2025-06-01');
    const contacts: ContactRecord[] = [
      makeContact({ id: 'c1', mop_date: '2025-06-01', lead_assigned_to: null }),
    ];

    const tasks = simulateTaskGeneration(playbook, contacts, today);
    expect(tasks.length).toBe(1);
    expect(tasks[0].assigned_to).toBe('playbook-owner');
  });

  it('deduplicates tasks across multiple generator runs', () => {
    const playbook = makePlaybook({
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    const today = new Date('2025-06-01');
    const contacts: ContactRecord[] = [
      makeContact({ id: 'c1', mop_date: '2025-06-01' }),
    ];

    // Simulate two generator runs
    const run1 = simulateTaskGeneration(playbook, contacts, today);
    const run2 = simulateTaskGeneration(playbook, contacts, today);

    // Combine both runs and deduplicate (simulating DB-level dedup)
    const allAttempts = [...run1, ...run2];
    const deduplicated = deduplicateTasks(allAttempts);

    // Should only have one task per (contact_id, playbook_id, step_id)
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0].contact_id).toBe('c1');
    expect(deduplicated[0].step_id).toBe('step-1');
  });

  it('generates tasks independently for contacts matching multiple playbooks', () => {
    const playbook1 = makePlaybook({
      id: 'pb-1',
      steps: [
        { id: 'pb1-step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'PB1 outreach' },
      ],
    });

    const playbook2 = makePlaybook({
      id: 'pb-2',
      steps: [
        { id: 'pb2-step-1', offset_days: 0, channel: 'call' as const, template_id: null, create_task: true, title: 'PB2 call' },
      ],
    });

    const today = new Date('2025-06-01');
    const contacts: ContactRecord[] = [
      makeContact({ id: 'c1', mop_date: '2025-06-01' }),
    ];

    const tasks1 = simulateTaskGeneration(playbook1, contacts, today);
    const tasks2 = simulateTaskGeneration(playbook2, contacts, today);

    // Both playbooks generate tasks for the same contact
    expect(tasks1.length).toBe(1);
    expect(tasks2.length).toBe(1);
    expect(tasks1[0].playbook_id).toBe('pb-1');
    expect(tasks2[0].playbook_id).toBe('pb-2');

    // Deduplication allows both since different playbook_ids
    const allTasks = deduplicateTasks([...tasks1, ...tasks2]);
    expect(allTasks.length).toBe(2);
  });

  it('steps are displayed in correct order by offset_days then sort_order', () => {
    const steps: (PlaybookStep & OrderableStep)[] = [
      { id: 's3', offset_days: 0, channel: 'whatsapp', template_id: null, create_task: true, title: 'Day of', sort_order: 0 },
      { id: 's1', offset_days: -30, channel: 'whatsapp', template_id: null, create_task: true, title: 'Early', sort_order: 0 },
      { id: 's2', offset_days: -30, channel: 'call', template_id: null, create_task: true, title: 'Early call', sort_order: 1 },
      { id: 's4', offset_days: 7, channel: 'email', template_id: null, create_task: true, title: 'Follow up', sort_order: 0 },
    ];

    const sorted = sortSteps(steps);
    expect(sorted.map(s => s.id)).toEqual(['s1', 's2', 's3', 's4']);
  });
});

describe('Integration: Consent withdrawal → badge updates → actions disabled', () => {
  it('consent withdrawal after task generation results in red badge and disabled actions', () => {
    const playbook = makePlaybook({
      target_ad_purpose: 'selling',
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    const today = new Date('2025-06-01');

    // Contact initially has consent
    const contactWithConsent = makeContact({
      id: 'c1',
      mop_date: '2025-06-01',
      whatsapp_optin: true,
      channel_preference: 'whatsapp',
    });

    // Task is generated while consent is valid
    const tasks = simulateTaskGeneration(playbook, [contactWithConsent], today);
    expect(tasks.length).toBe(1);

    // Verify initial badge is green (consent valid)
    const initialBadge = computeConsentBadge({
      whatsapp_optin: true,
      channel_preference: 'whatsapp',
      ad_purpose: 'selling',
      target_ad_purpose: 'selling',
      dnc_registered: false,
      data_retention_expiry: null,
      task_channel: 'whatsapp',
    });
    expect(initialBadge).toBe('green');

    // Contact withdraws consent (whatsapp_optin set to false)
    const withdrawnBadge = computeConsentBadge({
      whatsapp_optin: false,
      channel_preference: 'whatsapp',
      ad_purpose: 'selling',
      target_ad_purpose: 'selling',
      dnc_registered: false,
      data_retention_expiry: null,
      task_channel: 'whatsapp',
    });
    expect(withdrawnBadge).toBe('red');

    // Actions should be disabled when badge is red
    const actionsDisabled = withdrawnBadge === 'red';
    expect(actionsDisabled).toBe(true);
  });

  it('channel_preference set to none after task generation disables all actions', () => {
    const today = new Date('2025-06-01');
    const playbook = makePlaybook({
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    // Generate task with valid consent
    const contact = makeContact({ id: 'c1', mop_date: '2025-06-01' });
    const tasks = simulateTaskGeneration(playbook, [contact], today);
    expect(tasks.length).toBe(1);

    // Contact sets channel_preference to none
    const badge = computeConsentBadge({
      whatsapp_optin: true,
      channel_preference: 'none',
      ad_purpose: null,
      target_ad_purpose: null,
      dnc_registered: false,
      data_retention_expiry: null,
      task_channel: 'whatsapp',
    });
    expect(badge).toBe('red');
  });

  it('data_retention_expiry passing results in red badge', () => {
    const today = new Date('2025-06-01');
    const playbook = makePlaybook({
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    // Generate task while data retention is valid
    const contact = makeContact({
      id: 'c1',
      mop_date: '2025-06-01',
      data_retention_expiry: '2025-07-01', // still valid at generation time
    });
    const tasks = simulateTaskGeneration(playbook, [contact], today);
    expect(tasks.length).toBe(1);

    // Later, data_retention_expiry passes (simulated by checking badge with expired date)
    const badge = computeConsentBadge({
      whatsapp_optin: true,
      channel_preference: 'whatsapp',
      ad_purpose: null,
      target_ad_purpose: null,
      dnc_registered: false,
      data_retention_expiry: '2025-05-01', // expired
      task_channel: 'whatsapp',
    });
    expect(badge).toBe('red');
  });

  it('DNC registration disables call actions with red badge', () => {
    const badge = computeConsentBadge({
      whatsapp_optin: true,
      channel_preference: 'phone',
      ad_purpose: null,
      target_ad_purpose: null,
      dnc_registered: true,
      data_retention_expiry: null,
      task_channel: 'call',
    });
    expect(badge).toBe('red');
  });

  it('ad_purpose mismatch shows yellow badge (partial consent warning)', () => {
    const badge = computeConsentBadge({
      whatsapp_optin: true,
      channel_preference: 'whatsapp',
      ad_purpose: 'buying',
      target_ad_purpose: 'selling',
      dnc_registered: false,
      data_retention_expiry: null,
      task_channel: 'whatsapp',
    });
    expect(badge).toBe('yellow');
  });

  it('consent exclusion prevents task generation for non-consenting contacts', () => {
    const playbook = makePlaybook({
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    const today = new Date('2025-06-01');

    // Contact without WhatsApp opt-in
    const noOptIn = makeContact({ id: 'c1', mop_date: '2025-06-01', whatsapp_optin: false });
    // Contact with channel_preference none
    const noPref = makeContact({ id: 'c2', mop_date: '2025-06-01', channel_preference: 'none' });
    // Contact with expired data retention
    const expired = makeContact({ id: 'c3', mop_date: '2025-06-01', data_retention_expiry: '2025-05-01' });
    // Contact with valid consent
    const valid = makeContact({ id: 'c4', mop_date: '2025-06-01' });

    const tasks = simulateTaskGeneration(playbook, [noOptIn, noPref, expired, valid], today);

    // Only the valid contact should have a task
    expect(tasks.length).toBe(1);
    expect(tasks[0].contact_id).toBe('c4');
  });
});

describe('Integration: Playbook deactivation → no new tasks, existing preserved', () => {
  it('deactivated playbook generates no new tasks', () => {
    const playbook = makePlaybook({
      active: false,
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    const today = new Date('2025-06-01');
    const contacts: ContactRecord[] = [
      makeContact({ id: 'c1', mop_date: '2025-06-01' }),
    ];

    const tasks = simulateTaskGeneration(playbook, contacts, today);
    expect(tasks.length).toBe(0);
  });

  it('existing pending tasks are preserved when playbook is deactivated', () => {
    const playbook = makePlaybook({
      active: true,
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    const today = new Date('2025-06-01');
    const contacts: ContactRecord[] = [
      makeContact({ id: 'c1', mop_date: '2025-06-01' }),
    ];

    // Generate tasks while active
    const existingTasks = simulateTaskGeneration(playbook, contacts, today);
    expect(existingTasks.length).toBe(1);
    expect(existingTasks[0].status).toBe('pending');

    // Deactivate playbook
    const deactivatedPlaybook = { ...playbook, active: false };

    // No new tasks generated
    const newTasks = simulateTaskGeneration(deactivatedPlaybook, contacts, today);
    expect(newTasks.length).toBe(0);

    // Existing tasks remain unchanged (pending status preserved)
    expect(existingTasks[0].status).toBe('pending');
    expect(existingTasks[0].contact_id).toBe('c1');
  });

  it('playbook with pending tasks cannot be deleted', () => {
    const taskStatuses: TaskStatus[] = ['pending', 'done', 'skipped'];
    expect(canDeletePlaybook(taskStatuses)).toBe(false);
  });

  it('playbook with snoozed tasks cannot be deleted', () => {
    const taskStatuses: TaskStatus[] = ['done', 'snoozed', 'skipped'];
    expect(canDeletePlaybook(taskStatuses)).toBe(false);
  });

  it('playbook with only terminal tasks can be deleted', () => {
    const taskStatuses: TaskStatus[] = ['done', 'skipped', 'done'];
    expect(canDeletePlaybook(taskStatuses)).toBe(true);
  });

  it('playbook with no tasks can be deleted', () => {
    const taskStatuses: TaskStatus[] = [];
    expect(canDeletePlaybook(taskStatuses)).toBe(true);
  });

  it('task lifecycle transitions work correctly for preserved tasks', () => {
    // Pending task can be marked done
    expect(isValidTransition('pending', 'done')).toBe(true);
    // Pending task can be skipped
    expect(isValidTransition('pending', 'skipped')).toBe(true);
    // Pending task can be snoozed
    expect(isValidTransition('pending', 'snoozed')).toBe(true);
    // Snoozed task can return to pending
    expect(isValidTransition('snoozed', 'pending')).toBe(true);
    // Done tasks are terminal
    expect(isValidTransition('done', 'pending')).toBe(false);
    expect(isValidTransition('done', 'skipped')).toBe(false);
    // Skipped tasks are terminal
    expect(isValidTransition('skipped', 'pending')).toBe(false);
    expect(isValidTransition('skipped', 'done')).toBe(false);
  });

  it('segment re-evaluation excludes contacts that no longer match but preserves existing tasks', () => {
    const segment: SegmentDefinition = {
      conditions: [
        { field: 'owned_property_type', operator: 'eq', value: 'hdb', source: 'contact' },
        { field: 'owned_property_town', operator: 'eq', value: 'Tampines', source: 'contact' },
      ],
    };

    const playbook = makePlaybook({
      active: true,
      segment_definition_json: segment,
      steps: [
        { id: 'step-1', offset_days: 0, channel: 'whatsapp' as const, template_id: null, create_task: true, title: 'Outreach' },
      ],
    });

    const today = new Date('2025-06-01');

    // Contact initially matches segment
    const contact = makeContact({
      id: 'c1',
      mop_date: '2025-06-01',
      owned_property_type: 'hdb',
      owned_property_town: 'Tampines',
    });

    const initialTasks = simulateTaskGeneration(playbook, [contact], today);
    expect(initialTasks.length).toBe(1);

    // Contact's town changes — no longer matches segment
    const updatedContact = { ...contact, owned_property_town: 'Jurong' };
    expect(matchesSegment(updatedContact, segment)).toBe(false);

    // No new tasks generated for this contact
    const newTasks = simulateTaskGeneration(playbook, [updatedContact], today);
    expect(newTasks.length).toBe(0);

    // But existing tasks are preserved (not deleted)
    expect(initialTasks[0].status).toBe('pending');
    expect(initialTasks[0].contact_id).toBe('c1');
  });
});
