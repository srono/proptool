import type { Suggestion, SuggestionCategory } from '@propagent/shared';

const VALID_CATEGORIES: SuggestionCategory[] = [
  'greeting',
  'scheduling',
  'listing_info',
  'follow_up',
  'general',
];

/**
 * Parses the raw LLM response string into validated Suggestion objects.
 *
 * - Returns empty array if the string is not valid JSON
 * - Excludes suggestions missing "text" or with empty/whitespace-only text
 * - Excludes suggestions with text exceeding 300 characters
 * - Strips invalid category values (keeps text, removes category)
 * - Returns empty array if fewer than 2 valid suggestions remain
 * - Caps output at 4 suggestions
 */
export function parseSuggestionResponse(raw: string): Suggestion[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const validSuggestions: Suggestion[] = [];

  for (const item of parsed) {
    if (item === null || typeof item !== 'object') {
      continue;
    }

    const obj = item as Record<string, unknown>;

    // text must be a non-empty string
    if (typeof obj.text !== 'string') {
      continue;
    }

    const text = obj.text;

    // Exclude empty or whitespace-only text
    if (text.trim().length === 0) {
      continue;
    }

    // Exclude text exceeding 300 characters
    if (text.length > 300) {
      continue;
    }

    // Build the suggestion object
    const suggestion: Suggestion = { text };

    // Validate category if present
    if (
      typeof obj.category === 'string' &&
      VALID_CATEGORIES.includes(obj.category as SuggestionCategory)
    ) {
      suggestion.category = obj.category as SuggestionCategory;
    }

    validSuggestions.push(suggestion);
  }

  // Return empty array if fewer than 2 valid suggestions
  if (validSuggestions.length < 2) {
    return [];
  }

  // Cap at 4 suggestions
  return validSuggestions.slice(0, 4);
}
