import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock Supabase client
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle, eq: mockEq }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockGetUser = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

// Mock prompt builder
vi.mock('@/lib/ai/ad-copy-prompt-builder', () => ({
  buildAdCopyPrompt: vi.fn(() => ({
    systemPrompt: 'system prompt',
    userPrompt: 'user prompt',
  })),
}));

// Mock response parser
const mockParseAdCopyResponse = vi.fn();
vi.mock('@/lib/ai/ad-copy-response-parser', () => ({
  parseAdCopyResponse: (...args: unknown[]) => mockParseAdCopyResponse(...args),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/ad-copy/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validRequestBody = {
  listing_id: 'listing-123',
  platform: 'facebook',
  tone: 'professional',
  length: 'medium',
  cta_style: 'enquire_now',
  avoid_emojis: false,
  include_hashtags: true,
};

const mockListing = {
  id: 'listing-123',
  tenant_id: 'tenant-1',
  address: '123 Orchard Road',
  postal_code: '238858',
  district: 'D09',
  property_type: 'Condo',
  listing_type: 'sale',
  asking_price: 1500000,
  asking_rental: null,
  floor_area_sqft: 1200,
  tenure: 'Freehold',
  completion_year: 2020,
  description: 'Beautiful condo in prime location',
};

const mockProfile = {
  tenant_id: 'tenant-1',
  full_name: 'John Agent',
  phone: '+6591234567',
  cea_licence_number: 'R123456A',
};

const mockTenant = {
  cea_registration_number: 'L3001234A',
  settings_json: null,
};

describe('POST /api/ad-copy/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error).toBe('Please log in to continue');
    expect(json.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when user has no tenant', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query returns no tenant_id
    mockSingle.mockResolvedValueOnce({ data: { tenant_id: null } });

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error).toBe('Please log in to continue');
    expect(json.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when listing belongs to different tenant', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query
    mockSingle.mockResolvedValueOnce({ data: mockProfile });
    // Listing query returns listing with different tenant
    mockSingle.mockResolvedValueOnce({
      data: { ...mockListing, tenant_id: 'different-tenant' },
    });

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(403);

    const json = await response.json();
    expect(json.error).toBe("You don't have access to this listing");
    expect(json.code).toBe('FORBIDDEN');
  });

  it('returns 400 when required request fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValueOnce({ data: mockProfile });

    // Send request with missing fields
    const response = await POST(
      createRequest({ listing_id: 'listing-123' })
    );
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.error).toContain('Missing required fields');
    expect(json.error).toContain('platform');
    expect(json.error).toContain('tone');
    expect(json.error).toContain('length');
    expect(json.error).toContain('cta_style');
  });

  it('returns 400 when mandatory listing fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query
    mockSingle.mockResolvedValueOnce({ data: mockProfile });
    // Listing query returns listing with missing mandatory fields
    mockSingle.mockResolvedValueOnce({
      data: {
        ...mockListing,
        address: '',
        property_type: null,
        asking_price: null,
        asking_rental: null,
      },
    });

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.error).toContain('Listing is missing required data');
    expect(json.error).toContain('address');
    expect(json.error).toContain('property_type');
    expect(json.error).toContain('price/rental');
  });

  it('returns 504 on OpenAI timeout', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query
    mockSingle.mockResolvedValueOnce({ data: mockProfile });
    // Listing query
    mockSingle.mockResolvedValueOnce({ data: mockListing });
    // Tenant query
    mockSingle.mockResolvedValueOnce({ data: mockTenant });

    // Simulate AbortError (timeout)
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockCreate.mockRejectedValue(abortError);

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(504);

    const json = await response.json();
    expect(json.error).toBe('Generation timed out. Please try again.');
    expect(json.code).toBe('TIMEOUT');
  });

  it('returns 503 on OpenAI rate limit (429)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query
    mockSingle.mockResolvedValueOnce({ data: mockProfile });
    // Listing query
    mockSingle.mockResolvedValueOnce({ data: mockListing });
    // Tenant query
    mockSingle.mockResolvedValueOnce({ data: mockTenant });

    // Simulate OpenAI rate limit error
    const rateLimitError = { status: 429, message: 'Rate limit exceeded', code: 'rate_limit_exceeded' };
    mockCreate.mockRejectedValue(rateLimitError);

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json.error).toBe('AI service is temporarily busy. Please try again in a moment.');
    expect(json.code).toBe('GENERATION_FAILED');
  });

  it('returns 422 on content policy rejection', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query
    mockSingle.mockResolvedValueOnce({ data: mockProfile });
    // Listing query
    mockSingle.mockResolvedValueOnce({ data: mockListing });
    // Tenant query
    mockSingle.mockResolvedValueOnce({ data: mockTenant });

    // Simulate OpenAI content policy violation
    const contentPolicyError = {
      status: 400,
      message: 'Content policy violation',
      code: 'content_policy_violation',
    };
    mockCreate.mockRejectedValue(contentPolicyError);

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.error).toBe(
      'Generation could not be completed. Please adjust your listing description.'
    );
    expect(json.code).toBe('GENERATION_FAILED');
  });

  it('returns 503 on OpenAI auth error (401)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query
    mockSingle.mockResolvedValueOnce({ data: mockProfile });
    // Listing query
    mockSingle.mockResolvedValueOnce({ data: mockListing });
    // Tenant query
    mockSingle.mockResolvedValueOnce({ data: mockTenant });

    // Simulate OpenAI auth error
    const authError = { status: 401, message: 'Invalid API key', code: 'invalid_api_key' };
    mockCreate.mockRejectedValue(authError);

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json.error).toBe('AI service is currently unavailable. Please try again later.');
    expect(json.code).toBe('GENERATION_FAILED');
  });

  it('returns 200 with valid GenerateAdCopyResponse on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query
    mockSingle.mockResolvedValueOnce({ data: mockProfile });
    // Listing query
    mockSingle.mockResolvedValueOnce({ data: mockListing });
    // Tenant query
    mockSingle.mockResolvedValueOnce({ data: mockTenant });

    // Mock OpenAI success response
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              primary_caption: 'Beautiful condo for sale',
              short_headline: 'Dream Home',
              cta_line: 'Enquire now',
              short_form: 'Short version',
              instagram_caption: 'IG caption',
              whatsapp_promo: 'WA promo',
              hashtags: '#condo #singapore #property #sale #orchard',
            }),
          },
        },
      ],
    });

    // Mock response parser success
    const mockVariants = [
      { type: 'primary_caption', platform: 'facebook', content: 'Beautiful condo for sale', max_length: 2000 },
      { type: 'short_headline', platform: 'facebook', content: 'Dream Home', max_length: 100 },
      { type: 'cta_line', platform: 'facebook', content: 'Enquire now', max_length: 150 },
      { type: 'short_form', platform: 'facebook', content: 'Short version', max_length: 280 },
      { type: 'instagram_caption', platform: 'instagram', content: 'IG caption', max_length: 2200 },
      { type: 'whatsapp_promo', platform: 'whatsapp', content: 'WA promo', max_length: 1000 },
    ];
    mockParseAdCopyResponse.mockReturnValue({
      success: true,
      variants: mockVariants,
    });

    const response = await POST(createRequest(validRequestBody));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.variants).toEqual(mockVariants);
    expect(json.model_used).toBeDefined();
    expect(json.generated_at).toBeDefined();
  });
});
