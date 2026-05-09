import type { Message } from '@propagent/shared';

export interface ConversationContextMessage {
  direction: 'inbound' | 'outbound';
  body: string;
  relativeTime: string; // e.g., "2 hours ago"
}

const MAX_CONTEXT_MESSAGES = 20;

/**
 * Computes a human-readable relative time string from a given date to `now`.
 */
function formatRelativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return 'just now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSeconds < 60) {
    return 'just now';
  }

  if (diffMinutes === 1) {
    return '1 minute ago';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  if (diffHours === 1) {
    return '1 hour ago';
  }

  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  if (diffDays === 1) {
    return '1 day ago';
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  if (diffWeeks === 1) {
    return '1 week ago';
  }

  return `${diffWeeks} weeks ago`;
}

/**
 * Builds conversation context from messages for the LLM prompt.
 * Selects up to 20 most recent messages ordered by sent_at descending (most recent first).
 * Each message includes its direction, body, and a human-readable relative time string.
 */
export function buildConversationContext(
  messages: Message[],
  now?: Date
): ConversationContextMessage[] {
  const referenceTime = now ?? new Date();

  // Sort by sent_at descending (most recent first) and take up to 20
  const sorted = [...messages]
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
    .slice(0, MAX_CONTEXT_MESSAGES);

  return sorted.map((msg) => ({
    direction: msg.direction,
    body: msg.body,
    relativeTime: formatRelativeTime(new Date(msg.sent_at), referenceTime),
  }));
}
