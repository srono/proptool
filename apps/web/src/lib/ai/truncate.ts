/**
 * Truncates suggestion chip text to a maximum length, appending "…" if truncated.
 *
 * @param text - The suggestion text to display in a chip
 * @param maxLength - Maximum character length before truncation (default: 80)
 * @returns The original text if within maxLength, or the first maxLength characters followed by "…"
 */
export function truncateChipText(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '\u2026';
}
