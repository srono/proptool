import { describe, it, expect } from 'vitest';
import { computeConsentBadge, ConsentInput } from '../consent';

function makeInput(overrides: Partial<ConsentInput> = {}): ConsentInput {
  return {
    whatsapp_optin: true,
    channel_preference: 'whatsapp',
    ad_purpose: null,
    target_ad_purpose: null,
    dnc_registered: false,
    data_retention_expiry: null,
    task_channel: 'whatsapp',
    ...overrides,
  };
}

describe('computeConsentBadge', () => {
  describe('red conditions', () => {
    it('returns red when whatsapp_optin is false and task_channel is whatsapp', () => {
      const input = makeInput({ whatsapp_optin: false, task_channel: 'whatsapp' });
      expect(computeConsentBadge(input)).toBe('red');
    });

    it('returns red when channel_preference is none', () => {
      const input = makeInput({ channel_preference: 'none' });
      expect(computeConsentBadge(input)).toBe('red');
    });

    it('returns red when data_retention_expiry is in the past', () => {
      const input = makeInput({ data_retention_expiry: '2020-01-01' });
      expect(computeConsentBadge(input)).toBe('red');
    });

    it('returns red when task_channel is call and dnc_registered is true', () => {
      const input = makeInput({ task_channel: 'call', dnc_registered: true });
      expect(computeConsentBadge(input)).toBe('red');
    });
  });

  describe('yellow condition', () => {
    it('returns yellow when whatsapp_optin is true and ad_purpose mismatches target_ad_purpose', () => {
      const input = makeInput({
        whatsapp_optin: true,
        ad_purpose: 'selling',
        target_ad_purpose: 'buying',
      });
      expect(computeConsentBadge(input)).toBe('yellow');
    });

    it('returns green when target_ad_purpose is null (no mismatch possible)', () => {
      const input = makeInput({
        whatsapp_optin: true,
        ad_purpose: 'selling',
        target_ad_purpose: null,
      });
      expect(computeConsentBadge(input)).toBe('green');
    });

    it('returns green when ad_purpose matches target_ad_purpose', () => {
      const input = makeInput({
        whatsapp_optin: true,
        ad_purpose: 'buying',
        target_ad_purpose: 'buying',
      });
      expect(computeConsentBadge(input)).toBe('green');
    });
  });

  describe('green (default)', () => {
    it('returns green when all consent conditions are satisfied', () => {
      const input = makeInput();
      expect(computeConsentBadge(input)).toBe('green');
    });

    it('returns green for call channel without DNC registration', () => {
      const input = makeInput({ task_channel: 'call', dnc_registered: false });
      expect(computeConsentBadge(input)).toBe('green');
    });

    it('returns green when data_retention_expiry is in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const input = makeInput({ data_retention_expiry: futureDate.toISOString().split('T')[0] });
      expect(computeConsentBadge(input)).toBe('green');
    });
  });

  describe('priority (red > yellow > green)', () => {
    it('returns red even when yellow condition also applies', () => {
      const input = makeInput({
        channel_preference: 'none',
        whatsapp_optin: true,
        ad_purpose: 'selling',
        target_ad_purpose: 'buying',
      });
      expect(computeConsentBadge(input)).toBe('red');
    });
  });
});
