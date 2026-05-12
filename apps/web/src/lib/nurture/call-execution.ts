/**
 * Call Channel Execution Flow
 *
 * Encapsulates the call execution lifecycle for nurture tasks:
 * 1. Initiates a tel: deep link to the device dialer
 * 2. Provides a function to log call outcome and mark the task done
 * 3. Records an activity timeline entry on completion
 * 4. Handles missing phone numbers by disabling the call action
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CallTaskContext {
  taskId: string;
  contactId: string;
  contactPhone: string | null;
  contactName: string;
  playbookName: string;
  stepTitle: string;
}

export interface CallAvailability {
  canCall: boolean;
  reason: string | null;
}

export interface CallOutcomeInput {
  notes: string;
}

export interface CallOutcomeResult {
  success: boolean;
  error?: string;
}

export interface ActivityTimelineEntry {
  contact_id: string;
  type: string;
  direction: string;
  body: string;
  timestamp: string;
}

// ─── Call Availability Check ─────────────────────────────────────────────────

/**
 * Determines whether the call action is available for a given task context.
 * Returns canCall: false with a reason message when the contact has no phone number.
 *
 * Requirement 9.4: Disable call action with message when no phone number.
 */
export function checkCallAvailability(context: CallTaskContext): CallAvailability {
  if (!context.contactPhone || context.contactPhone.trim() === '') {
    return {
      canCall: false,
      reason: 'No phone number is available for this contact',
    };
  }

  return { canCall: true, reason: null };
}

// ─── Initiate Call ───────────────────────────────────────────────────────────

/**
 * Initiates a phone call by opening a tel: deep link to the device dialer.
 * Returns the tel: URI that was opened, or an error if the phone number is missing.
 *
 * Requirement 9.1: Deep-link to device dialer with contact phone number pre-filled.
 */
export function initiateCall(context: CallTaskContext): {
  success: boolean;
  telUri: string | null;
  error?: string;
} {
  const availability = checkCallAvailability(context);

  if (!availability.canCall) {
    return {
      success: false,
      telUri: null,
      error: availability.reason ?? 'Cannot initiate call',
    };
  }

  const sanitizedPhone = sanitizePhoneNumber(context.contactPhone!);
  const telUri = `tel:${sanitizedPhone}`;

  // Open the tel: URI to trigger the device dialer
  if (typeof window !== 'undefined') {
    window.open(telUri, '_self');
  }

  return { success: true, telUri };
}

// ─── Log Call Outcome ────────────────────────────────────────────────────────

/**
 * Logs the call outcome by marking the task as done with notes and recording
 * an activity timeline entry.
 *
 * Requirement 9.2: Prompt for call outcome notes on return.
 * Requirement 9.3: Record activity timeline entry with playbook name, step title,
 *                  call outcome notes, agent name, and completion timestamp.
 *
 * This function calls the PATCH /api/nurture/tasks/:id endpoint to mark the task
 * done and then inserts an activity timeline entry for the contact.
 */
export async function logCallOutcome(
  context: CallTaskContext,
  outcome: CallOutcomeInput,
  agentName: string
): Promise<CallOutcomeResult> {
  try {
    // 1. Mark the task as done with notes via the API
    const markDoneResponse = await fetch(`/api/nurture/tasks/${context.taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'done',
        notes: outcome.notes,
      }),
    });

    if (!markDoneResponse.ok) {
      const errorData = await markDoneResponse.json().catch(() => ({}));
      return {
        success: false,
        error: (errorData as { error?: string }).error ?? 'Failed to mark task as done',
      };
    }

    // 2. Record activity timeline entry for the contact
    const timelineEntry = buildActivityTimelineEntry(context, outcome, agentName);

    const timelineResponse = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timelineEntry),
    });

    // Timeline logging failure is non-critical — task is already marked done
    if (!timelineResponse.ok) {
      console.warn('[Call Execution] Failed to record activity timeline entry');
    }

    return { success: true };
  } catch (error) {
    console.error('[Call Execution] Error logging call outcome:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while logging the call outcome',
    };
  }
}

// ─── Activity Timeline Entry Builder ─────────────────────────────────────────

/**
 * Builds the activity timeline entry for a completed call.
 *
 * Requirement 9.3: Entry contains playbook name, step title, call outcome notes,
 *                  agent name, and completion timestamp.
 */
export function buildActivityTimelineEntry(
  context: CallTaskContext,
  outcome: CallOutcomeInput,
  agentName: string
): ActivityTimelineEntry {
  const body = [
    `[${context.playbookName}] ${context.stepTitle}`,
    `Agent: ${agentName}`,
    outcome.notes ? `Notes: ${outcome.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    contact_id: context.contactId,
    type: 'call',
    direction: 'outbound',
    body,
    timestamp: new Date().toISOString(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitizes a phone number for use in a tel: URI.
 * Removes spaces, dashes, and parentheses while preserving the + prefix.
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[\s\-()]/g, '');
}
