import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildConversationContext } from '../context-builder';
import type { Message } from '@agentos/shared';

/**
 * Feature: ai-reply-suggestions, Property 12: Conversation Context Message Limit
 *
 * Validates: Requirements 1.1, 1.3, 6.5
 *
 * For any conversation with N messages, the context builder SHALL select exactly min(N, 20)
 * messages ordered by sent_at descending (most recent first). Each selected message SHALL
 * include its direction, body, and a non-empty relative time string.
 */
describe('Property 12: Conversation Context Message Limit', () => {
  // Generator for a valid Message object
  const messageArb = (sentAt: Date): fc.Arbitrary<Message> =>
    fc.record({
      id: fc.uuid(),
      tenant_id: fc.uuid(),
      contact_id: fc.uuid(),
      lead_id: fc.constant(null),
      wa_number_id: fc.constant(null),
      direction: fc.constantFrom('inbound' as const, 'outbound' as const),
      channel: fc.constantFrom('whatsapp' as const, 'sms' as const, 'email' as const, 'note' as const),
      body: fc.string({ minLength: 1, maxLength: 200 }),
      media_url: fc.constant(null),
      wa_message_id: fc.constant(null),
      status: fc.constantFrom('sent' as const, 'delivered' as const, 'read' as const, 'failed' as const),
      sent_at: fc.constant(sentAt.toISOString()),
    });

  // Generator for an array of messages with distinct timestamps
  const messagesArb = fc
    .array(
      fc.integer({ min: 1, max: 100_000_000 }), // offset in seconds from base date
      { minLength: 0, maxLength: 100 }
    )
    .chain((offsets) => {
      const baseDate = new Date('2024-01-01T00:00:00Z');
      const messageArbs = offsets.map((offset) => {
        const sentAt = new Date(baseDate.getTime() + offset * 1000);
        return messageArb(sentAt);
      });
      return messageArbs.length === 0
        ? fc.constant([] as Message[])
        : fc.tuple(...(messageArbs as [fc.Arbitrary<Message>, ...fc.Arbitrary<Message>[]])).map((msgs) => msgs as Message[]);
    });

  it('selects exactly min(N, 20) messages for any N messages', () => {
    const now = new Date('2025-01-01T00:00:00Z');

    fc.assert(
      fc.property(messagesArb, (messages) => {
        const result = buildConversationContext(messages, now);
        const expected = Math.min(messages.length, 20);
        expect(result).toHaveLength(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('each selected message has direction, body, and non-empty relativeTime', () => {
    const now = new Date('2025-01-01T00:00:00Z');

    fc.assert(
      fc.property(messagesArb, (messages) => {
        const result = buildConversationContext(messages, now);

        for (const msg of result) {
          // direction must be 'inbound' or 'outbound'
          expect(['inbound', 'outbound']).toContain(msg.direction);

          // body must be a string (can be empty if source was empty, but our generator ensures minLength 1)
          expect(typeof msg.body).toBe('string');

          // relativeTime must be a non-empty string
          expect(typeof msg.relativeTime).toBe('string');
          expect(msg.relativeTime.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('messages are ordered by sent_at descending (most recent first)', () => {
    const now = new Date('2025-01-01T00:00:00Z');

    fc.assert(
      fc.property(messagesArb, (messages) => {
        const result = buildConversationContext(messages, now);

        if (result.length <= 1) return; // nothing to check for 0 or 1 messages

        // We need to verify ordering by checking against the original messages.
        // The result should contain the 20 most recent messages in descending order.
        // Since relativeTime is relative, earlier messages should have larger relative times.
        // Instead, let's verify by reconstructing: sort original by sent_at desc, take 20,
        // and check that the bodies match in order.
        const sortedOriginal = [...messages]
          .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
          .slice(0, 20);

        expect(result.map((m) => m.body)).toEqual(sortedOriginal.map((m) => m.body));
        expect(result.map((m) => m.direction)).toEqual(sortedOriginal.map((m) => m.direction));
      }),
      { numRuns: 100 }
    );
  });
});
