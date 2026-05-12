import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldExcludeFromTaskGeneration, TaskExclusionInput } from '../consent';

// --- Generators ---

/** Generate a step channel value (channels used in playbook steps) */
const stepChannelArb = fc.constantFrom('whatsapp', 'email', 'call', 'task_only');

/** Generate a channel preference value */
const channelPreferenceArb = fc.constantFrom('whatsapp', 'email', 'phone', 'none');

/** Generate a data_retention_expiry value (nullable, past or future date) */
const dataRetentionExpiryArb = fc.oneof(
  fc.constant(null),
  // Past dates (expired)
  fc.date({ min: new Date('2018-01-01'), max: new Date(Date.now() - 86400000) })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString().split('T')[0]),
  // Future dates (not expired)
  fc.date({ min: new Date(Date.now() + 86400000), max: new Date('2030-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString().split('T')[0])
);

/** Generate an arbitrary TaskExclusionInput */
const taskExclusionInputArb: fc.Arbitrary<TaskExclusionInput> = fc.record({
  whatsapp_optin: fc.boolean(),
  channel_preference: channelPreferenceArb,
  data_retention_expiry: dataRetentionExpiryArb,
  step_channel: stepChannelArb,
});

/** Fixed "now" for deterministic testing */
const NOW = new Date('2024-06-15T12:00:00Z');

// --- Helper: compute expected exclusion from the property rules ---

function expectedExclusion(input: TaskExclusionInput, now: Date): boolean {
  // Condition 1: whatsapp_optin is false AND step channel is "whatsapp"
  if (!input.whatsapp_optin && input.step_channel === 'whatsapp') return true;

  // Condition 2: channel_preference is "none"
  if (input.channel_preference === 'none') return true;

  // Condition 3: data_retention_expiry is not null AND is earlier than now
  if (input.data_retention_expiry && new Date(input.data_retention_expiry) < now) return true;

  return false;
}

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 6: Consent-Based Task Exclusion
 *
 * **Validates: Requirements 4.3, 10.1, 10.2, 10.3**
 *
 * For any contact and playbook step evaluated by the Task_Generator, the contact SHALL be
 * excluded from task generation if any of the following hold:
 * - whatsapp_optin is false AND step channel is "whatsapp"
 * - channel_preference is "none"
 * - data_retention_expiry is not null AND is earlier than the current date
 */
describe('Feature: nurture-playbooks, Property 6: Consent-Based Task Exclusion', () => {
  it('exclusion matches expected logic for arbitrary inputs', () => {
    fc.assert(
      fc.property(taskExclusionInputArb, (input) => {
        const now = new Date();
        const actual = shouldExcludeFromTaskGeneration(input, now);
        const expected = expectedExclusion(input, now);
        expect(actual).toBe(expected);
      }),
      { numRuns: 500 }
    );
  });

  it('excludes when whatsapp_optin is false and step_channel is whatsapp', () => {
    fc.assert(
      fc.property(
        taskExclusionInputArb.map(input => ({
          ...input,
          whatsapp_optin: false,
          step_channel: 'whatsapp' as const,
        })),
        (input) => {
          expect(shouldExcludeFromTaskGeneration(input, NOW)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('excludes when channel_preference is none', () => {
    fc.assert(
      fc.property(
        taskExclusionInputArb.map(input => ({
          ...input,
          channel_preference: 'none',
        })),
        (input) => {
          expect(shouldExcludeFromTaskGeneration(input, NOW)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('excludes when data_retention_expiry is in the past', () => {
    const pastDateArb = fc.date({ min: new Date('2018-01-01'), max: new Date('2024-06-14') })
      .filter(d => !isNaN(d.getTime()))
      .map(d => d.toISOString().split('T')[0]);

    fc.assert(
      fc.property(
        taskExclusionInputArb.chain(input =>
          pastDateArb.map(expiry => ({
            ...input,
            // Isolate this condition by ensuring other conditions don't trigger
            whatsapp_optin: true,
            channel_preference: 'whatsapp' as const,
            data_retention_expiry: expiry,
            step_channel: 'email' as const,
          }))
        ),
        (input) => {
          expect(shouldExcludeFromTaskGeneration(input, NOW)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT exclude when whatsapp_optin is true and step_channel is whatsapp (condition 1 not met)', () => {
    fc.assert(
      fc.property(
        taskExclusionInputArb.map(input => ({
          ...input,
          whatsapp_optin: true,
          step_channel: 'whatsapp' as const,
          // Ensure other conditions don't trigger
          channel_preference: 'whatsapp' as const,
          data_retention_expiry: null,
        })),
        (input) => {
          expect(shouldExcludeFromTaskGeneration(input, NOW)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT exclude when whatsapp_optin is false but step_channel is NOT whatsapp (condition 1 not met)', () => {
    const nonWhatsappChannelArb = fc.constantFrom('email', 'call', 'task_only');

    fc.assert(
      fc.property(
        fc.tuple(taskExclusionInputArb, nonWhatsappChannelArb).map(([input, channel]) => ({
          ...input,
          whatsapp_optin: false,
          step_channel: channel,
          // Ensure other conditions don't trigger
          channel_preference: 'whatsapp' as const,
          data_retention_expiry: null,
        })),
        (input) => {
          expect(shouldExcludeFromTaskGeneration(input, NOW)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT exclude when data_retention_expiry is in the future', () => {
    const futureDateArb = fc.date({ min: new Date('2024-06-16'), max: new Date('2030-12-31') })
      .filter(d => !isNaN(d.getTime()))
      .map(d => d.toISOString().split('T')[0]);

    fc.assert(
      fc.property(
        taskExclusionInputArb.chain(input =>
          futureDateArb.map(expiry => ({
            ...input,
            // Ensure other conditions don't trigger
            whatsapp_optin: true,
            channel_preference: 'whatsapp' as const,
            data_retention_expiry: expiry,
            step_channel: 'email' as const,
          }))
        ),
        (input) => {
          expect(shouldExcludeFromTaskGeneration(input, NOW)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT exclude when data_retention_expiry is null', () => {
    fc.assert(
      fc.property(
        taskExclusionInputArb.map(input => ({
          ...input,
          // Ensure other conditions don't trigger
          whatsapp_optin: true,
          channel_preference: 'whatsapp' as const,
          data_retention_expiry: null,
          step_channel: 'email' as const,
        })),
        (input) => {
          expect(shouldExcludeFromTaskGeneration(input, NOW)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('exclusion is true iff at least one of the three conditions holds', () => {
    fc.assert(
      fc.property(taskExclusionInputArb, (input) => {
        const now = new Date();
        const result = shouldExcludeFromTaskGeneration(input, now);

        const cond1 = !input.whatsapp_optin && input.step_channel === 'whatsapp';
        const cond2 = input.channel_preference === 'none';
        const cond3 = input.data_retention_expiry !== null &&
          new Date(input.data_retention_expiry) < now;

        const anyConditionHolds = cond1 || cond2 || cond3;
        expect(result).toBe(anyConditionHolds);
      }),
      { numRuns: 500 }
    );
  });
});
