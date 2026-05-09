import { describe, it, expect } from 'vitest';
import { formatPrice } from '../format-price';

describe('formatPrice', () => {
  it('formats a typical property price with thousand separators', () => {
    expect(formatPrice(1800000)).toBe('S$1,800,000');
  });

  it('formats a small value without separators', () => {
    expect(formatPrice(500)).toBe('S$500');
  });

  it('formats values at the thousand boundary', () => {
    expect(formatPrice(1000)).toBe('S$1,000');
  });

  it('formats large values with multiple separators', () => {
    expect(formatPrice(1234567890)).toBe('S$1,234,567,890');
  });

  it('rounds decimal values to no decimal places', () => {
    expect(formatPrice(1500000.75)).toBe('S$1,500,001');
    expect(formatPrice(1500000.25)).toBe('S$1,500,000');
  });

  it('formats single digit values', () => {
    expect(formatPrice(1)).toBe('S$1');
  });
});
