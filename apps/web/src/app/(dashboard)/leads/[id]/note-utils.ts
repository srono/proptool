export interface TimelineItem {
  id: string;
  type: string;
  direction: string;
  body: string;
  media_url: string | null;
  timestamp: string;
}

const DEFAULT_CHAR_LIMIT = 2000;

/**
 * Enforce a code-point limit by truncating.
 * Defaults to 2000 code points.
 */
export function enforceCharLimit(input: string, max: number = DEFAULT_CHAR_LIMIT): string {
  const codePoints = [...input];
  if (codePoints.length <= max) {
    return input;
  }
  return codePoints.slice(0, max).join('');
}

/**
 * Returns true if the string contains at least one non-whitespace character.
 */
export function isNoteValid(input: string): boolean {
  return /\S/.test(input);
}

/**
 * Trim leading/trailing whitespace, preserve internal whitespace and line breaks.
 */
export function trimNoteBody(input: string): string {
  return input.trim();
}

/**
 * Format timeline label for a given item type and direction.
 * Notes display "NOTE" with no direction indicator.
 * Other types display "{TYPE} · {direction}".
 */
export function formatTimelineLabel(type: string, direction: string): string {
  if (type.toLowerCase() === 'note') {
    return 'NOTE';
  }
  return `${type.toUpperCase()} · ${direction}`;
}

/**
 * Sort timeline items descending by timestamp (most recent first).
 */
export function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}
