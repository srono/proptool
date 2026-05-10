import { describe, it, expect } from 'vitest';
import { parseAdCopyResponse } from '../ad-copy-response-parser';

function makeValidVariants(overrides: Record<string, unknown> = {}) {
  return [
    { type: 'primary_caption', platform: 'facebook', content: 'A great property listing caption.', ...overrides },
    { type: 'short_headline', platform: 'facebook', content: 'Dream Home Awaits', ...overrides },
    { type: 'cta_line', platform: 'facebook', content: 'Enquire now for a viewing!', ...overrides },
    { type: 'short_form', platform: 'generic', content: 'Beautiful 3BR condo in District 9.', ...overrides },
    { type: 'instagram_caption', platform: 'instagram', content: 'Stunning property in the heart of the city.', ...overrides },
    { type: 'whatsapp_promo', platform: 'whatsapp', content: 'Hi! Check out this amazing listing.', ...overrides },
  ];
}

function makeValidHashtags() {
  return {
    type: 'hashtags',
    platform: 'generic',
    content: '#property #singapore #condo #realestate #luxury #district9 #newlaunch #freehold #3bedroom #investment',
  };
}

describe('parseAdCopyResponse', () => {
  describe('JSON parsing', () => {
    it('returns error for invalid JSON', () => {
      const result = parseAdCopyResponse('not json', false);
      expect(result).toEqual({ success: false, error: 'Invalid JSON response from AI model' });
    });

    it('returns error for empty string', () => {
      const result = parseAdCopyResponse('', false);
      expect(result).toEqual({ success: false, error: 'Invalid JSON response from AI model' });
    });

    it('returns error for non-array, non-object JSON', () => {
      const result = parseAdCopyResponse('"hello"', false);
      expect(result).toEqual({ success: false, error: 'Response is not an array of variants' });
    });

    it('returns error for object without variants key', () => {
      const result = parseAdCopyResponse('{"data": []}', false);
      expect(result).toEqual({ success: false, error: 'Response is not an array of variants' });
    });
  });

  describe('successful parsing', () => {
    it('parses a valid top-level array response', () => {
      const input = JSON.stringify(makeValidVariants());
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.variants).toHaveLength(6);
        expect(result.variants[0].type).toBe('primary_caption');
        expect(result.variants[0].max_length).toBe(2000);
      }
    });

    it('parses a valid response with variants key', () => {
      const input = JSON.stringify({ variants: makeValidVariants() });
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.variants).toHaveLength(6);
      }
    });

    it('assigns correct max_length for each variant type', () => {
      const input = JSON.stringify(makeValidVariants());
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
      if (result.success) {
        const byType = Object.fromEntries(result.variants.map((v) => [v.type, v]));
        expect(byType.primary_caption.max_length).toBe(2000);
        expect(byType.short_headline.max_length).toBe(100);
        expect(byType.cta_line.max_length).toBe(150);
        expect(byType.short_form.max_length).toBe(280);
        expect(byType.instagram_caption.max_length).toBe(2200);
        expect(byType.whatsapp_promo.max_length).toBe(1000);
      }
    });

    it('defaults platform to generic when not provided', () => {
      const variants = makeValidVariants();
      // Remove platform from all
      const noPlatform = variants.map(({ platform: _p, ...rest }) => rest);
      const input = JSON.stringify(noPlatform);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
      if (result.success) {
        result.variants.forEach((v) => {
          expect(v.platform).toBe('generic');
        });
      }
    });
  });

  describe('hashtag validation', () => {
    it('includes hashtags variant when includeHashtags is true', () => {
      const variants = [...makeValidVariants(), makeValidHashtags()];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.variants).toHaveLength(7);
        expect(result.variants.find((v) => v.type === 'hashtags')).toBeDefined();
      }
    });

    it('returns error when hashtags are required but missing', () => {
      const input = JSON.stringify(makeValidVariants());
      const result = parseAdCopyResponse(input, true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Missing required variant type: hashtags');
      }
    });

    it('skips hashtags variant when includeHashtags is false', () => {
      const variants = [...makeValidVariants(), makeValidHashtags()];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.variants).toHaveLength(6);
        expect(result.variants.find((v) => v.type === 'hashtags')).toBeUndefined();
      }
    });

    it('returns error when hashtag count is below 5', () => {
      const hashtags = { type: 'hashtags', platform: 'generic', content: '#one #two #three #four' };
      const variants = [...makeValidVariants(), hashtags];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Hashtag count must be between 5 and 15');
      }
    });

    it('returns error when hashtag count exceeds 15', () => {
      const tags = Array.from({ length: 16 }, (_, i) => `#tag${i}`).join(' ');
      const hashtags = { type: 'hashtags', platform: 'generic', content: tags };
      const variants = [...makeValidVariants(), hashtags];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Hashtag count must be between 5 and 15');
      }
    });

    it('accepts exactly 5 hashtags', () => {
      const tags = '#one #two #three #four #five';
      const hashtags = { type: 'hashtags', platform: 'generic', content: tags };
      const variants = [...makeValidVariants(), hashtags];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, true);
      expect(result.success).toBe(true);
    });

    it('accepts exactly 15 hashtags', () => {
      const tags = Array.from({ length: 15 }, (_, i) => `#tag${i}`).join(' ');
      const hashtags = { type: 'hashtags', platform: 'generic', content: tags };
      const variants = [...makeValidVariants(), hashtags];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, true);
      expect(result.success).toBe(true);
    });
  });

  describe('character limit validation', () => {
    it('returns error when primary_caption exceeds 2000 chars', () => {
      const variants = makeValidVariants();
      variants[0].content = 'a'.repeat(2001);
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('primary_caption');
        expect(result.error).toContain('2000');
      }
    });

    it('returns error when short_headline exceeds 100 chars', () => {
      const variants = makeValidVariants();
      variants[1].content = 'a'.repeat(101);
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('short_headline');
        expect(result.error).toContain('100');
      }
    });

    it('returns error when cta_line exceeds 150 chars', () => {
      const variants = makeValidVariants();
      variants[2].content = 'a'.repeat(151);
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('cta_line');
        expect(result.error).toContain('150');
      }
    });

    it('returns error when short_form exceeds 280 chars', () => {
      const variants = makeValidVariants();
      variants[3].content = 'a'.repeat(281);
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('short_form');
        expect(result.error).toContain('280');
      }
    });

    it('accepts content at exactly the max length', () => {
      const variants = makeValidVariants();
      variants[0].content = 'a'.repeat(2000);
      variants[1].content = 'a'.repeat(100);
      variants[2].content = 'a'.repeat(150);
      variants[3].content = 'a'.repeat(280);
      variants[4].content = 'a'.repeat(2200);
      variants[5].content = 'a'.repeat(1000);
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
    });
  });

  describe('missing variant types', () => {
    it('returns error when a required variant type is missing', () => {
      const variants = makeValidVariants().filter((v) => v.type !== 'cta_line');
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Missing required variant types');
        expect(result.error).toContain('cta_line');
      }
    });

    it('returns error when multiple required variant types are missing', () => {
      const variants = makeValidVariants().filter(
        (v) => v.type !== 'cta_line' && v.type !== 'short_form'
      );
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('cta_line');
        expect(result.error).toContain('short_form');
      }
    });
  });

  describe('content validation', () => {
    it('returns error when variant has empty content', () => {
      const variants = makeValidVariants();
      variants[0].content = '';
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('empty or missing content');
      }
    });

    it('returns error when variant has whitespace-only content', () => {
      const variants = makeValidVariants();
      variants[0].content = '   ';
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('empty or missing content');
      }
    });

    it('skips items with invalid type values', () => {
      const variants = [
        ...makeValidVariants(),
        { type: 'unknown_type', platform: 'facebook', content: 'Some content' },
      ];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.variants).toHaveLength(6);
      }
    });

    it('skips null and non-object items in the array', () => {
      const variants = [null, 42, 'string', ...makeValidVariants()];
      const input = JSON.stringify(variants);
      const result = parseAdCopyResponse(input, false);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.variants).toHaveLength(6);
      }
    });
  });
});
