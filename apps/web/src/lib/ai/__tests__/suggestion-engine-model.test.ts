import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock OpenAI SDK ---
const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  })),
}));

// --- Mock all dependencies of suggestion-engine ---
vi.mock('../context-builder', () => ({
  buildConversationContext: vi.fn(() => []),
}));

vi.mock('../scheduling-intent', () => ({
  detectSchedulingIntent: vi.fn(() => false),
}));

vi.mock('../lead-selector', () => ({
  selectActiveLead: vi.fn(() => null),
}));

vi.mock('../greeting-detection', () => ({
  shouldUseFirstName: vi.fn(() => false),
}));

vi.mock('../prompt-builder', () => ({
  buildSuggestionPrompt: vi.fn(() => ({
    systemPrompt: 'system prompt',
    userPrompt: 'user prompt',
  })),
}));

vi.mock('../response-parser', () => ({
  parseSuggestionResponse: vi.fn(() => [{ text: 'Hello', category: 'greeting' }]),
}));

vi.mock('../../google/calendar', () => ({
  getAvailableSlots: vi.fn(() => []),
  refreshGoogleToken: vi.fn(() => null),
}));

// --- Mock Supabase helpers ---
function createMockSupabase() {
  const mockSingle = vi.fn().mockResolvedValue({ data: { full_name: 'John Doe' } });
  const mockLimit = vi.fn().mockReturnValue({
    data: [
      {
        id: 'msg-1',
        direction: 'inbound',
        body: 'Hello',
        sent_at: '2024-06-15T10:00:00Z',
        contact_id: 'contact-1',
        tenant_id: 'tenant-1',
      },
    ],
  });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockEq: ReturnType<typeof vi.fn> = vi.fn().mockImplementation(() => ({
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
    limit: mockLimit,
  }));
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return { from: mockFrom } as unknown;
}

describe('Suggestion Engine Model Configuration', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('module-level constant is used — env var change after import has no effect (Req 1.3)', async () => {
    // Import the module (SUGGESTION_MODEL is resolved at module load time).
    // Since SUGGESTION_MODEL env var is not set in test env, it defaults to 'gpt-4o-mini'.
    const { generateSuggestions } = await import('../suggestion-engine');

    // Now change the env var AFTER the module has been imported
    const originalValue = process.env.SUGGESTION_MODEL;
    process.env.SUGGESTION_MODEL = 'gpt-4-turbo-changed-after-import';

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '["Hi there"]' } }],
    });

    const mockSupabase = createMockSupabase();

    await generateSuggestions(
      { contactId: 'contact-1', tenantId: 'tenant-1', userId: 'user-1' },
      mockSupabase as never
    );

    // The model in the request should NOT be the newly set value
    // because the module-level constant was resolved at import time
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).not.toBe('gpt-4-turbo-changed-after-import');

    // Restore
    if (originalValue === undefined) {
      delete process.env.SUGGESTION_MODEL;
    } else {
      process.env.SUGGESTION_MODEL = originalValue;
    }
  });

  it('resolved model is passed in OpenAI request model field (Req 1.4)', async () => {
    const { generateSuggestions } = await import('../suggestion-engine');

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '["Hi there"]' } }],
    });

    const mockSupabase = createMockSupabase();

    await generateSuggestions(
      { contactId: 'contact-1', tenantId: 'tenant-1', userId: 'user-1' },
      mockSupabase as never
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    // The model field should be a non-empty string (the resolved SUGGESTION_MODEL constant)
    expect(typeof callArgs.model).toBe('string');
    expect(callArgs.model.length).toBeGreaterThan(0);
    // Since SUGGESTION_MODEL env var is not set in test, it should default to 'gpt-4o-mini'
    expect(callArgs.model).toBe('gpt-4o-mini');
  });

  it('OpenAI 404 returns empty array and logs model name (Req 1.5)', async () => {
    const { generateSuggestions } = await import('../suggestion-engine');

    // Simulate OpenAI 404 error (invalid model)
    const notFoundError = new Error('404 The model `invalid-model` does not exist');
    Object.assign(notFoundError, { status: 404, code: 'model_not_found' });
    mockCreate.mockRejectedValue(notFoundError);

    const mockSupabase = createMockSupabase();

    const result = await generateSuggestions(
      { contactId: 'contact-1', tenantId: 'tenant-1', userId: 'user-1' },
      mockSupabase as never
    );

    // Should return empty array on 404
    expect(result).toEqual([]);

    // Should log the error including the model name
    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('[SuggestionEngine]')
    );
    expect(logCall).toBeDefined();
    // The log should include 'model:' with the model identifier
    const logString = logCall!.join(' ');
    expect(logString).toContain('model:');
    expect(logString).toContain('gpt-4o-mini');
  });
});
