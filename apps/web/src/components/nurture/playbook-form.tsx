'use client';

import { useState, useCallback } from 'react';
import { z } from 'zod';

// ─── Allowed trigger fields (date-type fields on contacts table) ─────────────

export const ALLOWED_TRIGGER_FIELDS = [
  { value: 'mop_date', label: 'MOP Date' },
  { value: 'owned_property_key_collection_date', label: 'Key Collection Date' },
] as const;

export type TriggerFieldValue = (typeof ALLOWED_TRIGGER_FIELDS)[number]['value'];

// ─── Form Zod Schema ─────────────────────────────────────────────────────────

export const playbookFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .default(''),
  trigger_field: z
    .string()
    .min(1, 'Trigger field is required'),
  target_ad_purpose: z.string().optional(),
});

export type PlaybookFormData = z.infer<typeof playbookFormSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PlaybookFormProps {
  /** Called with validated form data on submit */
  onSubmit: (data: PlaybookFormData) => void | Promise<void>;
  /** Pre-fill form for edit mode */
  initialData?: Partial<PlaybookFormData>;
  /** Whether the form is currently submitting */
  submitting?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Playbook create/edit form.
 * Fields: name (max 100), description (max 500), trigger_field (dropdown),
 * and target_ad_purpose (optional text).
 * Uses Zod for client-side validation.
 *
 * Validates: Requirements 2.1, 2.9
 */
export function PlaybookForm({ onSubmit, initialData, submitting = false }: PlaybookFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [triggerField, setTriggerField] = useState(initialData?.trigger_field ?? '');
  const [targetAdPurpose, setTargetAdPurpose] = useState(initialData?.target_ad_purpose ?? '');
  const [errors, setErrors] = useState<Partial<Record<keyof PlaybookFormData, string>>>({});

  const isEditMode = !!initialData;

  const validate = useCallback((): PlaybookFormData | null => {
    const result = playbookFormSchema.safeParse({
      name: name.trim(),
      description: description.trim(),
      trigger_field: triggerField,
      target_ad_purpose: targetAdPurpose.trim() || undefined,
    });

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof PlaybookFormData, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PlaybookFormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return null;
    }

    setErrors({});
    return result.data;
  }, [name, description, triggerField, targetAdPurpose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = validate();
    if (!data) return;
    await onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="bg-onyx-card border border-onyx-line rounded-2xl p-5 space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="playbook-name"
            className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
          >
            Name *
          </label>
          <input
            id="playbook-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            maxLength={100}
            placeholder="e.g. HDB MOP Nurture"
            disabled={submitting}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'playbook-name-error' : undefined}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between mt-1">
            {errors.name ? (
              <p id="playbook-name-error" className="text-[11px] text-status-red" role="alert">
                {errors.name}
              </p>
            ) : (
              <span />
            )}
            <span className="text-[11px] text-gray-2">{name.length}/100</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="playbook-description"
            className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
          >
            Description
          </label>
          <textarea
            id="playbook-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            maxLength={500}
            rows={3}
            placeholder="Describe the purpose of this playbook..."
            disabled={submitting}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'playbook-description-error' : undefined}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between mt-1">
            {errors.description ? (
              <p id="playbook-description-error" className="text-[11px] text-status-red" role="alert">
                {errors.description}
              </p>
            ) : (
              <span />
            )}
            <span className="text-[11px] text-gray-2">{description.length}/500</span>
          </div>
        </div>

        {/* Trigger Field */}
        <div>
          <label
            htmlFor="playbook-trigger-field"
            className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
          >
            Trigger Field *
          </label>
          <select
            id="playbook-trigger-field"
            value={triggerField}
            onChange={(e) => {
              setTriggerField(e.target.value);
              if (errors.trigger_field) setErrors((prev) => ({ ...prev, trigger_field: undefined }));
            }}
            disabled={submitting}
            aria-invalid={!!errors.trigger_field}
            aria-describedby={errors.trigger_field ? 'playbook-trigger-field-error' : undefined}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select a trigger field</option>
            {ALLOWED_TRIGGER_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          {errors.trigger_field && (
            <p id="playbook-trigger-field-error" className="text-[11px] text-status-red mt-1" role="alert">
              {errors.trigger_field}
            </p>
          )}
          <p className="text-[11px] text-gray-2 mt-1">
            The date field used to compute step timing for each contact.
          </p>
        </div>

        {/* Target Ad Purpose (optional) */}
        <div>
          <label
            htmlFor="playbook-target-ad-purpose"
            className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5"
          >
            Target Ad Purpose
          </label>
          <input
            id="playbook-target-ad-purpose"
            type="text"
            value={targetAdPurpose}
            onChange={(e) => {
              setTargetAdPurpose(e.target.value);
              if (errors.target_ad_purpose)
                setErrors((prev) => ({ ...prev, target_ad_purpose: undefined }));
            }}
            placeholder="e.g. property_sale (optional)"
            disabled={submitting}
            aria-describedby="playbook-target-ad-purpose-hint"
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p id="playbook-target-ad-purpose-hint" className="text-[11px] text-gray-2 mt-1">
            If set, contacts whose ad_purpose doesn&apos;t match will show a consent warning.
          </p>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full btn-primary py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? isEditMode
            ? 'Saving...'
            : 'Creating...'
          : isEditMode
            ? 'Save Playbook'
            : 'Create Playbook'}
      </button>
    </form>
  );
}
