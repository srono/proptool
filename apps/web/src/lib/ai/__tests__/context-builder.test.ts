import { describe, it, expect } from 'vitest';
import { buildConversationContext } from '../context-builder';
import type { Message } from '@agentos/shared';

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    tenant_id: 'tenant-1',
    contact_id: 'contact-1',
    lead_id: null,
    wa_number_id: null,
    direction: 'inbound',
    channel: 'whatsapp',
    body: 'Hello',
    media_url: null,
    wa_message_id: null,
    status: 'delivered',
    sent_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

describe('buildConversationContext', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  it('returns empty array for empty messages', () => {
    const result = buildConversationContext([], now);
    expect(result).toEqual([]);
  });

  it('includes direction, body, and relativeTime for each message', () => {
    const messages = [
      makeMessage({ direction: 'inbound', body: 'Hi there', sent_at: '2024-06-15T11:00:00Z' }),
    ];
    const result = buildConversationContext(messages, now);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      direction: 'inbound',
      body: 'Hi there',
      relativeTime: '1 hour ago',
    });
  });

  it('orders messages by sent_at descending (most recent first)', () => {
    const messages = [
      makeMessage({ id: '1', body: 'First', sent_at: '2024-06-15T09:00:00Z' }),
      makeMessage({ id: '2', body: 'Third', sent_at: '2024-06-15T11:30:00Z' }),
      makeMessage({ id: '3', body: 'Second', sent_at: '2024-06-15T10:00:00Z' }),
    ];
    const result = buildConversationContext(messages, now);
    expect(result.map((m) => m.body)).toEqual(['Third', 'Second', 'First']);
  });

  it('limits to 20 most recent messages', () => {
    const messages = Array.from({ length: 30 }, (_, i) =>
      makeMessage({
        id: `msg-${i}`,
        body: `Message ${i}`,
        sent_at: new Date(Date.UTC(2024, 5, 15, 0, i)).toISOString(),
      })
    );
    const result = buildConversationContext(messages, now);
    expect(result).toHaveLength(20);
    // Should have the 20 most recent (highest minute values)
    expect(result[0].body).toBe('Message 29');
    expect(result[19].body).toBe('Message 10');
  });

  it('returns all messages when fewer than 20', () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMessage({
        id: `msg-${i}`,
        body: `Message ${i}`,
        sent_at: new Date(Date.UTC(2024, 5, 15, 0, i)).toISOString(),
      })
    );
    const result = buildConversationContext(messages, now);
    expect(result).toHaveLength(5);
  });

  it('computes "just now" for messages less than 60 seconds ago', () => {
    const messages = [
      makeMessage({ sent_at: '2024-06-15T11:59:30Z' }),
    ];
    const result = buildConversationContext(messages, now);
    expect(result[0].relativeTime).toBe('just now');
  });

  it('computes minutes ago correctly', () => {
    const messages = [
      makeMessage({ sent_at: '2024-06-15T11:55:00Z' }),
    ];
    const result = buildConversationContext(messages, now);
    expect(result[0].relativeTime).toBe('5 minutes ago');
  });

  it('computes hours ago correctly', () => {
    const messages = [
      makeMessage({ sent_at: '2024-06-15T09:00:00Z' }),
    ];
    const result = buildConversationContext(messages, now);
    expect(result[0].relativeTime).toBe('3 hours ago');
  });

  it('computes days ago correctly', () => {
    const messages = [
      makeMessage({ sent_at: '2024-06-13T12:00:00Z' }),
    ];
    const result = buildConversationContext(messages, now);
    expect(result[0].relativeTime).toBe('2 days ago');
  });

  it('computes weeks ago correctly', () => {
    const messages = [
      makeMessage({ sent_at: '2024-06-01T12:00:00Z' }),
    ];
    const result = buildConversationContext(messages, now);
    expect(result[0].relativeTime).toBe('2 weeks ago');
  });

  it('uses current time when now is not provided', () => {
    const recentMessage = makeMessage({
      sent_at: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    });
    const result = buildConversationContext([recentMessage]);
    expect(result[0].relativeTime).toBe('just now');
  });

  it('does not mutate the original messages array', () => {
    const messages = [
      makeMessage({ id: '1', body: 'First', sent_at: '2024-06-15T09:00:00Z' }),
      makeMessage({ id: '2', body: 'Second', sent_at: '2024-06-15T11:00:00Z' }),
    ];
    const originalOrder = messages.map((m) => m.id);
    buildConversationContext(messages, now);
    expect(messages.map((m) => m.id)).toEqual(originalOrder);
  });
});
