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

// Mock suggestion engine
const mockGenerateSuggestions = vi.fn();
vi.mock('@/lib/ai/suggestion-engine', () => ({
  generateSuggestions: (...args: unknown[]) => mockGenerateSuggestions(...args),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/messages/suggestions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/messages/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(createRequest({ contact_id: 'contact-1' }));
    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when contact_id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toContain('contact_id');
  });

  it('returns 401 when user has no tenant_id in profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValueOnce({ data: null }); // profile query

    const response = await POST(createRequest({ contact_id: 'contact-1' }));
    expect(response.status).toBe(401);
  });

  it('returns 403 when contact does not belong to tenant', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query returns tenant_id
    mockSingle.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' } });
    // Contact query returns null (not found in tenant)
    mockSingle.mockResolvedValueOnce({ data: null });

    const response = await POST(createRequest({ contact_id: 'contact-1' }));
    expect(response.status).toBe(403);

    const json = await response.json();
    expect(json.error).toBe('Forbidden');
  });

  it('returns 200 with suggestions on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    // Profile query returns tenant_id
    mockSingle.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' } });
    // Contact query returns contact
    mockSingle.mockResolvedValueOnce({ data: { id: 'contact-1' } });

    const mockSuggestions = [
      { text: 'Hello!', category: 'greeting' },
      { text: 'How can I help?', category: 'general' },
    ];
    mockGenerateSuggestions.mockResolvedValue(mockSuggestions);

    const response = await POST(createRequest({ contact_id: 'contact-1' }));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.suggestions).toEqual(mockSuggestions);
  });

  it('returns 200 with empty suggestions when engine returns empty array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' } });
    mockSingle.mockResolvedValueOnce({ data: { id: 'contact-1' } });
    mockGenerateSuggestions.mockResolvedValue([]);

    const response = await POST(createRequest({ contact_id: 'contact-1' }));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.suggestions).toEqual([]);
  });

  it('returns 200 with empty suggestions when engine throws an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' } });
    mockSingle.mockResolvedValueOnce({ data: { id: 'contact-1' } });

    // Simulate engine failure (which is what happens on timeout via Promise.race rejection)
    mockGenerateSuggestions.mockRejectedValue(new Error('Engine failure'));

    const response = await POST(createRequest({ contact_id: 'contact-1' }));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.suggestions).toEqual([]);
  });

  it('passes listing_context_id to suggestion engine when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' } });
    mockSingle.mockResolvedValueOnce({ data: { id: 'contact-1' } });
    mockGenerateSuggestions.mockResolvedValue([]);

    await POST(createRequest({ contact_id: 'contact-1', listing_context_id: 'listing-1' }));

    expect(mockGenerateSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'contact-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        listingContextId: 'listing-1',
      }),
      mockSupabase
    );
  });

  it('handles invalid listing_context_id gracefully (engine handles it)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockSingle.mockResolvedValueOnce({ data: { tenant_id: 'tenant-1' } });
    mockSingle.mockResolvedValueOnce({ data: { id: 'contact-1' } });
    // Engine returns suggestions even with invalid listing_context_id
    mockGenerateSuggestions.mockResolvedValue([
      { text: 'Hi there!', category: 'greeting' },
      { text: 'How can I help?', category: 'general' },
    ]);

    const response = await POST(
      createRequest({ contact_id: 'contact-1', listing_context_id: 'invalid-id' })
    );
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.suggestions).toHaveLength(2);
  });
});
