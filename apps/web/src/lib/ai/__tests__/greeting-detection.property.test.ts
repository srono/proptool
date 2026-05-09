import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldUseFirstName } from '../greeting-detection';
import type { Message } from '@propagent/shared';

/**
 * Feature: ai-reply-suggestions, Property 11: First-Name Greeting Detection
 *
 * Validates: Requirements 8.5
 *
 * For any conversation message history, the "use first name" flag SHALL be true when:
 * (a) the most recent inbound message is the first message in the conversation; OR
 * (b) the time gap between the most recent inbound message and the preceding outbound message is 24 hours or more.
 * In all other cases, the flag SHALL be false.
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Base date for generating timestamps
const BASE_DATE = new Date('2024-01-01T00:00:00Z').getTime();

function makeMessage(direction: 'inbound' | 'outbound', sentAt: Date): Message {
  return {
    id: crypto.randomUUID(),
    tenant_id: 'tenant-1',
    contact_id: 'contact-1',
    lead_id: null,
    wa_number_id: null,
    direction,
    channel: 'whatsapp',
    body: 'Test message',
    media_url: null,
    wa_message_id: null,
    status: 'delivered',
    sent_at: sentAt.toISOString(),
  };
}

// Generator for a direction
const directionArb = fc.constantFrom<'inbound' | 'outbound'>('inbound', 'outbound');

// Generator for a timestamp offset (0 to 30 days in milliseconds)
const timestampOffsetArb = fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 });

describe('Property 11: First-Name Greeting Detection', () => {
  it('returns true when the most recent inbound is the first message (no preceding outbound)', () => {
    // Generate a list of inbound-only messages (no outbound at all before the most recent inbound)
    // The most recent inbound has no preceding outbound → should return true
    const inboundMessagesArb = fc
      .array(timestampOffsetArb, { minLength: 1, maxLength: 10 })
      .map((offsets) => {
        // Sort offsets to create chronological messages, all inbound
        const sorted = [...offsets].sort((a, b) => a - b);
        return sorted.map((offset) => makeMessage('inbound', new Date(BASE_DATE + offset)));
      });

    fc.assert(
      fc.property(inboundMessagesArb, (messages) => {
        // All messages are inbound, so the most recent inbound has no preceding outbound
        const result = shouldUseFirstName(messages);
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns true when the most recent inbound is the very first message in the conversation', () => {
    // Generate conversations where the first chronological message is inbound
    // and it is also the most recent inbound (only one inbound, at position 0)
    const singleInboundFirstArb = fc
      .tuple(timestampOffsetArb, fc.array(timestampOffsetArb, { minLength: 0, maxLength: 5 }))
      .map(([inboundOffset, outboundOffsets]) => {
        // The inbound message is at the earliest time
        const inboundTime = BASE_DATE + inboundOffset;
        const messages: Message[] = [makeMessage('inbound', new Date(inboundTime))];
        // All outbound messages come after the inbound
        for (const offset of outboundOffsets) {
          messages.push(
            makeMessage('outbound', new Date(inboundTime + offset + 1))
          );
        }
        return messages;
      });

    fc.assert(
      fc.property(singleInboundFirstArb, (messages) => {
        // The most recent inbound is at index 0 (first message), so should return true
        const result = shouldUseFirstName(messages);
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns true when the gap between most recent inbound and preceding outbound is >= 24 hours', () => {
    // Generate conversations where there IS a preceding outbound before the most recent inbound
    // and the gap is >= 24 hours
    const largeGapArb = fc
      .tuple(
        timestampOffsetArb, // outbound time offset from BASE_DATE
        fc.integer({ min: TWENTY_FOUR_HOURS_MS, max: 7 * TWENTY_FOUR_HOURS_MS }) // gap >= 24h
      )
      .chain(([outboundOffset, gap]) => {
        const outboundTime = BASE_DATE + outboundOffset;
        const inboundTime = outboundTime + gap;

        // Optionally add earlier messages (before the outbound) to make it more realistic
        return fc
          .array(
            fc.tuple(directionArb, fc.integer({ min: 0, max: outboundOffset })),
            { minLength: 0, maxLength: 5 }
          )
          .map((earlierMessages) => {
            const messages: Message[] = earlierMessages.map(([dir, offset]) =>
              makeMessage(dir, new Date(BASE_DATE + offset))
            );
            // Add the preceding outbound
            messages.push(makeMessage('outbound', new Date(outboundTime)));
            // Add the most recent inbound with gap >= 24h
            messages.push(makeMessage('inbound', new Date(inboundTime)));
            return messages;
          });
      });

    fc.assert(
      fc.property(largeGapArb, (messages) => {
        const result = shouldUseFirstName(messages);
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns false when the gap between most recent inbound and preceding outbound is < 24 hours', () => {
    // Generate conversations where there IS a preceding outbound before the most recent inbound
    // and the gap is < 24 hours (but > 0)
    const smallGapArb = fc
      .tuple(
        timestampOffsetArb, // outbound time offset from BASE_DATE
        fc.integer({ min: 1, max: TWENTY_FOUR_HOURS_MS - 1 }) // gap < 24h, > 0
      )
      .chain(([outboundOffset, gap]) => {
        const outboundTime = BASE_DATE + outboundOffset;
        const inboundTime = outboundTime + gap;

        // Optionally add earlier messages (before the outbound) that include at least one outbound
        return fc
          .array(
            fc.tuple(directionArb, fc.integer({ min: 0, max: outboundOffset })),
            { minLength: 0, maxLength: 5 }
          )
          .map((earlierMessages) => {
            const messages: Message[] = earlierMessages.map(([dir, offset]) =>
              makeMessage(dir, new Date(BASE_DATE + offset))
            );
            // Add the preceding outbound
            messages.push(makeMessage('outbound', new Date(outboundTime)));
            // Add the most recent inbound with gap < 24h
            messages.push(makeMessage('inbound', new Date(inboundTime)));
            return messages;
          });
      });

    fc.assert(
      fc.property(smallGapArb, (messages) => {
        const result = shouldUseFirstName(messages);
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
