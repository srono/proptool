import { describe, it, expect } from 'vitest';
import { parseSuggestionResponse } from '../response-parser';

describe('parseSuggestionResponse', () => {
  it('returns empty array for invalid JSON', () => {
    expect(parseSuggestionResponse('not json')).toEqual([]);
    expect(parseSuggestionResponse('')).toEqual([]);
    expect(parseSuggestionResponse('{}')).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    expect(parseSuggestionResponse('{"text": "hello"}')).toEqual([]);
    expect(parseSuggestionResponse('"hello"')).toEqual([]);
    expect(parseSuggestionResponse('42')).toEqual([]);
  });

  it('returns valid suggestions with correct categories', () => {
    const input = JSON.stringify([
      { text: 'Hello there!', category: 'greeting' },
      { text: 'When are you free?', category: 'scheduling' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toEqual([
      { text: 'Hello there!', category: 'greeting' },
      { text: 'When are you free?', category: 'scheduling' },
    ]);
  });

  it('strips invalid category values', () => {
    const input = JSON.stringify([
      { text: 'Hello there!', category: 'invalid_cat' },
      { text: 'When are you free?', category: 'scheduling' },
      { text: 'Another reply', category: 'unknown' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toEqual([
      { text: 'Hello there!' },
      { text: 'When are you free?', category: 'scheduling' },
      { text: 'Another reply' },
    ]);
  });

  it('excludes suggestions with missing text', () => {
    const input = JSON.stringify([
      { category: 'greeting' },
      { text: 'Valid one', category: 'general' },
      { text: 'Valid two' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toEqual([
      { text: 'Valid one', category: 'general' },
      { text: 'Valid two' },
    ]);
  });

  it('excludes suggestions with empty or whitespace-only text', () => {
    const input = JSON.stringify([
      { text: '', category: 'greeting' },
      { text: '   ', category: 'general' },
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toEqual([
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
  });

  it('excludes suggestions with text exceeding 300 characters', () => {
    const longText = 'a'.repeat(301);
    const input = JSON.stringify([
      { text: longText },
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toEqual([
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
  });

  it('allows text of exactly 300 characters', () => {
    const exactText = 'a'.repeat(300);
    const input = JSON.stringify([
      { text: exactText },
      { text: 'Valid two' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(exactText);
  });

  it('returns empty array if fewer than 2 valid suggestions remain', () => {
    const input = JSON.stringify([
      { text: 'Only one valid' },
    ]);
    expect(parseSuggestionResponse(input)).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(parseSuggestionResponse('[]')).toEqual([]);
  });

  it('caps output at 4 suggestions', () => {
    const input = JSON.stringify([
      { text: 'One' },
      { text: 'Two' },
      { text: 'Three' },
      { text: 'Four' },
      { text: 'Five' },
      { text: 'Six' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toHaveLength(4);
    expect(result[3].text).toBe('Four');
  });

  it('handles null and non-object items in the array', () => {
    const input = JSON.stringify([
      null,
      42,
      'string',
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toEqual([
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
  });

  it('handles non-string text field', () => {
    const input = JSON.stringify([
      { text: 123 },
      { text: null },
      { text: true },
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
    const result = parseSuggestionResponse(input);
    expect(result).toEqual([
      { text: 'Valid one' },
      { text: 'Valid two' },
    ]);
  });
});
