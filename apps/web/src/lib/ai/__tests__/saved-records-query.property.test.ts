import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sortAndLimitRecords } from '../saved-records-query';
import type { MarketingAssetRecord } from '../ad-copy-types';
import type { AdPlatform, AdTone, TargetAudience } from '../ad-copy-types';

// --- Generators ---

const platformArb: fc.Arbitrary<AdPlatform> = fc.constantFrom('facebook', 'instagram', 'whatsapp', 'generic');
const toneArb: fc.Arbitrary<AdTone> = fc.constantFrom('professional', 'premium', 'friendly', 'urgency', 'investor', 'family');
const assetTypeArb = fc.constantFrom('ad_copy', 'caption', 'headline', 'whatsapp_text', 'hashtags', 'short_form') as fc.Arbitrary<MarketingAssetRecord['asset_type']>;
const targetAngleArb: fc.Arbitrary<TargetAudience | null> = fc.constantFrom(null, 'family', 'upgrader', 'investor', 'tenant', 'first_time_buyer');

/** Generate a valid ISO timestamp within a reasonable range */
const timestampArb = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: new Date('2030-12-31T23:59:59Z').getTime(),
}).map(ms => new Date(ms).toISOString());

/** Generate a single MarketingAssetRecord with an arbitrary created_at */
const marketingAssetRecordArb: fc.Arbitrary<MarketingAssetRecord> = fc.record({
  id: fc.uuid(),
  tenant_id: fc.uuid(),
  listing_id: fc.uuid(),
  asset_type: assetTypeArb,
  platform: platformArb,
  tone: toneArb,
  target_angle: targetAngleArb,
  content_text: fc.string({ minLength: 1, maxLength: 200 }),
  compliance_flags: fc.constant([]),
  generated_by: fc.constantFrom('ai', 'manual') as fc.Arbitrary<'ai' | 'manual'>,
  saved_by: fc.uuid(),
  published_at: fc.oneof(fc.constant(null), timestampArb),
  created_at: timestampArb,
  updated_at: timestampArb,
});

// --- Property Tests ---

/**
 * Feature: listing-ad-copy-assistant, Property 8: Saved Records Retrieval Ordering and Limits
 *
 * **Validates: Requirements 11.2, 11.4**
 *
 * For any listing with N saved marketing asset records (where N >= 0),
 * the retrieval function SHALL return at most 50 records, and those records
 * SHALL be ordered by created_at in descending order (most recent first).
 * When N > 50, only the 50 most recent records SHALL be returned.
 */
describe('Feature: listing-ad-copy-assistant, Property 8: Saved Records Retrieval Ordering and Limits', () => {
  it('returns at most 50 records regardless of input size', () => {
    fc.assert(
      fc.property(
        fc.array(marketingAssetRecordArb, { minLength: 0, maxLength: 120 }),
        (records) => {
          const result = sortAndLimitRecords(records);
          expect(result.length).toBeLessThanOrEqual(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns records ordered by created_at descending (most recent first)', () => {
    fc.assert(
      fc.property(
        fc.array(marketingAssetRecordArb, { minLength: 0, maxLength: 120 }),
        (records) => {
          const result = sortAndLimitRecords(records);

          for (let i = 1; i < result.length; i++) {
            const prevDate = new Date(result[i - 1].created_at).getTime();
            const currDate = new Date(result[i].created_at).getTime();
            expect(prevDate).toBeGreaterThanOrEqual(currDate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when N > 50, returns only the 50 most recent records', () => {
    fc.assert(
      fc.property(
        fc.array(marketingAssetRecordArb, { minLength: 51, maxLength: 120 }),
        (records) => {
          const result = sortAndLimitRecords(records);

          // Should be exactly 50
          expect(result.length).toBe(50);

          // All returned records should have created_at >= any excluded record
          const resultIds = new Set(result.map(r => r.id));
          const excluded = records.filter(r => !resultIds.has(r.id));

          const oldestReturned = new Date(result[result.length - 1].created_at).getTime();

          for (const ex of excluded) {
            const exDate = new Date(ex.created_at).getTime();
            expect(oldestReturned).toBeGreaterThanOrEqual(exDate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when N <= 50, returns all records', () => {
    fc.assert(
      fc.property(
        fc.array(marketingAssetRecordArb, { minLength: 0, maxLength: 50 }),
        (records) => {
          const result = sortAndLimitRecords(records);
          expect(result.length).toBe(records.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
