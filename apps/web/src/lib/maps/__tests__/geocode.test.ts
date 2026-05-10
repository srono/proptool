import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geocodePostalCode } from '../geocode';

describe('geocodePostalCode', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('returns coordinates from a successful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        found: 1,
        totalNumPages: 1,
        pageNum: 1,
        results: [
          {
            SEARCHVAL: '238858',
            LATITUDE: '1.30109015537506',
            LONGITUDE: '103.838737809286',
          },
        ],
      }),
    });

    const result = await geocodePostalCode('238858');

    expect(result).toEqual({
      lat: '1.30109015537506',
      lng: '103.838737809286',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.onemap.gov.sg/api/common/elastic/search?searchVal=238858&returnGeom=Y&getAddrDetails=N',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('returns null when results array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        found: 0,
        totalNumPages: 0,
        pageNum: 1,
        results: [],
      }),
    });

    const result = await geocodePostalCode('000000');

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await geocodePostalCode('238858');

    expect(result).toBeNull();
  });

  it('returns null when request times out', async () => {
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const resultPromise = geocodePostalCode('238858');
    vi.advanceTimersByTime(5000);
    const result = await resultPromise;

    expect(result).toBeNull();
  });

  it('returns null on malformed JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const result = await geocodePostalCode('238858');

    expect(result).toBeNull();
  });

  it('returns null when response is HTTP non-2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await geocodePostalCode('238858');

    expect(result).toBeNull();
  });
});
