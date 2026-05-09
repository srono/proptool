import { describe, it, expect } from 'vitest';
import { detectSchedulingIntent, SCHEDULING_KEYWORDS } from '../scheduling-intent';

describe('detectSchedulingIntent', () => {
  it('returns true for messages containing scheduling keywords', () => {
    expect(detectSchedulingIntent('Can we schedule a viewing?')).toBe(true);
    expect(detectSchedulingIntent('Are you available tomorrow?')).toBe(true);
    expect(detectSchedulingIntent('What time works for you?')).toBe(true);
    expect(detectSchedulingIntent('Let me check my schedule')).toBe(true);
    expect(detectSchedulingIntent('How about next week?')).toBe(true);
  });

  it('returns false for messages without scheduling keywords', () => {
    expect(detectSchedulingIntent('What is the price?')).toBe(false);
    expect(detectSchedulingIntent('How many bedrooms?')).toBe(false);
    expect(detectSchedulingIntent('Thanks for the info')).toBe(false);
    expect(detectSchedulingIntent('Can you send me the floor plan?')).toBe(false);
  });

  it('performs case-insensitive matching', () => {
    expect(detectSchedulingIntent('VIEWING at 3pm')).toBe(true);
    expect(detectSchedulingIntent('Monday works for me')).toBe(true);
    expect(detectSchedulingIntent('TOMORROW afternoon')).toBe(true);
    expect(detectSchedulingIntent('This Week is good')).toBe(true);
  });

  it('detects all day names', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      expect(detectSchedulingIntent(`How about ${day}?`)).toBe(true);
    }
  });

  it('detects multi-word keywords', () => {
    expect(detectSchedulingIntent('what time can we meet?')).toBe(true);
    expect(detectSchedulingIntent('when can I come see it?')).toBe(true);
    expect(detectSchedulingIntent('next week would be great')).toBe(true);
    expect(detectSchedulingIntent('this week is busy for me')).toBe(true);
  });

  it('detects time-of-day keywords', () => {
    expect(detectSchedulingIntent('Is the morning ok?')).toBe(true);
    expect(detectSchedulingIntent('I prefer afternoon')).toBe(true);
    expect(detectSchedulingIntent('How about evening?')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(detectSchedulingIntent('')).toBe(false);
  });

  it('exports the SCHEDULING_KEYWORDS array', () => {
    expect(SCHEDULING_KEYWORDS).toBeInstanceOf(Array);
    expect(SCHEDULING_KEYWORDS.length).toBeGreaterThan(0);
    expect(SCHEDULING_KEYWORDS).toContain('viewing');
    expect(SCHEDULING_KEYWORDS).toContain('monday');
    expect(SCHEDULING_KEYWORDS).toContain('next week');
  });
});
