/**
 * Formats a numeric price value as Singapore dollars with thousand separators.
 * No decimal places are included.
 *
 * @param value - A positive number representing the price
 * @returns Formatted string like "S$1,800,000"
 */
export function formatPrice(value: number): string {
  return `S$${Math.round(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
