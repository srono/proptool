import type { Message } from '@agentos/shared';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Determines whether the AI should use the contact's first name in greeting suggestions.
 *
 * Returns true when:
 * - The most recent inbound message is the first message in the conversation, OR
 * - The time gap between the most recent inbound message and the preceding outbound message is 24 hours or more.
 *
 * Messages are expected in chronological order (oldest first).
 */
export function shouldUseFirstName(messages: Message[]): boolean {
  if (messages.length === 0) {
    return false;
  }

  // Sort messages by sent_at ascending (chronological order)
  const sorted = [...messages].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  // Find the most recent inbound message
  let mostRecentInboundIndex = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].direction === 'inbound') {
      mostRecentInboundIndex = i;
      break;
    }
  }

  // No inbound messages at all
  if (mostRecentInboundIndex === -1) {
    return false;
  }

  // (a) The most recent inbound message is the first message in the conversation
  if (mostRecentInboundIndex === 0) {
    return true;
  }

  // (b) Find the preceding outbound message before the most recent inbound
  let precedingOutboundIndex = -1;
  for (let i = mostRecentInboundIndex - 1; i >= 0; i--) {
    if (sorted[i].direction === 'outbound') {
      precedingOutboundIndex = i;
      break;
    }
  }

  // No preceding outbound message means the inbound is effectively the first interaction
  if (precedingOutboundIndex === -1) {
    return true;
  }

  // Check if the gap between the most recent inbound and the preceding outbound is ≥ 24 hours
  const inboundTime = new Date(sorted[mostRecentInboundIndex].sent_at).getTime();
  const outboundTime = new Date(sorted[precedingOutboundIndex].sent_at).getTime();
  const gap = inboundTime - outboundTime;

  return gap >= TWENTY_FOUR_HOURS_MS;
}
