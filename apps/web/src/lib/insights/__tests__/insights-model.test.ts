import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAreaInsight } from '../generate';

vi.mock('@/lib/ura/client', () => ({
  fetchNearbyTransactions: vi.fn().mockResolvedValue([
    {
      project: 'Test Condo',
      street: 'Test Street',
      price: 1500000,
      psf: 1250,
      area_sqft: 1200,
      floor_range: '10-12',
      contract_date: '2024-01',
      type_of_sale: 'New Sale',
      property_type: 'condo',
    },
  ]),
  generateTransactionSummary: vi.fn().mockReturnValue('1 transaction found.'),
}));

describe('Insights Generator — model configuration', () => {
  const originalEnv = process.env;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  const mockListing = {
    address: '123 Test Street',
    postal_code: '123456',
    district: 'D10',
    property_type: 'condo',
    asking_price: 2000000,
    asking_rental: null,
    floor_area_sqft: 1200,
    tenure: 'freehold',
    listing_type: 'sale',
  };

  function createFetchSuccess() {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              talking_points: ['Point 1', 'Point 2'],
              seller_pitch: 'Great property.',
              watchouts: ['Watchout 1'],
            }),
          },
        }],
      }),
    });
  }

  function createFetchError(status: number) {
    return vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: { message: 'Error' } }),
    });
  }

  /**
   * Validates: Requirement 2.3
   * THE Insights_Generator SHALL read the INSIGHTS_MODEL environment variable
   * at the time of each API request, so that changes take effect without restart.
   */
  it('re-reads env var on each call — change between calls takes effect', async () => {
    // First call with model A
    process.env.INSIGHTS_MODEL = 'gpt-4o';
    global.fetch = createFetchSuccess();

    await generateAreaInsight(mockListing);

    const firstCallBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(firstCallBody.model).toBe('gpt-4o');

    // Change env var between calls — should use new model without restart
    process.env.INSIGHTS_MODEL = 'gpt-4-turbo';
    global.fetch = createFetchSuccess();

    await generateAreaInsight(mockListing);

    const secondCallBody = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(secondCallBody.model).toBe('gpt-4-turbo');
  });

  /**
   * Validates: Requirement 2.4
   * THE Insights_Generator SHALL pass the resolved Model_Identifier to the
   * OpenAI chat completions API in the model field of the request body.
   */
  it('passes resolved model in fetch request body model field', async () => {
    process.env.INSIGHTS_MODEL = '  custom-model-v2  ';
    global.fetch = createFetchSuccess();

    await generateAreaInsight(mockListing);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');

    const body = JSON.parse(options.body);
    // Trimmed value should be used
    expect(body.model).toBe('custom-model-v2');
  });

  /**
   * Validates: Requirement 2.5
   * IF the OpenAI API returns a non-success status code, THEN THE Insights_Generator
   * SHALL log the error including the HTTP status code and the Model_Identifier,
   * and return template-based content generation output.
   */
  it('non-200 response returns template fallback and logs status + model', async () => {
    process.env.INSIGHTS_MODEL = 'bad-model';
    global.fetch = createFetchError(404);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await generateAreaInsight(mockListing);

    // Should log with status and model
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Insights] OpenAI error:',
      404,
      'model:',
      'bad-model'
    );

    // Should return template fallback (non-empty talking points from template)
    expect(result.agent_talking_points.length).toBeGreaterThan(0);
    // Template fallback for freehold includes tenure talking point
    expect(
      result.agent_talking_points.some((p: string) => p.includes('Freehold') || p.includes('freehold'))
    ).toBe(true);
  });
});
