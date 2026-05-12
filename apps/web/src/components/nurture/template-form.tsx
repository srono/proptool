'use client';

import { useCallback, useRef, useState } from 'react';
import { SUPPORTED_PLACEHOLDERS, validateTemplatePlaceholders } from '@/lib/nurture/template-resolver';
import type { TemplateChannel } from '@/lib/nurture/types';
import { TEMPLATE_CHANNELS } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TemplateFormData {
  name: string;
  channel: TemplateChannel;
  body: string;
}

export interface TemplateFormProps {
  /** Initial values for editing an existing template */
  initialData?: Partial<TemplateFormData>;
  /** Called on successful form submission */
  onSubmit: (data: TemplateFormData) => void | Promise<void>;
  /** Called when the user cancels */
  onCancel?: () => void;
  /** Whether the form is in a saving state */
  saving?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NAME_MAX = 100;
const BODY_MAX = 2000;

const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
};

const PLACEHOLDER_LABELS: Record<string, string> = {
  contact_name: 'Contact Name',
  owned_property_label: 'Property Label',
  owned_property_town: 'Property Town',
  mop_date: 'MOP Date',
  agent_name: 'Agent Name',
  trigger_date: 'Trigger Date',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Form for creating or editing message templates.
 * Supports name (max 100), channel (whatsapp/email), and body (max 2000)
 * with placeholder insertion buttons.
 *
 * Validates placeholders using validateTemplatePlaceholders before submission.
 *
 * Validates: Requirements 13.1, 13.2, 13.8
 */
export function TemplateForm({ initialData, onSubmit, onCancel, saving = false }: TemplateFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [channel, setChannel] = useState<TemplateChannel>(initialData?.channel ?? 'whatsapp');
  const [body, setBody] = useState(initialData?.body ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ─── Placeholder Insertion ───────────────────────────────────────────────

  const insertPlaceholder = useCallback((placeholder: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const tag = `{{${placeholder}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newBody = body.slice(0, start) + tag + body.slice(end);

    // Enforce max length
    if (newBody.length > BODY_MAX) return;

    setBody(newBody);

    // Clear body error when user modifies
    setErrors((prev) => {
      const next = { ...prev };
      delete next.body;
      delete next.placeholders;
      return next;
    });

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + tag.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }, [body]);

  // ─── Validation ──────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    // Name validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Template name is required';
    } else if (trimmedName.length > NAME_MAX) {
      newErrors.name = `Name must be ${NAME_MAX} characters or fewer`;
    }

    // Body validation
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      newErrors.body = 'Template body is required';
    } else if (trimmedBody.length > BODY_MAX) {
      newErrors.body = `Body must be ${BODY_MAX} characters or fewer`;
    }

    // Placeholder validation
    if (trimmedBody) {
      const { valid, invalid_placeholders } = validateTemplatePlaceholders(trimmedBody);
      if (!valid) {
        newErrors.placeholders = `Unsupported placeholder${invalid_placeholders.length > 1 ? 's' : ''}: ${invalid_placeholders.map((p) => `{{${p}}}`).join(', ')}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!validate()) return;

    await onSubmit({
      name: name.trim(),
      channel,
      body: body.trim(),
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Template Name */}
      <div>
        <label htmlFor="template-name" className="block text-sm font-medium text-white mb-1.5">
          Template Name
        </label>
        <input
          id="template-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => {
              const next = { ...prev };
              delete next.name;
              return next;
            });
          }}
          maxLength={NAME_MAX}
          disabled={saving}
          placeholder="e.g. MOP Reminder - Initial Outreach"
          className="w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-2/50 focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'template-name-error' : undefined}
        />
        <div className="flex justify-between mt-1">
          {errors.name ? (
            <p id="template-name-error" className="text-[11px] text-status-red" role="alert">
              {errors.name}
            </p>
          ) : (
            <span />
          )}
          <p className="text-[11px] text-gray-2">
            {name.length}/{NAME_MAX}
          </p>
        </div>
      </div>

      {/* Channel */}
      <div>
        <label htmlFor="template-channel" className="block text-sm font-medium text-white mb-1.5">
          Channel
        </label>
        <select
          id="template-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as TemplateChannel)}
          disabled={saving}
          className="w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {TEMPLATE_CHANNELS.map((ch) => (
            <option key={ch} value={ch}>
              {CHANNEL_LABELS[ch]}
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div>
        <label htmlFor="template-body" className="block text-sm font-medium text-white mb-1.5">
          Message Body
        </label>
        <textarea
          ref={bodyRef}
          id="template-body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setErrors((prev) => {
              const next = { ...prev };
              delete next.body;
              delete next.placeholders;
              return next;
            });
          }}
          maxLength={BODY_MAX}
          rows={6}
          disabled={saving}
          placeholder="Type your message here. Use the buttons below to insert placeholders."
          className="w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-2/50 focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[120px]"
          aria-invalid={!!(errors.body || errors.placeholders)}
          aria-describedby={
            errors.body
              ? 'template-body-error'
              : errors.placeholders
              ? 'template-placeholder-error'
              : undefined
          }
        />
        <div className="flex justify-between mt-1">
          {errors.body ? (
            <p id="template-body-error" className="text-[11px] text-status-red" role="alert">
              {errors.body}
            </p>
          ) : errors.placeholders ? (
            <p id="template-placeholder-error" className="text-[11px] text-status-red" role="alert">
              {errors.placeholders}
            </p>
          ) : (
            <span />
          )}
          <p className="text-[11px] text-gray-2">
            {body.length}/{BODY_MAX}
          </p>
        </div>
      </div>

      {/* Placeholder Insertion Buttons */}
      <div>
        <p className="text-[11px] font-medium text-gray-2 uppercase tracking-label mb-2">
          Insert Placeholder
        </p>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_PLACEHOLDERS.map((placeholder) => (
            <button
              key={placeholder}
              type="button"
              onClick={() => insertPlaceholder(placeholder)}
              disabled={saving}
              className="px-2.5 py-1.5 text-[12px] font-medium text-brand bg-brand/10 border border-brand/20 rounded-md hover:bg-brand/20 hover:border-brand/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Insert ${PLACEHOLDER_LABELS[placeholder]} placeholder`}
            >
              {`{{${placeholder}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-2 border border-onyx-line rounded-lg hover:text-white hover:border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className={`flex-1 btn-primary py-2.5 text-sm font-semibold ${
            saving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {saving ? 'Saving...' : initialData ? 'Update Template' : 'Create Template'}
        </button>
      </div>
    </form>
  );
}
