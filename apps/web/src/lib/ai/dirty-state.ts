/**
 * Dirty state detection for ad copy variants.
 *
 * Compares the current content_text against the last saved or original
 * generated version. Returns true when the content differs by at least
 * one character, indicating the Save button should be enabled.
 */
export function isDirty(currentText: string, savedText: string): boolean {
  return currentText !== savedText;
}
