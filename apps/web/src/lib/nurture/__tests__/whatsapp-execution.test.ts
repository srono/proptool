import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prepareWhatsAppExecution,
  markTaskDone,
  logNurtureActivity,
  completeWhatsAppTask,
  type PrepareTaskResponse,
} from '../whatsapp-execution';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePrepareResponse(overrides: Partial<PrepareTaskResponse> = {}): PrepareTaskResponse {
  return {
    task_id: 'task-1',
    channel: 'whatsapp',
    contact_phone: '+6591234567',
    contact_name: 'John Doe',
    resolved_message: 'Hi John, your MOP date is approaching.',
    template_unavailable: false,
    consent_status: 'green',
    consent_gap_reason: null,
    missing_fields: [],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('prepareWhatsAppExecution', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns navigation URL with prefill when template resolves successfully', async () => {
    const prepareData = makePrepareResponse({
      resolved_message: 'Hi John, your MOP is coming up!',
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => prepareData,
    } as Response);

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.navigation.url).toContain('/messages/contact-1');
      expect(result.navigation.url).toContain('prefill=');
      expect(result.navigation.url).toContain('nurture_task_id=task-1');
      expect(result.navigation.templateUnavailable).toBe(false);
      expect(result.navigation.notice).toBeNull();
    }
  });

  it('returns navigation URL without prefill when no template is associated', async () => {
    const prepareData = makePrepareResponse({
      resolved_message: null,
      template_unavailable: false,
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => prepareData,
    } as Response);

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.navigation.url).toContain('/messages/contact-1');
      expect(result.navigation.url).toContain('nurture_task_id=task-1');
      expect(result.navigation.url).not.toContain('prefill=');
      expect(result.navigation.templateUnavailable).toBe(false);
      expect(result.navigation.notice).toBeNull();
    }
  });

  it('returns navigation with notice when template is unavailable', async () => {
    const prepareData = makePrepareResponse({
      resolved_message: null,
      template_unavailable: true,
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => prepareData,
    } as Response);

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.navigation.url).toContain('/messages/contact-1');
      expect(result.navigation.url).toContain('template_unavailable=1');
      expect(result.navigation.url).toContain('nurture_task_id=task-1');
      expect(result.navigation.url).not.toContain('prefill=');
      expect(result.navigation.templateUnavailable).toBe(true);
      expect(result.navigation.notice).toBe(
        'The message template is no longer available. Please compose your message manually.'
      );
    }
  });

  it('returns consent_blocked error when consent status is red', async () => {
    const prepareData = makePrepareResponse({
      consent_status: 'red',
      consent_gap_reason: 'Contact has not opted in to WhatsApp messages',
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => prepareData,
    } as Response);

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('consent_blocked');
      expect(result.error.message).toBe('Contact has not opted in to WhatsApp messages');
    }
  });

  it('returns not_found error when task does not exist', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Task not found' }),
    } as Response);

    const result = await prepareWhatsAppExecution('nonexistent', 'contact-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('not_found');
    }
  });

  it('returns api_error on server error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error' }),
    } as Response);

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api_error');
    }
  });

  it('returns api_error on network failure', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('api_error');
      expect(result.error.message).toBe('Network error');
    }
  });

  it('passes consent status and gap reason through for yellow consent', async () => {
    const prepareData = makePrepareResponse({
      consent_status: 'yellow',
      consent_gap_reason: 'Ad purpose mismatch',
      resolved_message: 'Hello!',
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => prepareData,
    } as Response);

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.navigation.consentStatus).toBe('yellow');
      expect(result.navigation.consentGapReason).toBe('Ad purpose mismatch');
    }
  });

  it('includes missing fields in the navigation result', async () => {
    const prepareData = makePrepareResponse({
      resolved_message: 'Hi , your property at  is...',
      missing_fields: ['contact_name', 'owned_property_label'],
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => prepareData,
    } as Response);

    const result = await prepareWhatsAppExecution('task-1', 'contact-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.navigation.missingFields).toEqual(['contact_name', 'owned_property_label']);
    }
  });
});

describe('markTaskDone', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls PATCH with status done and returns success', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ task: { id: 'task-1', status: 'done' } }),
    } as Response);

    const result = await markTaskDone('task-1');

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/nurture/tasks/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done', notes: undefined }),
    });
  });

  it('includes notes when provided', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ task: { id: 'task-1', status: 'done' } }),
    } as Response);

    await markTaskDone('task-1', 'Sent MOP reminder');

    expect(global.fetch).toHaveBeenCalledWith('/api/nurture/tasks/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done', notes: 'Sent MOP reminder' }),
    });
  });

  it('returns error on failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid transition' }),
    } as Response);

    const result = await markTaskDone('task-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid transition');
  });
});

describe('logNurtureActivity', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts activity with correct metadata', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'activity-1' }),
    } as Response);

    const result = await logNurtureActivity({
      contactId: 'contact-1',
      taskId: 'task-1',
      playbookName: 'MOP Nurture',
      stepTitle: 'Initial outreach',
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: 'contact-1',
        type: 'nurture_whatsapp',
        metadata: {
          nurture_task_id: 'task-1',
          playbook_name: 'MOP Nurture',
          step_title: 'Initial outreach',
          channel: 'whatsapp',
        },
        notes: undefined,
      }),
    });
  });

  it('returns error on failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const result = await logNurtureActivity({
      contactId: 'contact-1',
      taskId: 'task-1',
      playbookName: 'MOP Nurture',
      stepTitle: 'Initial outreach',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Server error');
  });
});

describe('completeWhatsAppTask', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('marks task done and logs activity on success', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ task: { id: 'task-1', status: 'done' } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'activity-1' }),
      } as Response);

    const result = await completeWhatsAppTask({
      taskId: 'task-1',
      contactId: 'contact-1',
      playbookName: 'MOP Nurture',
      stepTitle: 'Initial outreach',
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('collects errors from both operations', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Task already done' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Activity log failed' }),
      } as Response);

    const result = await completeWhatsAppTask({
      taskId: 'task-1',
      contactId: 'contact-1',
      playbookName: 'MOP Nurture',
      stepTitle: 'Initial outreach',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('Task already done');
    expect(result.errors).toContain('Activity log failed');
  });
});
