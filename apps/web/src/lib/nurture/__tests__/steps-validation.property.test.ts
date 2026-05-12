import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { playbookStepSchema, createPlaybookSchema, STEP_CHANNELS } from '../types';
import type { StepChannel } from '../types';

// --- Generators ---

/** Generate a valid step channel */
const validChannelArb: fc.Arbitrary<StepChannel> = fc.constantFrom(...STEP_CHANNELS);

/** Generate a valid offset_days value in [-365, 365] */
const validOffsetDaysArb = fc.integer({ min: -365, max: 365 });

/** Generate an invalid offset_days value outside [-365, 365] */
const invalidOffsetDaysArb = fc.oneof(
  fc.integer({ min: -10000, max: -366 }),
  fc.integer({ min: 366, max: 10000 })
);

/** Generate a valid title (1-80 characters) */
const validTitleArb = fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.length >= 1);

/** Generate an invalid title (empty or >80 characters) */
const invalidTitleEmptyArb = fc.constant('');
const invalidTitleTooLongArb = fc.string({ minLength: 81, maxLength: 200 });

/** Generate a valid playbook step object */
const validStepArb = fc.record({
  id: fc.uuid(),
  offset_days: validOffsetDaysArb,
  channel: validChannelArb,
  template_id: fc.oneof(fc.uuid(), fc.constant(null)),
  create_task: fc.boolean(),
  title: validTitleArb,
});

/** Generate an invalid channel string (not in the valid set) */
const invalidChannelArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => !(['whatsapp', 'email', 'call', 'task_only'] as string[]).includes(s));

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 2: Playbook Steps Validation
 *
 * **Validates: Requirements 2.4, 3.7**
 *
 * For any steps_json array, the validation function SHALL accept it if and only if:
 * the array contains between 1 and 50 elements, every element has offset_days in the
 * range [-365, 365], every element has channel in {whatsapp, email, call, task_only},
 * and every element has a title with length between 1 and 80 characters.
 */
describe('Feature: nurture-playbooks, Property 2: Playbook Steps Validation', () => {
  it('accepts valid steps arrays (1-50 elements with valid fields)', () => {
    fc.assert(
      fc.property(
        fc.array(validStepArb, { minLength: 1, maxLength: 50 }),
        (steps) => {
          const result = createPlaybookSchema.shape.steps_json.safeParse(steps);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects empty steps arrays', () => {
    const result = createPlaybookSchema.shape.steps_json.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('rejects steps arrays with more than 50 elements', () => {
    fc.assert(
      fc.property(
        fc.array(validStepArb, { minLength: 51, maxLength: 60 }),
        (steps) => {
          const result = createPlaybookSchema.shape.steps_json.safeParse(steps);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('rejects steps with offset_days outside [-365, 365]', () => {
    fc.assert(
      fc.property(
        invalidOffsetDaysArb,
        fc.uuid(),
        validChannelArb,
        validTitleArb,
        (offsetDays, id, channel, title) => {
          const step = {
            id,
            offset_days: offsetDays,
            channel,
            template_id: null,
            create_task: true,
            title,
          };
          const result = playbookStepSchema.safeParse(step);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects steps with invalid channel values', () => {
    fc.assert(
      fc.property(
        invalidChannelArb,
        fc.uuid(),
        validOffsetDaysArb,
        validTitleArb,
        (channel, id, offsetDays, title) => {
          const step = {
            id,
            offset_days: offsetDays,
            channel,
            template_id: null,
            create_task: true,
            title,
          };
          const result = playbookStepSchema.safeParse(step);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects steps with empty title', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        validOffsetDaysArb,
        validChannelArb,
        (id, offsetDays, channel) => {
          const step = {
            id,
            offset_days: offsetDays,
            channel,
            template_id: null,
            create_task: true,
            title: '',
          };
          const result = playbookStepSchema.safeParse(step);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('rejects steps with title exceeding 80 characters', () => {
    fc.assert(
      fc.property(
        invalidTitleTooLongArb,
        fc.uuid(),
        validOffsetDaysArb,
        validChannelArb,
        (title, id, offsetDays, channel) => {
          const step = {
            id,
            offset_days: offsetDays,
            channel,
            template_id: null,
            create_task: true,
            title,
          };
          const result = playbookStepSchema.safeParse(step);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validation accepts iff all constraints are satisfied simultaneously', () => {
    // Generate steps where each field may or may not be valid
    const maybeValidOffsetArb = fc.oneof(validOffsetDaysArb, invalidOffsetDaysArb);
    const maybeValidChannelArb = fc.oneof(
      validChannelArb as fc.Arbitrary<string>,
      invalidChannelArb
    );
    const maybeValidTitleArb = fc.oneof(
      validTitleArb,
      invalidTitleEmptyArb,
      invalidTitleTooLongArb
    );

    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          offset_days: maybeValidOffsetArb,
          channel: maybeValidChannelArb,
          template_id: fc.oneof(fc.uuid(), fc.constant(null)),
          create_task: fc.boolean(),
          title: maybeValidTitleArb,
        }),
        (step) => {
          const result = playbookStepSchema.safeParse(step);

          const offsetValid = step.offset_days >= -365 && step.offset_days <= 365;
          const channelValid = (['whatsapp', 'email', 'call', 'task_only'] as string[]).includes(step.channel);
          const titleValid = step.title.length >= 1 && step.title.length <= 80;

          const expectedValid = offsetValid && channelValid && titleValid;

          expect(result.success).toBe(expectedValid);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('array length constraint: accepts iff 1-50 elements (with all valid steps)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 60 }),
        (count) => {
          // Generate an array of `count` valid steps
          const steps = Array.from({ length: count }, (_, i) => ({
            id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
            offset_days: 0,
            channel: 'whatsapp' as const,
            template_id: null,
            create_task: true,
            title: `Step ${i + 1}`,
          }));

          const result = createPlaybookSchema.shape.steps_json.safeParse(steps);
          const expectedValid = count >= 1 && count <= 50;

          expect(result.success).toBe(expectedValid);
        }
      ),
      { numRuns: 61 }
    );
  });
});
