/**
 * Scheduling intent detection via case-insensitive keyword matching.
 * Used to determine whether to invoke the Calendar Availability Checker
 * before generating reply suggestions.
 */

const SCHEDULING_KEYWORDS = [
  'viewing',
  'view',
  'appointment',
  'meeting',
  'available',
  'availability',
  'free',
  'schedule',
  'reschedule',
  'what time',
  'when can',
  'slot',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'tomorrow',
  'today',
  'next week',
  'this week',
  'morning',
  'afternoon',
  'evening',
];

/**
 * Detects whether a message contains scheduling intent by checking for
 * the presence of scheduling-related keywords (case-insensitive).
 *
 * @param message - The message text to analyze
 * @returns true if any scheduling keyword is found in the message
 */
export function detectSchedulingIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return SCHEDULING_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

export { SCHEDULING_KEYWORDS };
