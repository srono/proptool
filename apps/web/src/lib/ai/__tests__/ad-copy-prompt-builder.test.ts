import { describe, it, expect } from 'vitest';
import {
  buildAdCopyPrompt,
  type AdCopyPromptInput,
  type ListingData,
  type AgentInfo,
  type TenantConfig,
} from '../ad-copy-prompt-builder';

const baseListing: ListingData = {
  address: '123 Orchard Road #10-01',
  postal_code: '238858',
  district: 'D09',
  property_type: 'Condominium',
  listing_type: 'Sale',
  asking_price: 2500000,
  asking_rental: null,
  floor_area_sqft: 1200,
  tenure: '99-year leasehold',
  completion_year: 2010,
  description: 'Spacious unit with city views',
};

const baseInput: AdCopyPromptInput = {
  params: {
    platform: 'facebook',
    tone: 'professional',
    length: 'medium',
    cta_style: 'enquire_now',
    avoid_emojis: false,
    include_hashtags: true,
  },
  listing: baseListing,
};

describe('buildAdCopyPrompt', () => {
  it('returns systemPrompt and userPrompt strings', () => {
    const result = buildAdCopyPrompt(baseInput);
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('userPrompt');
    expect(typeof result.systemPrompt).toBe('string');
    expect(typeof result.userPrompt).toBe('string');
  });

  describe('system prompt', () => {
    it('includes platform constraints for facebook', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.systemPrompt).toContain('Facebook feed');
    });

    it('includes tone instructions', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.systemPrompt).toContain('professional');
    });

    it('includes length limits for medium', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.systemPrompt).toContain('81–150 words');
    });

    it('includes CTA phrase', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.systemPrompt).toContain('Enquire Now');
    });

    it('includes target audience when provided', () => {
      const input: AdCopyPromptInput = {
        ...baseInput,
        params: { ...baseInput.params, target_audience: 'investor' },
      };
      const result = buildAdCopyPrompt(input);
      expect(result.systemPrompt).toContain('rental yield');
    });

    it('omits target audience section when not provided', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.systemPrompt).not.toContain('Audience:');
    });

    it('instructs no emojis when avoid_emojis is true', () => {
      const input: AdCopyPromptInput = {
        ...baseInput,
        params: { ...baseInput.params, avoid_emojis: true },
      };
      const result = buildAdCopyPrompt(input);
      expect(result.systemPrompt).toContain('Do NOT use any emojis');
    });

    it('includes hashtag instruction when include_hashtags is true', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.systemPrompt).toContain('5–15 relevant hashtags');
    });

    it('instructs no hashtags when include_hashtags is false', () => {
      const input: AdCopyPromptInput = {
        ...baseInput,
        params: { ...baseInput.params, include_hashtags: false },
      };
      const result = buildAdCopyPrompt(input);
      expect(result.systemPrompt).toContain('Do NOT include any hashtags');
    });

    it('specifies JSON output format with variant types', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.systemPrompt).toContain('primary_caption');
      expect(result.systemPrompt).toContain('short_headline');
      expect(result.systemPrompt).toContain('cta_line');
      expect(result.systemPrompt).toContain('short_form');
      expect(result.systemPrompt).toContain('instagram_caption');
      expect(result.systemPrompt).toContain('whatsapp_promo');
    });
  });

  describe('user prompt - listing fields', () => {
    it('always includes mandatory fields', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.userPrompt).toContain('Address: 123 Orchard Road #10-01');
      expect(result.userPrompt).toContain('Property type: Condominium');
      expect(result.userPrompt).toContain('Listing type: Sale');
      expect(result.userPrompt).toContain('Asking price: $2,500,000');
    });

    it('includes non-null optional fields', () => {
      const result = buildAdCopyPrompt(baseInput);
      expect(result.userPrompt).toContain('Postal code: 238858');
      expect(result.userPrompt).toContain('District: D09');
      expect(result.userPrompt).toContain('Floor area: 1,200 sqft');
      expect(result.userPrompt).toContain('Tenure: 99-year leasehold');
      expect(result.userPrompt).toContain('TOP year: 2010');
      expect(result.userPrompt).toContain('Description: Spacious unit with city views');
    });

    it('omits null optional fields', () => {
      const listing: ListingData = {
        ...baseListing,
        postal_code: null,
        district: null,
        floor_area_sqft: null,
        tenure: null,
        completion_year: null,
        description: null,
      };
      const input: AdCopyPromptInput = { ...baseInput, listing };
      const result = buildAdCopyPrompt(input);

      expect(result.userPrompt).not.toContain('Postal code:');
      expect(result.userPrompt).not.toContain('District:');
      expect(result.userPrompt).not.toContain('Floor area:');
      expect(result.userPrompt).not.toContain('Tenure:');
      expect(result.userPrompt).not.toContain('TOP year:');
      expect(result.userPrompt).not.toContain('Description:');
    });

    it('includes asking_rental for rental listings', () => {
      const listing: ListingData = {
        ...baseListing,
        asking_price: null,
        asking_rental: 5000,
        listing_type: 'Rent',
      };
      const input: AdCopyPromptInput = { ...baseInput, listing };
      const result = buildAdCopyPrompt(input);

      expect(result.userPrompt).toContain('Asking rental: $5,000/mo');
      expect(result.userPrompt).not.toContain('Asking price:');
    });
  });

  describe('user prompt - agent attribution', () => {
    const agent: AgentInfo = {
      full_name: 'John Tan',
      phone: '+6591234567',
      cea_licence_number: 'R012345A',
    };

    it('includes agent info when tenant requires attribution', () => {
      const tenantConfig: TenantConfig = {
        cea_registration_number: 'L3001234A',
        requires_agent_attribution: true,
      };
      const input: AdCopyPromptInput = { ...baseInput, agent, tenantConfig };
      const result = buildAdCopyPrompt(input);

      expect(result.userPrompt).toContain('Agent: John Tan');
      expect(result.userPrompt).toContain('Phone: +6591234567');
      expect(result.userPrompt).toContain('CEA licence: R012345A');
      expect(result.userPrompt).toContain('CEA registration number: L3001234A');
    });

    it('includes CEA registration number even without agent attribution', () => {
      const tenantConfig: TenantConfig = {
        cea_registration_number: 'L3001234A',
        requires_agent_attribution: false,
      };
      const input: AdCopyPromptInput = { ...baseInput, agent, tenantConfig };
      const result = buildAdCopyPrompt(input);

      expect(result.userPrompt).toContain('CEA registration number: L3001234A');
      expect(result.userPrompt).not.toContain('Agent: John Tan');
    });

    it('omits agent section when no tenant config', () => {
      const input: AdCopyPromptInput = { ...baseInput, agent };
      const result = buildAdCopyPrompt(input);

      expect(result.userPrompt).not.toContain('Agent Attribution');
    });

    it('omits agent section when tenant does not require attribution and has no CEA number', () => {
      const tenantConfig: TenantConfig = {
        cea_registration_number: null,
        requires_agent_attribution: false,
      };
      const input: AdCopyPromptInput = { ...baseInput, agent, tenantConfig };
      const result = buildAdCopyPrompt(input);

      expect(result.userPrompt).not.toContain('Agent Attribution');
    });
  });
});
