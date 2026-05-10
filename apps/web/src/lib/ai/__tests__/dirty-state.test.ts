import { describe, it, expect } from 'vitest';
import { isDirty } from '../dirty-state';

describe('isDirty', () => {
  it('returns false when both strings are identical', () => {
    expect(isDirty('Hello world', 'Hello world')).toBe(false);
  });

  it('returns false when both strings are empty', () => {
    expect(isDirty('', '')).toBe(false);
  });

  it('returns true when current text has an added character', () => {
    expect(isDirty('Hello world!', 'Hello world')).toBe(true);
  });

  it('returns true when current text has a removed character', () => {
    expect(isDirty('Hello worl', 'Hello world')).toBe(true);
  });

  it('returns true when a single character differs', () => {
    expect(isDirty('Hello World', 'Hello world')).toBe(true);
  });

  it('returns true when current text is empty and saved is not', () => {
    expect(isDirty('', 'Some saved text')).toBe(true);
  });

  it('returns true when current text has content and saved is empty', () => {
    expect(isDirty('New content', '')).toBe(true);
  });

  it('returns true for whitespace-only differences', () => {
    expect(isDirty('Hello  world', 'Hello world')).toBe(true);
  });

  it('returns true for trailing newline difference', () => {
    expect(isDirty('Hello world\n', 'Hello world')).toBe(true);
  });
});
