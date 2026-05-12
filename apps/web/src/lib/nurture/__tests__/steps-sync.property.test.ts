import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { syncSteps } from '../steps-sync';
import { STEP_CHANNELS } from '../types';
import type { PlaybookStep, StepChannel } from '../types';

// Feature: nurture-playbooks, Property 16: Playbook Steps Synchronisation Round-Trip

// --- Generators ---

/** Generate a valid step channel */
const validChannelArb: fc.Arbitrary<StepChannel> = fc.constantFrom(...STEP_CHANNELS);

/** Generate a valid PlaybookStep */
const validStepArb: fc.Arbitrary<PlaybookStep> = fc.record({
  id: fc.uuid(),
  offset_days: fc.integer({ min: -365, max: 365 }),
  channel: validChannelArb,
  template_id: fc.oneof(fc.uuid(), fc.constant(null)),
  create_task: fc.boolean(),
  title: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.length >= 1),
});

/** Generate a valid steps_json array (1-50 steps) */
const validStepsJsonArb = fc.array(validStepArb, { minLength: 1, maxLength: 50 });

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 16: Playbook Steps Synchronisation Round-Trip
 *
 * **Validates: Requirements 15.2, 15.3**
 *
 * For any valid steps_json array written to a playbook, after synchronisation the
 * playbook_steps table rows for that playbook SHALL contain exactly one row per step
 * in the JSON, with matching field values (offset_days, channel, template_id, create_task,
 * title) and correct sort_order reflecting the array index.
 */
describe('Feature: nurture-playbooks, Property 16: Playbook Steps Synchronisation Round-Trip', () => {
  it('produces exactly one row per step in the input array', () => {
    fc.assert(
      fc.property(fc.uuid(), validStepsJsonArb, (playbookId, stepsJson) => {
        const rows = syncSteps(playbookId, stepsJson);
        expect(rows.length).toBe(stepsJson.length);
      }),
      { numRuns: 100 }
    );
  });

  it('each row has the correct playbook_id', () => {
    fc.assert(
      fc.property(fc.uuid(), validStepsJsonArb, (playbookId, stepsJson) => {
        const rows = syncSteps(playbookId, stepsJson);
        for (const row of rows) {
          expect(row.playbook_id).toBe(playbookId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('each row has sort_order equal to its array index', () => {
    fc.assert(
      fc.property(fc.uuid(), validStepsJsonArb, (playbookId, stepsJson) => {
        const rows = syncSteps(playbookId, stepsJson);
        for (let i = 0; i < rows.length; i++) {
          expect(rows[i].sort_order).toBe(i);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('each row field values match the corresponding step in steps_json', () => {
    fc.assert(
      fc.property(fc.uuid(), validStepsJsonArb, (playbookId, stepsJson) => {
        const rows = syncSteps(playbookId, stepsJson);

        for (let i = 0; i < stepsJson.length; i++) {
          const step = stepsJson[i];
          const row = rows[i];

          expect(row.id).toBe(step.id);
          expect(row.offset_days).toBe(step.offset_days);
          expect(row.channel).toBe(step.channel);
          expect(row.template_id).toBe(step.template_id);
          expect(row.create_task).toBe(step.create_task);
          expect(row.title).toBe(step.title);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sort_order values are consecutive integers starting from 0', () => {
    fc.assert(
      fc.property(fc.uuid(), validStepsJsonArb, (playbookId, stepsJson) => {
        const rows = syncSteps(playbookId, stepsJson);
        const sortOrders = rows.map((r) => r.sort_order);
        const expected = Array.from({ length: stepsJson.length }, (_, i) => i);
        expect(sortOrders).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('round-trip: synced rows can reconstruct the original steps_json (minus sort_order)', () => {
    fc.assert(
      fc.property(fc.uuid(), validStepsJsonArb, (playbookId, stepsJson) => {
        const rows = syncSteps(playbookId, stepsJson);

        // Reconstruct steps from rows (stripping playbook_id and sort_order)
        const reconstructed: PlaybookStep[] = rows.map((row) => ({
          id: row.id,
          offset_days: row.offset_days,
          channel: row.channel as StepChannel,
          template_id: row.template_id,
          create_task: row.create_task,
          title: row.title,
        }));

        expect(reconstructed).toEqual(stepsJson);
      }),
      { numRuns: 100 }
    );
  });
});
