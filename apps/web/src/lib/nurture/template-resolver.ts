/**
 * Template placeholder resolution and validation for nurture message templates.
 *
 * Supported placeholders:
 * - {{contact_name}} → contact.full_name
 * - {{owned_property_label}} → contact.owned_property_label
 * - {{owned_property_town}} → contact.owned_property_town
 * - {{mop_date}} → contact.mop_date
 * - {{agent_name}} → agent.full_name
 * - {{trigger_date}} → contact[trigger_field]
 */

export const SUPPORTED_PLACEHOLDERS = [
  'contact_name',
  'owned_property_label',
  'owned_property_town',
  'mop_date',
  'agent_name',
  'trigger_date',
] as const;

export type SupportedPlaceholder = (typeof SUPPORTED_PLACEHOLDERS)[number];

export interface ResolveContext {
  contact: {
    full_name: string | null;
    owned_property_label: string | null;
    owned_property_town: string | null;
    mop_date: string | null;
    [key: string]: unknown;
  };
  agent: { full_name: string };
  trigger_field: string;
}

export interface ResolveResult {
  text: string;
  missing_fields: string[];
}

/**
 * Resolves {{placeholder}} patterns in a template string using the provided context.
 *
 * - Supported placeholders are replaced with their corresponding context values.
 * - If a context value is null or empty string, the placeholder is replaced with
 *   an empty string and the placeholder name is added to missing_fields.
 * - Unsupported placeholders are left as-is in the output (they should be caught
 *   by validateTemplatePlaceholders before reaching this point).
 */
export function resolveTemplate(template: string, ctx: ResolveContext): ResolveResult {
  const missing: string[] = [];

  const text = template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(SUPPORTED_PLACEHOLDERS as readonly string[]).includes(key)) {
      // Leave unsupported placeholders untouched
      return _match;
    }

    const value = getPlaceholderValue(key, ctx);
    if (value === null || value === undefined || value === '') {
      missing.push(key);
      return '';
    }
    return value;
  });

  return { text, missing_fields: missing };
}

/**
 * Validates that all {{placeholder}} patterns in a template body use supported
 * placeholder names.
 *
 * Returns valid: true if all placeholders are supported, or valid: false with
 * the list of invalid placeholder names.
 */
export function validateTemplatePlaceholders(body: string): {
  valid: boolean;
  invalid_placeholders: string[];
} {
  const found = Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
  const invalid = found.filter(
    (p) => !(SUPPORTED_PLACEHOLDERS as readonly string[]).includes(p)
  );
  return { valid: invalid.length === 0, invalid_placeholders: invalid };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function getPlaceholderValue(key: string, ctx: ResolveContext): string | null {
  switch (key) {
    case 'contact_name':
      return ctx.contact.full_name ?? null;
    case 'owned_property_label':
      return ctx.contact.owned_property_label ?? null;
    case 'owned_property_town':
      return ctx.contact.owned_property_town ?? null;
    case 'mop_date':
      return ctx.contact.mop_date ?? null;
    case 'agent_name':
      return ctx.agent.full_name ?? null;
    case 'trigger_date': {
      const triggerValue = ctx.contact[ctx.trigger_field];
      if (triggerValue === null || triggerValue === undefined) return null;
      return String(triggerValue);
    }
    default:
      return null;
  }
}
