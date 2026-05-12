import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { selectActiveLead } from '../lead-selector';
import type { Lead, PipelineStage } from '@agentos/shared';

/**
 * Feature: ai-reply-suggestions, Property 9: Active Lead Selection
 *
 * Validates: Requirements 8.2
 *
 * For any array of leads associated with a contact, the lead selector SHALL:
 * (a) exclude leads with status "closed_won", "closed_lost", or "nurture";
 * (b) from the remaining active leads, select the one with the most recent last_activity_at timestamp;
 * (c) if no active leads exist, return null.
 */

const EXCLUDED_STATUSES: PipelineStage[] = ['closed_won', 'closed_lost', 'nurture'];

const ACTIVE_STATUSES: PipelineStage[] = [
  'new_lead',
  'contacted',
  'qualified',
  'viewing_booked',
  'viewing_done',
  'negotiating',
  'otp_loi_issued',
];

const ALL_STATUSES: PipelineStage[] = [...ACTIVE_STATUSES, ...EXCLUDED_STATUSES];

// Generator for a valid ISO timestamp within a reasonable range
// Use integer-based approach to avoid invalid date issues with fc.date in fast-check v4
const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2030-12-31T23:59:59Z').getTime();

const arbTimestamp = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

// Generator for a full Lead object with a given status and timestamp
function arbLead(
  statusArb: fc.Arbitrary<PipelineStage>,
  timestampArb?: fc.Arbitrary<string>
): fc.Arbitrary<Lead> {
  return fc.record({
    id: fc.uuid(),
    tenant_id: fc.uuid(),
    contact_id: fc.uuid(),
    assigned_to: fc.option(fc.uuid(), { nil: null }),
    status: statusArb,
    source: fc.constantFrom(
      'facebook_ad' as const,
      'instagram_ad' as const,
      'portal' as const,
      'whatsapp' as const,
      'referral' as const,
      'open_house' as const,
      'web_form' as const,
      'manual' as const
    ),
    ad_campaign_id: fc.constant(null),
    ad_set_id: fc.constant(null),
    ad_creative_id: fc.constant(null),
    ad_purpose: fc.constant(null),
    deal_type: fc.constantFrom(
      'sale' as const,
      'resale' as const,
      'rental' as const,
      'landlord_rep' as const,
      'tenant_rep' as const
    ),
    urgency: fc.constantFrom('hot' as const, 'warm' as const, 'cold' as const),
    budget_min: fc.option(fc.integer({ min: 100000, max: 10000000 }), { nil: null }),
    budget_max: fc.option(fc.integer({ min: 100000, max: 10000000 }), { nil: null }),
    move_in_by: fc.constant(null),
    notes: fc.constant(null),
    residency_status: fc.constant(null),
    property_ownership: fc.constant(null),
    eligibility_risk: fc.boolean(),
    eligibility_flag_reason: fc.constant(null),
    intent_score: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
    time_on_form_seconds: fc.constant(null),
    timeline_declared: fc.constant(null),
    paynow_verified: fc.boolean(),
    paynow_name_match: fc.constant(null),
    paynow_registered_name: fc.constant(null),
    verification_score: fc.constant(null),
    pre_viewing_checklist: fc.constant(null),
    lead_title: fc.constant(null),
    lead_category: fc.constantFrom('buyer' as const, 'seller' as const, 'landlord' as const, 'tenant' as const, 'co_broke' as const, 'nurture' as const),
    is_active: fc.boolean(),
    opened_at: arbTimestamp,
    closed_at: fc.constant(null),
    close_reason: fc.constant(null),
    origin_listing_id: fc.constant(null),
    duplicate_of_lead_id: fc.constant(null),
    created_at: arbTimestamp,
    last_activity_at: timestampArb ?? arbTimestamp,
  });
}

describe('Feature: ai-reply-suggestions, Property 9: Active Lead Selection', () => {
  it('(a) excludes leads with status closed_won, closed_lost, or nurture', () => {
    fc.assert(
      fc.property(
        fc.array(arbLead(fc.constantFrom(...ALL_STATUSES)), { minLength: 1, maxLength: 20 }),
        (leads) => {
          const result = selectActiveLead(leads);

          if (result !== null) {
            // The selected lead must NOT have an excluded status
            expect(EXCLUDED_STATUSES).not.toContain(result.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(b) selects the lead with the most recent last_activity_at from active leads', () => {
    fc.assert(
      fc.property(
        fc.array(arbLead(fc.constantFrom(...ALL_STATUSES)), { minLength: 1, maxLength: 20 }),
        (leads) => {
          const result = selectActiveLead(leads);

          // Compute expected active leads
          const activeLeads = leads.filter(
            (lead) => !EXCLUDED_STATUSES.includes(lead.status)
          );

          if (activeLeads.length === 0) {
            expect(result).toBeNull();
          } else {
            expect(result).not.toBeNull();

            // The result must be one of the active leads
            expect(activeLeads).toContainEqual(result);

            // The result must have the most recent last_activity_at
            const resultTime = new Date(result!.last_activity_at).getTime();
            for (const lead of activeLeads) {
              const leadTime = new Date(lead.last_activity_at).getTime();
              expect(resultTime).toBeGreaterThanOrEqual(leadTime);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(c) returns null when no active leads exist (all excluded)', () => {
    fc.assert(
      fc.property(
        fc.array(arbLead(fc.constantFrom(...EXCLUDED_STATUSES)), {
          minLength: 0,
          maxLength: 20,
        }),
        (leads) => {
          const result = selectActiveLead(leads);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
