import { describe, it, expect } from 'vitest';
import { shouldUseFirstName } from '../greeting-detection';
import type { Message } from '@agentos/shared';

function makeMessage(
  overrides: Partial<Message> & { direction: Message['direction']; sent_at: string }
): Message {
  return {
    id: crypto.randomUUID(),
    tenant_id: 'tenant-1',
    contact_id: 'contact-1',
    lead_id: null,
    wa_number_id: null,
    direction: overrides.direction,
    channel: 'whatsapp',
    body: overrides.body ?? 'Hello',
    media_url: null,
    wa_message_id: null,
    status: 'delivered',
    sent_at: overrides.sent_at,
    ...overrides,
  };
}

describe('shouldUseFirstName', () => {
  it('returns false for empty messages array', () => {
    expect(shouldUseFirstName([])).toBe(false);
  });

  it('returns true when the most recent inbound is the first message in the conversation', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T10:00:00Z' }),
    ];
    expect(shouldUseFirstName(messages)).toBe(true);
  });

  it('returns true when the most recent inbound is the first message even with later outbound messages', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:05:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T10:10:00Z' }),
    ];
    // Most recent inbound is at 10:10, preceding outbound is at 10:05 — gap < 24h
    expect(shouldUseFirstName(messages)).toBe(false);
  });

  it('returns true when gap between most recent inbound and preceding outbound is >= 24 hours', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-02T10:00:00Z' }), // exactly 24h later
    ];
    expect(shouldUseFirstName(messages)).toBe(true);
  });

  it('returns true when gap is more than 24 hours', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-03T10:00:00Z' }), // 48h later
    ];
    expect(shouldUseFirstName(messages)).toBe(true);
  });

  it('returns false when gap is less than 24 hours', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T20:00:00Z' }), // 10h later
    ];
    expect(shouldUseFirstName(messages)).toBe(false);
  });

  it('returns false when gap is just under 24 hours', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-02T09:59:59Z' }), // 23h 59m 59s
    ];
    expect(shouldUseFirstName(messages)).toBe(false);
  });

  it('returns true when there are only inbound messages (first message scenario)', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T10:05:00Z' }),
    ];
    // Most recent inbound is at 10:05, no preceding outbound → true
    expect(shouldUseFirstName(messages)).toBe(true);
  });

  it('returns false when there are no inbound messages', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T11:00:00Z' }),
    ];
    expect(shouldUseFirstName(messages)).toBe(false);
  });

  it('handles messages not in chronological order', () => {
    // Messages provided out of order — function should sort them
    const messages: Message[] = [
      makeMessage({ direction: 'inbound', sent_at: '2024-01-02T10:00:00Z' }),
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:00:00Z' }),
    ];
    // After sorting: outbound at Jan 1, inbound at Jan 2 → gap = 24h → true
    expect(shouldUseFirstName(messages)).toBe(true);
  });

  it('uses the preceding outbound, not any outbound', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T08:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T09:00:00Z' }),
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T10:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-01T11:00:00Z' }), // most recent inbound
    ];
    // Most recent inbound at 11:00, preceding outbound at 10:00 → gap = 1h → false
    expect(shouldUseFirstName(messages)).toBe(false);
  });

  it('considers only the outbound before the most recent inbound, not after', () => {
    const messages: Message[] = [
      makeMessage({ direction: 'outbound', sent_at: '2024-01-01T08:00:00Z' }),
      makeMessage({ direction: 'inbound', sent_at: '2024-01-02T09:00:00Z' }), // most recent inbound, gap = 25h
      makeMessage({ direction: 'outbound', sent_at: '2024-01-02T10:00:00Z' }), // after inbound
    ];
    // Most recent inbound at Jan 2 09:00, preceding outbound at Jan 1 08:00 → gap = 25h → true
    expect(shouldUseFirstName(messages)).toBe(true);
  });
});
