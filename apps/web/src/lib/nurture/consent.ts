export type ConsentBadge = 'green' | 'yellow' | 'red';

export interface ConsentInput {
  whatsapp_optin: boolean;
  channel_preference: string;
  ad_purpose: string | null;
  target_ad_purpose: string | null;
  dnc_registered: boolean;
  data_retention_expiry: string | null;
  task_channel: string;
}

export function computeConsentBadge(input: ConsentInput): ConsentBadge {
  const now = new Date();

  // Red conditions (highest priority)
  if (!input.whatsapp_optin && input.task_channel === 'whatsapp') return 'red';
  if (input.channel_preference === 'none') return 'red';
  if (input.data_retention_expiry && new Date(input.data_retention_expiry) < now) return 'red';
  if (input.task_channel === 'call' && input.dnc_registered) return 'red';

  // Yellow condition
  if (input.whatsapp_optin && input.target_ad_purpose && input.ad_purpose !== input.target_ad_purpose) {
    return 'yellow';
  }

  // Default to green
  return 'green';
}

/**
 * Input for task generation exclusion check.
 * Used by the Task_Generator to determine if a contact should be excluded
 * from nurture task generation based on PDPA consent rules.
 */
export interface TaskExclusionInput {
  whatsapp_optin: boolean;
  channel_preference: string;
  data_retention_expiry: string | null;
  step_channel: string;
}

/**
 * Determines whether a contact should be excluded from task generation.
 *
 * A contact is excluded if any of the following hold:
 * 1. whatsapp_optin is false AND step channel is "whatsapp"
 * 2. channel_preference is "none"
 * 3. data_retention_expiry is not null AND is earlier than the current date
 *
 * @param input - The consent and channel fields to evaluate
 * @param now - Optional current date for testability (defaults to new Date())
 * @returns true if the contact should be excluded from task generation
 */
export function shouldExcludeFromTaskGeneration(
  input: TaskExclusionInput,
  now: Date = new Date()
): boolean {
  // Condition 1: No WhatsApp opt-in and step channel is WhatsApp
  if (!input.whatsapp_optin && input.step_channel === 'whatsapp') return true;

  // Condition 2: Channel preference is none
  if (input.channel_preference === 'none') return true;

  // Condition 3: Data retention expired
  if (input.data_retention_expiry && new Date(input.data_retention_expiry) < now) return true;

  return false;
}
