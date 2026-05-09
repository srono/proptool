/**
 * Inserts a listing snippet into the message composer.
 *
 * If the existing text is empty or whitespace-only, returns the snippet alone.
 * Otherwise, appends the snippet after the existing text separated by a newline.
 */
export function insertSnippetIntoComposer(
  existingText: string,
  snippet: string
): string {
  if (!existingText || existingText.trim().length === 0) {
    return snippet;
  }
  return `${existingText}\n${snippet}`;
}
