/**
 * Constructs a Google Maps search URL from an address and postal code.
 * The address is percent-encoded per RFC 3986.
 */
export function buildGoogleMapsUrl(address: string, postalCode: string): string {
  const query = `${address} Singapore ${postalCode}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Constructs a OneMap URL from a postal code.
 */
export function buildOneMapUrl(postalCode: string): string {
  return `https://www.onemap.gov.sg/v2/?postal=${postalCode}`;
}

/**
 * Returns true if the postal code is exactly 6 digits.
 */
export function isValidPostalCode(postalCode: string | null | undefined): boolean {
  if (!postalCode) return false;
  return /^\d{6}$/.test(postalCode);
}

/**
 * Constructs an aria-label string containing the service name and address.
 */
export function buildAriaLabel(serviceName: string, address: string): string {
  return `Open ${serviceName} for ${address}`;
}
