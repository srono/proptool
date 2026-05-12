/**
 * WhatsApp Execution Flow
 *
 * Encapsulates the client-side logic for executing a WhatsApp nurture task:
 * 1. Calls the prepare API to resolve template placeholders and check consent
 * 2. Returns navigation instructions (URL with prefill query param)
 * 3. Handles template unavailable case (empty composer + notice flag)
 * 4. Provides a function to mark the task done and log activity after send
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrepareTaskResponse {
  task_id: string;
  channel: string;
  contact_phone: string;
  contact_name: string;
  resolved_message: string | null;
  template_unavailable: boolean;
  consent_status: 'green' | 'yellow' | 'red';
  consent_gap_reason: string | null;
  missing_fields: string[];
}

export interface WhatsAppNavigationResult {
  /** The URL to navigate to (e.g. /messages/:contactId?prefill=...) */
  url: string;
  /** Whether the template was unavailable (deleted or missing) */
  templateUnavailable: boolean;
  /** Notice message to display inline when template is unavailable */
  notice: string | null;
  /** Consent status from the prepare API */
  consentStatus: 'green' | 'yellow' | 'red';
  /** Consent gap reason if status is not green */
  consentGapReason: string | null;
  /** Fields that were missing during template resolution */
  missingFields: string[];
}

export interface WhatsAppExecutionError {
  type: 'consent_blocked' | 'api_error' | 'not_found';
  message: string;
}

export type WhatsAppExecutionResult =
  | { success: true; navigation: WhatsAppNavigationResult }
  | { success: false; error: WhatsAppExecutionError };

export interface MarkDoneResult {
  success: boolean;
  error?: string;
}

export interface LogActivityParams {
  contactId: string;
  taskId: string;
  playbookName: string;
  stepTitle: string;
  notes?: string;
}

// ─── Prepare & Navigate ──────────────────────────────────────────────────────

/**
 * Prepares a WhatsApp nurture task for execution by calling the prepare API
 * and returning navigation instructions.
 *
 * - If the template exists and resolves, returns URL with prefill query param (Req 8.1, 8.2)
 * - If no template is associated, returns URL with empty composer (Req 8.3)
 * - If template is unavailable (deleted), returns URL with empty composer + notice (Req 8.6)
 * - If consent is red, returns an error (task should not be executable) (Req 10.7)
 *
 * The agent can always edit the pre-filled message before sending (Req 8.4).
 * No auto-send in Phase 1 (Req 8.7).
 */
export async function prepareWhatsAppExecution(
  taskId: string,
  contactId: string
): Promise<WhatsAppExecutionResult> {
  try {
    const response = await fetch(`/api/nurture/tasks/${taskId}/prepare`);

    if (response.status === 404) {
      return {
        success: false,
        error: { type: 'not_found', message: 'Task not found' },
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: {
          type: 'api_error',
          message: `Failed to prepare task (status ${response.status})`,
        },
      };
    }

    const data: PrepareTaskResponse = await response.json();

    // Block execution if consent is red
    if (data.consent_status === 'red') {
      return {
        success: false,
        error: {
          type: 'consent_blocked',
          message: data.consent_gap_reason ?? 'Consent is required before WhatsApp outreach',
        },
      };
    }

    // Build navigation URL
    const baseUrl = `/messages/${contactId}`;
    const params = new URLSearchParams();

    if (data.template_unavailable) {
      // Template no longer exists — navigate with empty composer + notice (Req 8.6)
      params.set('nurture_task_id', taskId);
      params.set('template_unavailable', '1');

      return {
        success: true,
        navigation: {
          url: params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl,
          templateUnavailable: true,
          notice: 'The message template is no longer available. Please compose your message manually.',
          consentStatus: data.consent_status,
          consentGapReason: data.consent_gap_reason,
          missingFields: data.missing_fields,
        },
      };
    }

    if (data.resolved_message) {
      // Template resolved — navigate with prefill (Req 8.1, 8.2)
      params.set('prefill', data.resolved_message);
      params.set('nurture_task_id', taskId);
    } else {
      // No template associated — navigate with empty composer (Req 8.3)
      params.set('nurture_task_id', taskId);
    }

    return {
      success: true,
      navigation: {
        url: params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl,
        templateUnavailable: false,
        notice: null,
        consentStatus: data.consent_status,
        consentGapReason: data.consent_gap_reason,
        missingFields: data.missing_fields,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'api_error',
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

// ─── Mark Done & Log Activity ────────────────────────────────────────────────

/**
 * Marks a nurture task as done after the agent sends a message.
 * This should be called after the message is successfully sent.
 *
 * Requirements: 8.5
 */
export async function markTaskDone(
  taskId: string,
  notes?: string
): Promise<MarkDoneResult> {
  try {
    const response = await fetch(`/api/nurture/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'done',
        notes,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error ?? `Failed to mark task done (status ${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Logs a nurture activity entry in the contact's activity timeline.
 * Records the playbook name, step title, and channel.
 *
 * Requirements: 8.5
 */
export async function logNurtureActivity(
  params: LogActivityParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: params.contactId,
        type: 'nurture_whatsapp',
        metadata: {
          nurture_task_id: params.taskId,
          playbook_name: params.playbookName,
          step_title: params.stepTitle,
          channel: 'whatsapp',
        },
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.error ?? `Failed to log activity (status ${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ─── Combined Execution Handler ──────────────────────────────────────────────

/**
 * Complete WhatsApp execution handler that combines:
 * 1. Mark task as done
 * 2. Log activity in the contact timeline
 *
 * Call this after the agent sends the message from the chat thread.
 *
 * Requirements: 8.5
 */
export async function completeWhatsAppTask(params: {
  taskId: string;
  contactId: string;
  playbookName: string;
  stepTitle: string;
  notes?: string;
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Mark task done
  const doneResult = await markTaskDone(params.taskId, params.notes);
  if (!doneResult.success) {
    errors.push(doneResult.error ?? 'Failed to mark task done');
  }

  // Log activity
  const activityResult = await logNurtureActivity({
    contactId: params.contactId,
    taskId: params.taskId,
    playbookName: params.playbookName,
    stepTitle: params.stepTitle,
    notes: params.notes,
  });
  if (!activityResult.success) {
    errors.push(activityResult.error ?? 'Failed to log activity');
  }

  return { success: errors.length === 0, errors };
}
