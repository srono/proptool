import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Track calls per table for assertions
let usersSelectResult: { data: unknown; error?: unknown };
let messagesInsertResult: { data: unknown; error: unknown };
let leadsUpdateEqResult: { error?: unknown };
let leadsUpdateArgs: unknown;

const mockGetUser = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: vi.fn((table: string) => {
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(usersSelectResult),
          }),
        }),
      };
    }
    if (table === 'messages') {
      return {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve(messagesInsertResult),
          }),
        }),
      };
    }
    if (table === 'leads') {
      return {
        update: (args: unknown) => {
          leadsUpdateArgs = args;
          return {
            eq: () => Promise.resolve(leadsUpdateEqResult),
          };
        },
      };
    }
    return {};
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/messages/notes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/messages/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersSelectResult = { data: { tenant_id: 'tenant-1' } };
    messagesInsertResult = { data: null, error: null };
    leadsUpdateEqResult = { error: null };
    leadsUpdateArgs = undefined;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(createRequest({
      lead_id: 'lead-1',
      contact_id: 'contact-1',
      body: 'Test note',
    }));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when body is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await POST(createRequest({
      lead_id: 'lead-1',
      contact_id: 'contact-1',
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Missing required fields');
  });

  it('returns 400 when body is whitespace-only', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const response = await POST(createRequest({
      lead_id: 'lead-1',
      contact_id: 'contact-1',
      body: '   \n\t  ',
    }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('Missing required fields');
  });

  it('returns 201 with correct message shape (channel=note, direction=outbound)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    usersSelectResult = { data: { tenant_id: 'tenant-1' } };

    const mockMessage = {
      id: 'msg-1',
      tenant_id: 'tenant-1',
      contact_id: 'contact-1',
      lead_id: 'lead-1',
      direction: 'outbound',
      channel: 'note',
      body: 'Test note content',
      media_url: null,
      wa_message_id: null,
      wa_number_id: null,
      status: 'delivered',
      sent_at: '2024-01-01T00:00:00.000Z',
    };
    messagesInsertResult = { data: mockMessage, error: null };

    const response = await POST(createRequest({
      lead_id: 'lead-1',
      contact_id: 'contact-1',
      body: '  Test note content  ',
    }));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.message).toBeDefined();
    expect(json.message.channel).toBe('note');
    expect(json.message.direction).toBe('outbound');
    expect(json.message.body).toBe('Test note content');
    expect(json.message.lead_id).toBe('lead-1');
    expect(json.message.contact_id).toBe('contact-1');
    expect(json.message.status).toBe('delivered');
  });

  it('updates leads.last_activity_at on successful save', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    usersSelectResult = { data: { tenant_id: 'tenant-1' } };

    messagesInsertResult = {
      data: {
        id: 'msg-1',
        tenant_id: 'tenant-1',
        contact_id: 'contact-1',
        lead_id: 'lead-1',
        direction: 'outbound',
        channel: 'note',
        body: 'A note',
        status: 'delivered',
        sent_at: '2024-01-01T00:00:00.000Z',
      },
      error: null,
    };

    const response = await POST(createRequest({
      lead_id: 'lead-1',
      contact_id: 'contact-1',
      body: 'A note',
    }));

    expect(response.status).toBe(201);

    // Verify leads table was called with update containing last_activity_at
    expect(mockSupabase.from).toHaveBeenCalledWith('leads');
    expect(leadsUpdateArgs).toEqual(
      expect.objectContaining({ last_activity_at: expect.any(String) })
    );
  });

  it('returns 401 when user has no tenant_id in profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    usersSelectResult = { data: null };

    const response = await POST(createRequest({
      lead_id: 'lead-1',
      contact_id: 'contact-1',
      body: 'Test note',
    }));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 500 when database insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    usersSelectResult = { data: { tenant_id: 'tenant-1' } };
    messagesInsertResult = { data: null, error: { message: 'DB error', code: '42P01' } };

    const response = await POST(createRequest({
      lead_id: 'lead-1',
      contact_id: 'contact-1',
      body: 'Test note',
    }));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe('Failed to save note');
  });
});
