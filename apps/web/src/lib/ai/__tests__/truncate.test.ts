import { describe, it, expect } from 'vitest';
import { truncateChipText } from '../truncate';

describe('truncateChipText', () => {
  it('returns the original string when length is exactly 80', () => {
    const text = 'a'.repeat(80);
    expect(truncateChipText(text)).toBe(text);
  });

  it('returns the original string when length is less than 80', () => {
    const text = 'Hello, this is a short message';
    expect(truncateChipText(text)).toBe(text);
  });

  it('returns an empty string unchanged', () => {
    expect(truncateChipText('')).toBe('');
  });

  it('truncates and appends ellipsis when length exceeds 80', () => {
    const text = 'a'.repeat(100);
    const result = truncateChipText(text);
    expect(result).toBe('a'.repeat(80) + '\u2026');
    expect(result.length).toBe(81);
  });

  it('truncates at exactly 80 characters before the ellipsis', () => {
    const text = 'abcdefghij'.repeat(10); // 100 chars
    const result = truncateChipText(text);
    expect(result.slice(0, 80)).toBe(text.slice(0, 80));
    expect(result[80]).toBe('\u2026');
  });

  it('respects a custom maxLength parameter', () => {
    const text = 'Hello, world!';
    expect(truncateChipText(text, 5)).toBe('Hello\u2026');
  });

  it('returns original string when length equals custom maxLength', () => {
    const text = 'Hello';
    expect(truncateChipText(text, 5)).toBe('Hello');
  });
});
