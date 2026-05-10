import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildAdCopyPrompt,
  type AdCopyPromptInput,
  type ListingData,
  type AgentInfo,
  type TenantConfig,
} from '../ad-copy-prompt-builder';
import type { AdPlatform, AdTone, AdLength, CtaStyle, TargetAudience } from '../ad-copy-types';

/**
 * Feature: listing-ad-copy-assistant, Property 3: Prompt Builder Field Inclusion
 *
 * Validates: Requirements 4.1, 4.2
 *
 * For any valid listing with a mix of populated and null optional fields, the ad copy
 * prompt builder SHALL include all non-null fields in the generated prompt text and
 * SHALL NOT reference any null optional fields. The prompt SHALL always include the
 * mandatory fields (address, property_type, listing_type, price/rental).
 */

/**
 * Feature: listing-ad-copy-assistant, Property 4: Prompt Builder Agent and Tenant Attribution
 *
 * Validates: Requirements 4.9, 4.10
 *
 * For any agent profile and tenant configuration, when the tenant has a CEA registration
 * number, the prompt SHALL include it. When agent attribution is required, the prompt SHALL
 * include the agent's full name and phone number. When these values are null or the
 * configuration does not require them, the prompt SHALL omit them.
 */

// --- Generators ---

const arbPlatform: fc.Arbitrary<AdPlatform> = fc.constantFrom(
  'facebook',
  'instagram',
  'whatsapp',
  'generic'
);

const arbTone: fc.Arbitrary<AdTone> = fc.constantFrom(
  'professional',
  'premium',
  'friendly',
  'urgency',
  'investor',
  'family'
);

const arbLength: fc.Arbitrary<AdLength> = fc.constantFrom('short', 'medium', 'long');

const arbCtaStyle: fc.Arbitrary<CtaStyle> = fc.constantFrom(
  'enquire_now',
  'whatsapp_now',
  'book_viewing',
  'request_details'
);

const arbTargetAudience: fc.Arbitrary<TargetAudience> = fc.constantFrom(
  'family',
  'upgrader',
  'investor',
  'tenant',
  'first_time_buyer'
);

const arbParams = fc.record({
  platform: arbPlatform,
  tone: arbTone,
  length: arbLength,
  cta_style: arbCtaStyle,
  target_audience: fc.option(arbTargetAudience, { nil: undefined }),
  avoid_emojis: fc.boolean(),
  include_hashtags: fc.boolean(),
});

// Non-empty string generator for mandatory fields
const arbNonEmptyString = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

// Generator for listing data with mix of null/non-null optional fields
const arbListingData: fc.Arbitrary<ListingData> = fc.record({
  // Mandatory fields (always non-null)
  address: arbNonEmptyString,
  property_type: arbNonEmptyString,
  listing_type: arbNonEmptyString,
  asking_price: fc.option(fc.integer({ min: 100000, max: 50000000 }), { nil: null }),
  asking_rental: fc.option(fc.integer({ min: 500, max: 50000 }), { nil: null }),
  // Optional fields (may be null)
  postal_code: fc.option(fc.stringMatching(/^[0-9]{6}$/), { nil: null }),
  district: fc.option(arbNonEmptyString, { nil: null }),
  floor_area_sqft: fc.option(fc.integer({ min: 100, max: 50000 }), { nil: null }),
  tenure: fc.option(fc.constantFrom('Freehold', 'Leasehold', '99-year', '999-year'), { nil: null }),
  completion_year: fc.option(fc.integer({ min: 1960, max: 2030 }), { nil: null }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0), { nil: null }),
});

// Ensure at least one of asking_price or asking_rental is non-null
const arbListingDataWithPrice: fc.Arbitrary<ListingData> = arbListingData.map((listing) => {
  if (listing.asking_price === null && listing.asking_rental === null) {
    return { ...listing, asking_price: 1000000 };
  }
  return listing;
});

const arbAgentInfo: fc.Arbitrary<AgentInfo> = fc.record({
  full_name: arbNonEmptyString,
  phone: fc.stringMatching(/^\+65[0-9]{8}$/),
  cea_licence_number: fc.option(fc.stringMatching(/^R[0-9]{6}[A-Z]$/), { nil: null }),
});

const arbTenantConfig: fc.Arbitrary<TenantConfig> = fc.record({
  cea_registration_number: fc.option(fc.stringMatching(/^L[0-9]{7}[A-Z]$/), { nil: null }),
  requires_agent_attribution: fc.boolean(),
});

// Full input generator
function arbAdCopyPromptInput(options?: {
  withAgent?: boolean;
  withTenantConfig?: boolean;
}): fc.Arbitrary<AdCopyPromptInput> {
  const agentArb =
    options?.withAgent === true
      ? arbAgentInfo.map((a) => a as AgentInfo | undefined)
      : options?.withAgent === false
        ? fc.constant(undefined as AgentInfo | undefined)
        : fc.option(arbAgentInfo, { nil: undefined });

  const tenantConfigArb =
    options?.withTenantConfig === true
      ? arbTenantConfig.map((t) => t as TenantConfig | undefined)
      : options?.withTenantConfig === false
        ? fc.constant(undefined as TenantConfig | undefined)
        : fc.option(arbTenantConfig, { nil: undefined });

  return fc.record({
    params: arbParams,
    listing: arbListingDataWithPrice,
    agent: agentArb,
    tenantConfig: tenantConfigArb,
  });
}

describe('Feature: listing-ad-copy-assistant, Property 3: Prompt Builder Field Inclusion', () => {
  it('mandatory fields (address, property_type, listing_type) always appear in the prompt', () => {
    fc.assert(
      fc.property(arbAdCopyPromptInput(), (input) => {
        const result = buildAdCopyPrompt(input);
        const fullPrompt = result.systemPrompt + result.userPrompt;

        expect(fullPrompt).toContain(input.listing.address);
        expect(fullPrompt).toContain(input.listing.property_type);
        expect(fullPrompt).toContain(input.listing.listing_type);
      }),
      { numRuns: 100 }
    );
  });

  it('price/rental mandatory fields appear when non-null', () => {
    fc.assert(
      fc.property(arbAdCopyPromptInput(), (input) => {
        const result = buildAdCopyPrompt(input);
        const fullPrompt = result.systemPrompt + result.userPrompt;

        if (input.listing.asking_price !== null) {
          expect(fullPrompt).toContain(
            input.listing.asking_price.toLocaleString('en-US')
          );
        }
        if (input.listing.asking_rental !== null) {
          expect(fullPrompt).toContain(
            input.listing.asking_rental.toLocaleString('en-US')
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all non-null optional fields appear in the prompt', () => {
    fc.assert(
      fc.property(arbAdCopyPromptInput(), (input) => {
        const result = buildAdCopyPrompt(input);
        const fullPrompt = result.systemPrompt + result.userPrompt;
        const listing = input.listing;

        if (listing.postal_code !== null) {
          expect(fullPrompt).toContain(listing.postal_code);
        }
        if (listing.district !== null) {
          expect(fullPrompt).toContain(listing.district);
        }
        if (listing.floor_area_sqft !== null) {
          expect(fullPrompt).toContain(listing.floor_area_sqft.toLocaleString('en-US'));
        }
        if (listing.tenure !== null) {
          expect(fullPrompt).toContain(listing.tenure);
        }
        if (listing.completion_year !== null) {
          expect(fullPrompt).toContain(String(listing.completion_year));
        }
        if (listing.description !== null) {
          expect(fullPrompt).toContain(listing.description);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('null optional fields are not referenced in the prompt', () => {
    fc.assert(
      fc.property(arbAdCopyPromptInput(), (input) => {
        const result = buildAdCopyPrompt(input);
        const userPrompt = result.userPrompt;
        const listing = input.listing;

        if (listing.postal_code === null) {
          expect(userPrompt).not.toContain('Postal code:');
        }
        if (listing.district === null) {
          expect(userPrompt).not.toContain('District:');
        }
        if (listing.floor_area_sqft === null) {
          expect(userPrompt).not.toContain('Floor area:');
        }
        if (listing.tenure === null) {
          expect(userPrompt).not.toContain('Tenure:');
        }
        if (listing.completion_year === null) {
          expect(userPrompt).not.toContain('TOP year:');
        }
        if (listing.description === null) {
          expect(userPrompt).not.toContain('Description:');
        }
      }),
      { numRuns: 100 }
    );
  });
});


describe('Feature: listing-ad-copy-assistant, Property 4: Prompt Builder Agent and Tenant Attribution', () => {
  it('CEA registration number is included when tenant has one', () => {
    const arbInputWithCea = fc.record({
      params: arbParams,
      listing: arbListingDataWithPrice,
      agent: fc.option(arbAgentInfo, { nil: undefined }),
      tenantConfig: arbTenantConfig
        .filter((tc) => tc.cea_registration_number !== null)
        .map((tc) => tc as TenantConfig | undefined),
    });

    fc.assert(
      fc.property(arbInputWithCea, (input) => {
        const result = buildAdCopyPrompt(input);
        const fullPrompt = result.systemPrompt + result.userPrompt;

        expect(fullPrompt).toContain(input.tenantConfig!.cea_registration_number!);
      }),
      { numRuns: 100 }
    );
  });

  it('CEA registration number is omitted when tenant does not have one', () => {
    const arbInputWithoutCea = fc.record({
      params: arbParams,
      listing: arbListingDataWithPrice,
      agent: fc.option(arbAgentInfo, { nil: undefined }),
      tenantConfig: fc.option(
        arbTenantConfig.map((tc) => ({ ...tc, cea_registration_number: null })),
        { nil: undefined }
      ),
    });

    fc.assert(
      fc.property(arbInputWithoutCea, (input) => {
        const result = buildAdCopyPrompt(input);
        const userPrompt = result.userPrompt;

        expect(userPrompt).not.toContain('CEA registration number:');
      }),
      { numRuns: 100 }
    );
  });

  it('agent name and phone are included when attribution is required', () => {
    const arbInputWithAttribution = fc.record({
      params: arbParams,
      listing: arbListingDataWithPrice,
      agent: arbAgentInfo.map((a) => a as AgentInfo | undefined),
      tenantConfig: arbTenantConfig
        .map((tc) => ({ ...tc, requires_agent_attribution: true }))
        .map((tc) => tc as TenantConfig | undefined),
    });

    fc.assert(
      fc.property(arbInputWithAttribution, (input) => {
        const result = buildAdCopyPrompt(input);
        const fullPrompt = result.systemPrompt + result.userPrompt;

        expect(fullPrompt).toContain(input.agent!.full_name);
        expect(fullPrompt).toContain(input.agent!.phone);
      }),
      { numRuns: 100 }
    );
  });

  it('agent name and phone are omitted when attribution is not required', () => {
    const arbInputWithoutAttribution = fc.record({
      params: arbParams,
      listing: arbListingDataWithPrice,
      agent: fc.option(arbAgentInfo, { nil: undefined }),
      tenantConfig: fc.option(
        arbTenantConfig.map((tc) => ({ ...tc, requires_agent_attribution: false })),
        { nil: undefined }
      ),
    });

    fc.assert(
      fc.property(arbInputWithoutAttribution, (input) => {
        const result = buildAdCopyPrompt(input);
        const userPrompt = result.userPrompt;

        // When attribution is not required, agent details should not appear
        if (input.agent) {
          expect(userPrompt).not.toContain(`Agent: ${input.agent.full_name}`);
          expect(userPrompt).not.toContain(`Phone: ${input.agent.phone}`);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('agent name and phone are omitted when no agent is provided even if attribution is required', () => {
    const arbInputNoAgent = fc.record({
      params: arbParams,
      listing: arbListingDataWithPrice,
      agent: fc.constant(undefined as AgentInfo | undefined),
      tenantConfig: arbTenantConfig
        .map((tc) => ({ ...tc, requires_agent_attribution: true }))
        .map((tc) => tc as TenantConfig | undefined),
    });

    fc.assert(
      fc.property(arbInputNoAgent, (input) => {
        const result = buildAdCopyPrompt(input);
        const userPrompt = result.userPrompt;

        expect(userPrompt).not.toContain('Agent:');
        expect(userPrompt).not.toContain('Phone:');
      }),
      { numRuns: 100 }
    );
  });

  it('agent CEA licence number is included when agent has one and attribution is required', () => {
    const arbInputWithLicence = fc.record({
      params: arbParams,
      listing: arbListingDataWithPrice,
      agent: arbAgentInfo
        .filter((a) => a.cea_licence_number !== null)
        .map((a) => a as AgentInfo | undefined),
      tenantConfig: arbTenantConfig
        .map((tc) => ({ ...tc, requires_agent_attribution: true }))
        .map((tc) => tc as TenantConfig | undefined),
    });

    fc.assert(
      fc.property(arbInputWithLicence, (input) => {
        const result = buildAdCopyPrompt(input);
        const fullPrompt = result.systemPrompt + result.userPrompt;

        expect(fullPrompt).toContain(input.agent!.cea_licence_number!);
      }),
      { numRuns: 100 }
    );
  });

  it('agent CEA licence number is omitted when agent does not have one', () => {
    const arbInputWithoutLicence = fc.record({
      params: arbParams,
      listing: arbListingDataWithPrice,
      agent: arbAgentInfo
        .map((a) => ({ ...a, cea_licence_number: null }))
        .map((a) => a as AgentInfo | undefined),
      tenantConfig: arbTenantConfig
        .map((tc) => ({ ...tc, requires_agent_attribution: true }))
        .map((tc) => tc as TenantConfig | undefined),
    });

    fc.assert(
      fc.property(arbInputWithoutLicence, (input) => {
        const result = buildAdCopyPrompt(input);
        const userPrompt = result.userPrompt;

        expect(userPrompt).not.toContain('CEA licence:');
      }),
      { numRuns: 100 }
    );
  });
});
