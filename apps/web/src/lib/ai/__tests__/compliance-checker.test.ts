import { describe, it, expect } from 'vitest';
import { checkCompliance } from '../compliance-checker';

describe('compliance-checker', () => {
  describe('unsupported superlatives', () => {
    it('flags "best deal"', () => {
      const result = checkCompliance('This is the best deal in town!');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].category).toBe('unsupported_superlative');
      expect(result.warnings[0].phrase.toLowerCase()).toBe('best deal');
    });

    it('flags "guaranteed return"', () => {
      const result = checkCompliance('Enjoy a guaranteed return on your investment.');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].category).toBe('unsupported_superlative');
      expect(result.warnings[0].phrase.toLowerCase()).toBe('guaranteed return');
    });

    it('flags "highest yield"', () => {
      const result = checkCompliance('This property offers the highest yield.');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].category).toBe('unsupported_superlative');
      expect(result.warnings[0].phrase.toLowerCase()).toBe('highest yield');
    });

    it('flags "number one"', () => {
      const result = checkCompliance('We are the number one agency.');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].category).toBe('unsupported_superlative');
      expect(result.warnings[0].phrase.toLowerCase()).toBe('number one');
    });

    it('flags "top performer"', () => {
      const result = checkCompliance('A top performer in the market.');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].category).toBe('unsupported_superlative');
      expect(result.warnings[0].phrase.toLowerCase()).toBe('top performer');
    });

    it('is case-insensitive', () => {
      const result = checkCompliance('This is the BEST DEAL ever!');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].category).toBe('unsupported_superlative');
    });
  });

  describe('misleading claims', () => {
    it('flags specific appreciation rates', () => {
      const result = checkCompliance('Expect 5% annual appreciation.');
      expect(result.warnings.some(w => w.category === 'misleading_claim')).toBe(true);
    });

    it('flags guaranteed rental return percentages', () => {
      const result = checkCompliance('Guaranteed returns of 8% per annum.');
      expect(result.warnings.some(w => w.category === 'misleading_claim')).toBe(true);
    });

    it('flags assured financing approval', () => {
      const result = checkCompliance('Assured financing approval for all buyers.');
      expect(result.warnings.some(w => w.category === 'misleading_claim')).toBe(true);
    });

    it('flags "last unit"', () => {
      const result = checkCompliance('Hurry, last unit available!');
      expect(result.warnings.some(w => w.category === 'misleading_claim')).toBe(true);
    });

    it('flags "selling fast"', () => {
      const result = checkCompliance('Units are selling fast!');
      expect(result.warnings.some(w => w.category === 'misleading_claim')).toBe(true);
    });

    it('flags "limited time only"', () => {
      const result = checkCompliance('Limited time only offer!');
      expect(result.warnings.some(w => w.category === 'misleading_claim')).toBe(true);
    });
  });

  describe('discriminatory language', () => {
    it('flags race-based targeting', () => {
      const result = checkCompliance('Ideal for Chinese families.');
      expect(result.warnings.some(w => w.category === 'discriminatory_language')).toBe(true);
    });

    it('flags religion-based exclusion', () => {
      const result = checkCompliance('No Muslims allowed.');
      expect(result.warnings.some(w => w.category === 'discriminatory_language')).toBe(true);
    });

    it('flags age-based targeting', () => {
      const result = checkCompliance('Young only preferred.');
      expect(result.warnings.some(w => w.category === 'discriminatory_language')).toBe(true);
    });

    it('flags sex-based targeting', () => {
      const result = checkCompliance('Females only preferred.');
      expect(result.warnings.some(w => w.category === 'discriminatory_language')).toBe(true);
    });

    it('flags family status exclusion', () => {
      const result = checkCompliance('No children allowed in this unit.');
      expect(result.warnings.some(w => w.category === 'discriminatory_language')).toBe(true);
    });
  });

  describe('unverified factual claims', () => {
    it('flags numeric walking-distance claims', () => {
      const result = checkCompliance('Just 5 minutes walk to the park.');
      expect(result.warnings.some(w => w.category === 'unverified_factual_claim')).toBe(true);
    });

    it('flags school proximity with distance', () => {
      const result = checkCompliance('School is 200 meters away.');
      expect(result.warnings.some(w => w.category === 'unverified_factual_claim')).toBe(true);
    });

    it('flags MRT proximity with distance', () => {
      const result = checkCompliance('MRT station just 3 mins walk.');
      expect(result.warnings.some(w => w.category === 'unverified_factual_claim')).toBe(true);
    });

    it('flags stated rental yield percentages', () => {
      const result = checkCompliance('Rental yield of 4.5% per annum.');
      expect(result.warnings.some(w => w.category === 'unverified_factual_claim')).toBe(true);
    });

    it('flags yield percentage in alternate format', () => {
      const result = checkCompliance('Enjoy 3.8% rental yield.');
      expect(result.warnings.some(w => w.category === 'unverified_factual_claim')).toBe(true);
    });
  });

  describe('clean text', () => {
    it('returns zero warnings for compliant text', () => {
      const result = checkCompliance(
        'Beautiful 3-bedroom apartment in District 10. Spacious living area with modern finishes. Contact us for a viewing.'
      );
      expect(result.warnings).toHaveLength(0);
    });

    it('returns zero warnings for empty text', () => {
      const result = checkCompliance('');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('result structure', () => {
    it('returns a valid ComplianceResult with scanned_at timestamp', () => {
      const result = checkCompliance('Some text');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('scanned_at');
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(new Date(result.scanned_at).toISOString()).toBe(result.scanned_at);
    });

    it('deduplicates same phrase in same category', () => {
      const result = checkCompliance('best deal and best deal again');
      const superlativeWarnings = result.warnings.filter(
        w => w.phrase.toLowerCase() === 'best deal'
      );
      expect(superlativeWarnings).toHaveLength(1);
    });
  });
});
