import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatRelativeActivity,
  formatCreatedDate,
  formatSourceLabel,
  formatDealTypeLabel,
} from '../utils/format-lead-fields';

describe('formatRelativeActivity', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "—" for null', () => {
    expect(formatRelativeActivity(null)).toBe('—');
  });

  it('returns "Today" for a date today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:00:00Z'));
    expect(formatRelativeActivity('2024-06-15T10:00:00Z')).toBe('Today');
    vi.useRealTimers();
  });

  it('returns "{n}d ago" for past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:00:00Z'));
    expect(formatRelativeActivity('2024-06-13T14:00:00Z')).toBe('2d ago');
    expect(formatRelativeActivity('2024-06-01T14:00:00Z')).toBe('14d ago');
    vi.useRealTimers();
  });
});

describe('formatCreatedDate', () => {
  it('formats date as DD MMM YYYY', () => {
    expect(formatCreatedDate('2024-01-15T00:00:00Z')).toBe('15 Jan 2024');
    expect(formatCreatedDate('2023-12-01T00:00:00Z')).toBe('01 Dec 2023');
    expect(formatCreatedDate('2024-06-30T00:00:00Z')).toBe('30 Jun 2024');
  });
});

describe('formatSourceLabel', () => {
  it('maps known source keys to display labels', () => {
    expect(formatSourceLabel('facebook_ad')).toBe('Facebook Ad');
    expect(formatSourceLabel('instagram_ad')).toBe('Instagram Ad');
    expect(formatSourceLabel('portal')).toBe('Portal');
    expect(formatSourceLabel('whatsapp')).toBe('WhatsApp');
    expect(formatSourceLabel('referral')).toBe('Referral');
    expect(formatSourceLabel('open_house')).toBe('Open House');
    expect(formatSourceLabel('web_form')).toBe('Web Form');
    expect(formatSourceLabel('manual')).toBe('Manual');
  });

  it('returns the key itself for unknown sources', () => {
    expect(formatSourceLabel('unknown_source')).toBe('unknown_source');
  });
});

describe('formatDealTypeLabel', () => {
  it('maps known deal type keys to display labels', () => {
    expect(formatDealTypeLabel('sale')).toBe('Sale');
    expect(formatDealTypeLabel('resale')).toBe('Resale');
    expect(formatDealTypeLabel('rental')).toBe('Rental');
    expect(formatDealTypeLabel('landlord_rep')).toBe('Landlord Rep');
    expect(formatDealTypeLabel('tenant_rep')).toBe('Tenant Rep');
  });

  it('returns the key itself for unknown deal types', () => {
    expect(formatDealTypeLabel('unknown_type')).toBe('unknown_type');
  });
});
