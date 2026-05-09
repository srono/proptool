import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createAnnouncements } from '../announcements';

/**
 * Feature: pipeline-dnd, Property 5: Screen reader announcements contain context
 *
 * For any lead with a contact name and any stage transition, the generated
 * announcements SHALL include the lead's contact name and the relevant stage
 * label(s) in the announcement text for drag start, drag over, and drag end events.
 *
 * **Validates: Requirements 7.5**
 */
describe('Feature: pipeline-dnd, Property 5: Screen reader announcements contain context', () => {
  // Generator for stage keys (alphanumeric with dashes/underscores, non-empty)
  const arbStageKey = fc
    .stringMatching(/^[a-z][a-z0-9_-]{0,19}$/)
    .filter((s) => s.length > 0);

  // Generator for stage labels (non-empty alphanumeric strings to avoid substring issues)
  const arbStageLabel = fc
    .stringMatching(/^[A-Z][a-zA-Z ]{0,20}$/)
    .filter((s) => s.trim().length > 0);

  // Generator for a stage config
  const arbStage = fc.record({
    key: arbStageKey,
    label: arbStageLabel,
    order: fc.nat({ max: 100 }),
  });

  // Generator for a set of unique stages (at least 2 for meaningful transitions)
  const arbStages = fc.uniqueArray(arbStage, {
    minLength: 2,
    maxLength: 8,
    selector: (s) => s.key,
  });

  // Generator for non-empty lead names (alphanumeric to avoid substring matching issues)
  const arbLeadName = fc
    .stringMatching(/^[A-Z][a-zA-Z ]{0,30}$/)
    .filter((s) => s.trim().length > 0);

  // Composite arbitrary: generates stages + a lead assigned to one of those stages
  const arbStagesAndLead = arbStages.chain((stages) => {
    const stageKeys = stages.map((s) => s.key);
    const lead = fc.record({
      id: fc.uuid(),
      status: fc.constantFrom(...stageKeys),
      contact: fc.record({
        full_name: arbLeadName,
        phone: fc.constant('+1234567890'),
        email: fc.constant(null),
      }),
    });
    return lead.map((l) => ({ stages, lead: l }));
  });

  // Composite arbitrary: generates stages + a lead + a target stage key
  const arbStagesLeadAndTarget = arbStages.chain((stages) => {
    const stageKeys = stages.map((s) => s.key);
    const lead = fc.record({
      id: fc.uuid(),
      status: fc.constantFrom(...stageKeys),
      contact: fc.record({
        full_name: arbLeadName,
        phone: fc.constant('+1234567890'),
        email: fc.constant(null),
      }),
    });
    const target = fc.constantFrom(...stageKeys);
    return fc.tuple(lead, target).map(([l, t]) => ({ stages, lead: l, targetStageKey: t }));
  });

  it('onDragStart announcement includes contact name and current stage label', () => {
    fc.assert(
      fc.property(arbStagesAndLead, ({ stages, lead }) => {
        const announcements = createAnnouncements([lead], stages);
        const result = announcements.onDragStart!({
          active: { id: lead.id, data: { current: {} }, rect: { current: { initial: null, translated: null } } },
        } as any);

        const currentStageLabel = stages.find((s) => s.key === lead.status)!.label;

        expect(result).toContain(lead.contact.full_name);
        expect(result).toContain(currentStageLabel);
      }),
      { numRuns: 100 }
    );
  });

  it('onDragOver announcement includes contact name and target stage label', () => {
    fc.assert(
      fc.property(arbStagesLeadAndTarget, ({ stages, lead, targetStageKey }) => {
        const announcements = createAnnouncements([lead], stages);
        const result = announcements.onDragOver!({
          active: { id: lead.id, data: { current: {} }, rect: { current: { initial: null, translated: null } } },
          over: { id: targetStageKey, data: { current: {} }, rect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }, disabled: false },
        } as any);

        const targetStageLabel = stages.find((s) => s.key === targetStageKey)!.label;

        expect(result).toContain(lead.contact.full_name);
        expect(result).toContain(targetStageLabel);
      }),
      { numRuns: 100 }
    );
  });

  it('onDragEnd announcement includes contact name and target stage label', () => {
    fc.assert(
      fc.property(arbStagesLeadAndTarget, ({ stages, lead, targetStageKey }) => {
        const announcements = createAnnouncements([lead], stages);
        const result = announcements.onDragEnd!({
          active: { id: lead.id, data: { current: {} }, rect: { current: { initial: null, translated: null } } },
          over: { id: targetStageKey, data: { current: {} }, rect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }, disabled: false },
        } as any);

        const targetStageLabel = stages.find((s) => s.key === targetStageKey)!.label;

        expect(result).toContain(lead.contact.full_name);
        expect(result).toContain(targetStageLabel);
      }),
      { numRuns: 100 }
    );
  });

  it('onDragCancel announcement includes contact name and original stage label', () => {
    fc.assert(
      fc.property(arbStagesAndLead, ({ stages, lead }) => {
        const announcements = createAnnouncements([lead], stages);
        const result = announcements.onDragCancel!({
          active: { id: lead.id, data: { current: {} }, rect: { current: { initial: null, translated: null } } },
        } as any);

        const originalStageLabel = stages.find((s) => s.key === lead.status)!.label;

        expect(result).toContain(lead.contact.full_name);
        expect(result).toContain(originalStageLabel);
      }),
      { numRuns: 100 }
    );
  });
});
