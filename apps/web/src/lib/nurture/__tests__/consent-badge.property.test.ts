import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeConsentBadge, ConsentInput, ConsentBadge } from '../consent';

// --- Generators ---

/** Generate a channel preference value */
const channelPreferenceArb = fc.constantFrom('whatsapp', 'email', 'phone', 'none');

/** Generate a task channel value */
const taskChannelArb = fc.constantFrom('whatsapp', 'email', 'call', 'note');

/** Generate an ad_purpose value (nullable) */
const adPurposeArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom('buying', 'selling', 'renting', 'investing')
);

/** Generate a target_ad_purpose value (nullable) */
const targetAdPurposeArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom('buying', 'selling', 'renting', 'investing')
);

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

/** Generate an arbitrary ConsentInput */
const consentInputArb: fc.Arbitrary<ConsentInput> = fc.record({
  whatsapp_optin: fc.boolean(),
  channel_preference: channelPreferenceArb,
  ad_purpose: adPurposeArb,
  target_ad_purpose: targetAdPurposeArb,
  dnc_registered: fc.boolean(),
  data_retention_expiry: dataRetentionExpiryArb,
  task_channel: taskChannelArb,
});

// --- Helper: compute expected badge from the property rules ---

function expectedBadge(input: ConsentInput): ConsentBadge {
  const now = new Date();

  // Red conditions (highest priority)
  if (!input.whatsapp_optin && input.task_channel === 'whatsapp') return 'red';
  if (input.channel_preference === 'none') return 'red';
  if (input.data_retention_expiry && new Date(input.data_retention_expiry) < now) return 'red';
  if (input.task_channel === 'call' && input.dnc_registered) return 'red';

  // Yellow condition
  if (input.whatsapp_optin && input.target_ad_purpose && input.ad_purpose !== input.target_ad_purpose) {
    return 'yellow';
  }

  // Default
  return 'green';
}

// --- Property Tests ---

/**
 * Feature: nurture-playbooks, Property 13: Consent Badge Computation
 *
 * **Validates: Requirements 6.3, 10.4, 10.8**
 *
 * For any combination of contact consent fields and task channel, the consent badge SHALL be:
 * - Red if: whatsapp_optin is false and channel is "whatsapp", OR channel_preference is "none",
 *   OR data_retention_expiry < today, OR (channel is "call" and dnc_registered is true)
 * - Yellow if: whatsapp_optin is true AND target_ad_purpose exists AND ad_purpose ≠ target_ad_purpose
 * - Green otherwise
 */
describe('Feature: nurture-playbooks, Property 13: Consent Badge Computation', () => {
  it('badge matches priority rules (red > yellow > green) for arbitrary inputs', () => {
    fc.assert(
      fc.property(consentInputArb, (input) => {
        const actual = computeConsentBadge(input);
        const expected = expectedBadge(input);
        expect(actual).toBe(expected);
      }),
      { numRuns: 500 }
    );
  });

  it('returns red when whatsapp_optin is false and task_channel is whatsapp', () => {
    fc.assert(
      fc.property(
        consentInputArb.map(input => ({
          ...input,
          whatsapp_optin: false,
          task_channel: 'whatsapp' as const,
        })),
        (input) => {
          expect(computeConsentBadge(input)).toBe('red');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns red when channel_preference is none', () => {
    fc.assert(
      fc.property(
        consentInputArb.map(input => ({
          ...input,
          channel_preference: 'none',
        })),
        (input) => {
          expect(computeConsentBadge(input)).toBe('red');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns red when data_retention_expiry is in the past', () => {
    const pastDateArb = fc.date({ min: new Date('2018-01-01'), max: new Date(Date.now() - 86400000) })
      .filter(d => !isNaN(d.getTime()))
      .map(d => d.toISOString().split('T')[0]);

    fc.assert(
      fc.property(
        consentInputArb.chain(input =>
          pastDateArb.map(expiry => ({
            ...input,
            // Avoid earlier red conditions triggering first
            whatsapp_optin: true,
            channel_preference: 'whatsapp' as const,
            data_retention_expiry: expiry,
            task_channel: 'whatsapp' as const,
            dnc_registered: false,
          }))
        ),
        (input) => {
          expect(computeConsentBadge(input)).toBe('red');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns red when task_channel is call and dnc_registered is true', () => {
    fc.assert(
      fc.property(
        consentInputArb.map(input => ({
          ...input,
          // Avoid earlier red conditions triggering first
          whatsapp_optin: true,
          channel_preference: 'whatsapp',
          data_retention_expiry: null,
          task_channel: 'call' as const,
          dnc_registered: true,
        })),
        (input) => {
          expect(computeConsentBadge(input)).toBe('red');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns yellow when whatsapp_optin is true, target_ad_purpose exists, and ad_purpose mismatches', () => {
    const mismatchedPurposesArb = fc.tuple(
      fc.constantFrom('buying', 'selling', 'renting', 'investing'),
      fc.constantFrom('buying', 'selling', 'renting', 'investing')
    ).filter(([a, b]) => a !== b);

    fc.assert(
      fc.property(
        fc.tuple(consentInputArb, mismatchedPurposesArb).map(([input, [adPurpose, targetAdPurpose]]) => ({
          ...input,
          // Ensure no red conditions
          whatsapp_optin: true,
          channel_preference: 'whatsapp',
          data_retention_expiry: null,
          dnc_registered: false,
          task_channel: 'whatsapp' as const,
          ad_purpose: adPurpose,
          target_ad_purpose: targetAdPurpose,
        })),
        (input) => {
          expect(computeConsentBadge(input)).toBe('yellow');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns green when no red or yellow conditions apply', () => {
    fc.assert(
      fc.property(
        consentInputArb.map(input => ({
          ...input,
          // Ensure no red conditions
          whatsapp_optin: true,
          channel_preference: 'whatsapp',
          data_retention_expiry: null,
          dnc_registered: false,
          task_channel: 'whatsapp' as const,
          // Ensure no yellow condition (matching purposes)
          ad_purpose: 'buying',
          target_ad_purpose: 'buying',
        })),
        (input) => {
          expect(computeConsentBadge(input)).toBe('green');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('red takes priority over yellow when both conditions apply', () => {
    fc.assert(
      fc.property(
        consentInputArb.map(input => ({
          ...input,
          // Yellow condition: optin true, mismatched purposes
          whatsapp_optin: true,
          ad_purpose: 'selling',
          target_ad_purpose: 'buying',
          // Red condition: channel_preference none
          channel_preference: 'none',
          data_retention_expiry: null,
          dnc_registered: false,
          task_channel: 'whatsapp' as const,
        })),
        (input) => {
          expect(computeConsentBadge(input)).toBe('red');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('result is always one of green, yellow, or red', () => {
    fc.assert(
      fc.property(consentInputArb, (input) => {
        const badge = computeConsentBadge(input);
        expect(['green', 'yellow', 'red']).toContain(badge);
      }),
      { numRuns: 200 }
    );
  });
});
