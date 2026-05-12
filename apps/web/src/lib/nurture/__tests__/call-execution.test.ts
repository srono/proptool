import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkCallAvailability,
  initiateCall,
  logCallOutcome,
  buildActivityTimelineEntry,
  sanitizePhoneNumber,
  type CallTaskContext,
} from '../call-execution';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeContext(overrides: Partial<CallTaskContext> = {}): CallTaskContext {
  return {
    taskId: 'task-001',
    contactId: 'contact-001',
    contactPhone: '+6591234567',
    contactName: 'John Tan',
    playbookName: 'HDB MOP Nurture',
    stepTitle: 'Follow-up call',
    ...overrides,
  };
}

// ─── checkCallAvailability ───────────────────────────────────────────────────

describe('checkCallAvailability', () => {
  it('returns canCall: true when phone number is present', () => {
    const result = checkCallAvailability(makeContext());
    expect(result.canCall).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('returns canCall: false when phone is null', () => {
    const result = checkCallAvailability(makeContext({ contactPhone: null }));
    expect(result.canCall).toBe(false);
    expect(result.reason).toBe('No phone number is available for this contact');
  });

  it('returns canCall: false when phone is empty string', () => {
    const result = checkCallAvailability(makeContext({ contactPhone: '' }));
    expect(result.canCall).toBe(false);
    expect(result.reason).toBe('No phone number is available for this contact');
  });

  it('returns canCall: false when phone is whitespace only', () => {
    const result = checkCallAvailability(makeContext({ contactPhone: '   ' }));
    expect(result.canCall).toBe(false);
    expect(result.reason).toBe('No phone number is available for this contact');
  });
});

// ─── initiateCall ────────────────────────────────────────────────────────────

describe('initiateCall', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it('opens tel: URI with sanitized phone number', () => {
    const result = initiateCall(makeContext({ contactPhone: '+65 9123 4567' }));
    expect(result.success).toBe(true);
    expect(result.telUri).toBe('tel:+6591234567');
    expect(windowOpenSpy).toHaveBeenCalledWith('tel:+6591234567', '_self');
  });

  it('returns error when phone number is missing', () => {
    const result = initiateCall(makeContext({ contactPhone: null }));
    expect(result.success).toBe(false);
    expect(result.telUri).toBeNull();
    expect(result.error).toBe('No phone number is available for this contact');
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('handles phone numbers with dashes and parentheses', () => {
    const result = initiateCall(makeContext({ contactPhone: '+65-(9123)-4567' }));
    expect(result.success).toBe(true);
    expect(result.telUri).toBe('tel:+6591234567');
  });
});

// ─── logCallOutcome ──────────────────────────────────────────────────────────

describe('logCallOutcome', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('marks task as done and records activity timeline entry', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/nurture/tasks/')) {
        return new Response(JSON.stringify({ task: { id: 'task-001', status: 'done' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (String(url).includes('/api/activity')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    });

    const context = makeContext();
    const result = await logCallOutcome(context, { notes: 'Discussed MOP timeline' }, 'Agent Lee');

    expect(result.success).toBe(true);

    // Verify task was marked done
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/nurture/tasks/task-001',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'done', notes: 'Discussed MOP timeline' }),
      })
    );

    // Verify activity timeline entry was recorded
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/activity',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('HDB MOP Nurture'),
      })
    );

    fetchMock.mockRestore();
  });

  it('returns error when marking task done fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({ error: 'Invalid transition' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await logCallOutcome(makeContext(), { notes: 'test' }, 'Agent Lee');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid transition');

    fetchMock.mockRestore();
  });

  it('succeeds even if timeline logging fails (non-critical)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/nurture/tasks/')) {
        return new Response(JSON.stringify({ task: { id: 'task-001', status: 'done' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Timeline endpoint fails
      return new Response('Server error', { status: 500 });
    });

    const result = await logCallOutcome(makeContext(), { notes: 'test' }, 'Agent Lee');

    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Call Execution] Failed to record activity timeline entry'
    );

    fetchMock.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── buildActivityTimelineEntry ──────────────────────────────────────────────

describe('buildActivityTimelineEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds entry with playbook name, step title, agent, and notes', () => {
    const context = makeContext();
    const entry = buildActivityTimelineEntry(context, { notes: 'Interested in selling' }, 'Agent Lee');

    expect(entry.contact_id).toBe('contact-001');
    expect(entry.type).toBe('call');
    expect(entry.direction).toBe('outbound');
    expect(entry.body).toContain('[HDB MOP Nurture] Follow-up call');
    expect(entry.body).toContain('Agent: Agent Lee');
    expect(entry.body).toContain('Notes: Interested in selling');
    expect(entry.timestamp).toBe('2024-06-15T10:00:00.000Z');
  });

  it('omits notes line when notes are empty', () => {
    const context = makeContext();
    const entry = buildActivityTimelineEntry(context, { notes: '' }, 'Agent Lee');

    expect(entry.body).not.toContain('Notes:');
    expect(entry.body).toContain('[HDB MOP Nurture] Follow-up call');
    expect(entry.body).toContain('Agent: Agent Lee');
  });
});

// ─── sanitizePhoneNumber ─────────────────────────────────────────────────────

describe('sanitizePhoneNumber', () => {
  it('removes spaces', () => {
    expect(sanitizePhoneNumber('+65 9123 4567')).toBe('+6591234567');
  });

  it('removes dashes', () => {
    expect(sanitizePhoneNumber('+65-9123-4567')).toBe('+6591234567');
  });

  it('removes parentheses', () => {
    expect(sanitizePhoneNumber('+65(9123)4567')).toBe('+6591234567');
  });

  it('preserves + prefix', () => {
    expect(sanitizePhoneNumber('+6591234567')).toBe('+6591234567');
  });

  it('handles already clean numbers', () => {
    expect(sanitizePhoneNumber('91234567')).toBe('91234567');
  });
});
