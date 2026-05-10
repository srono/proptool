/**
 * OneMap geocoding utility.
 * Resolves a Singapore postal code to lat/lng coordinates via the OneMap Search API.
 */

export interface OneMapSearchResponse {
  found: number;
  totalNumPages: number;
  pageNum: number;
  results: Array<{
    SEARCHVAL: string;
    LATITUDE: string;
    LONGITUDE: string;
    [key: string]: string;
  }>;
}

/**
 * Geocode a Singapore postal code using the OneMap Search API.
 * Returns the latitude and longitude from the first result, or null on any failure.
 */
export async function geocodePostalCode(
  postalCode: string
): Promise<{ lat: string; lng: string } | null> {
  const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=N`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return null;
    }

    const data: OneMapSearchResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const first = data.results[0];

    if (!first.LATITUDE || !first.LONGITUDE) {
      return null;
    }

    return { lat: first.LATITUDE, lng: first.LONGITUDE };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
