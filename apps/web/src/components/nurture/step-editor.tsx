'use client';

import { useCallback } from 'react';
import type { PlaybookStep, StepChannel } from '@/lib/nurture/types';
import { STEP_CHANNELS } from '@/lib/nurture/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_STEPS = 50;
const OFFSET_MIN = -365;
const OFFSET_MAX = 365;
const TITLE_MIN = 1;
const TITLE_MAX = 80;

// ─── Template Option ─────────────────────────────────────────────────────────

export interface TemplateOption {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email';
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface StepEditorProps {
  /** Current steps array (controlled) */
  value: PlaybookStep[];
  /** Called when steps change */
  onChange: (steps: PlaybookStep[]) => void;
  /** Available templates for the template selector */
  templates?: TemplateOption[];
  /** Whether the editor is disabled */
  disabled?: boolean;
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

interface StepValidationErrors {
  offset_days?: string;
  title?: string;
}

function validateStep(step: PlaybookStep): StepValidationErrors {
  const errors: StepValidationErrors = {};

  if (
    !Number.isInteger(step.offset_days) ||
    step.offset_days < OFFSET_MIN ||
    step.offset_days > OFFSET_MAX
  ) {
    errors.offset_days = `Must be between ${OFFSET_MIN} and ${OFFSET_MAX}`;
  }

  if (!step.title || step.title.length < TITLE_MIN) {
    errors.title = 'Title is required';
  } else if (step.title.length > TITLE_MAX) {
    errors.title = `Must be ${TITLE_MAX} characters or fewer`;
  }

  return errors;
}

// ─── Channel Labels ──────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<StepChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Call',
  task_only: 'Task Only',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Step list editor for playbook steps.
 * Supports add/remove, inline validation, reordering (move up/down),
 * and template selection per step.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
export function StepEditor({ value, onChange, templates = [], disabled = false }: StepEditorProps) {
  const canAddStep = value.length < MAX_STEPS;

  const addStep = useCallback(() => {
    if (value.length >= MAX_STEPS) return;
    const newStep: PlaybookStep = {
      id: crypto.randomUUID(),
      offset_days: 0,
      channel: 'whatsapp',
      template_id: null,
      create_task: true,
      title: '',
    };
    onChange([...value, newStep]);
  }, [value, onChange]);

  const removeStep = useCallback(
    (index: number) => {
      const updated = value.filter((_, i) => i !== index);
      onChange(updated);
    },
    [value, onChange]
  );

  const updateStep = useCallback(
    (index: number, patch: Partial<PlaybookStep>) => {
      const updated = value.map((step, i) => (i === index ? { ...step, ...patch } : step));
      onChange(updated);
    },
    [value, onChange]
  );

  const moveStep = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= value.length) return;
      const updated = [...value];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      onChange(updated);
    },
    [value, onChange]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Steps{' '}
          <span className="text-gray-2 font-normal">
            ({value.length}/{MAX_STEPS})
          </span>
        </h3>
        <button
          type="button"
          onClick={addStep}
          disabled={disabled || !canAddStep}
          aria-label="Add step"
          className="text-xs font-medium text-brand hover:text-brand/80 disabled:text-gray-2 disabled:cursor-not-allowed transition-colors"
        >
          + Add Step
        </button>
      </div>

      {/* Max steps warning */}
      {value.length >= MAX_STEPS && (
        <p className="text-[11px] text-status-amber" role="alert">
          Maximum of {MAX_STEPS} steps reached.
        </p>
      )}

      {/* Empty state */}
      {value.length === 0 && (
        <div className="bg-onyx-card border border-onyx-line border-dashed rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-2">
            No steps yet. Add a step to define your playbook sequence.
          </p>
        </div>
      )}

      {/* Step list */}
      <div className="space-y-2">
        {value.map((step, index) => {
          const errors = validateStep(step);
          const hasErrors = Object.keys(errors).length > 0;
          const templatesForChannel = templates.filter(
            (t) => t.channel === step.channel
          );
          const showTemplateSelector =
            step.channel === 'whatsapp' || step.channel === 'email';

          return (
            <div
              key={step.id}
              className={`bg-onyx-card border rounded-2xl p-4 space-y-3 ${
                hasErrors ? 'border-status-red/50' : 'border-onyx-line'
              }`}
              aria-label={`Step ${index + 1}`}
            >
              {/* Step header with reorder and remove */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-2 font-semibold uppercase tracking-label">
                  Step {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(index, 'up')}
                    disabled={disabled || index === 0}
                    aria-label={`Move step ${index + 1} up`}
                    className="p-1 text-gray-2 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(index, 'down')}
                    disabled={disabled || index === value.length - 1}
                    aria-label={`Move step ${index + 1} down`}
                    className="p-1 text-gray-2 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={disabled}
                    aria-label={`Remove step ${index + 1}`}
                    className="p-1 text-gray-2 hover:text-status-red disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor={`step-title-${step.id}`}
                  className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1"
                >
                  Title *
                </label>
                <input
                  id={`step-title-${step.id}`}
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(index, { title: e.target.value })}
                  maxLength={TITLE_MAX}
                  placeholder="e.g. Initial MOP reminder"
                  disabled={disabled}
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? `step-title-error-${step.id}` : undefined}
                  className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between mt-0.5">
                  {errors.title ? (
                    <p
                      id={`step-title-error-${step.id}`}
                      className="text-[11px] text-status-red"
                      role="alert"
                    >
                      {errors.title}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] text-gray-2">
                    {step.title.length}/{TITLE_MAX}
                  </span>
                </div>
              </div>

              {/* Offset days and Channel row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Offset Days */}
                <div>
                  <label
                    htmlFor={`step-offset-${step.id}`}
                    className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1"
                  >
                    Offset Days *
                  </label>
                  <input
                    id={`step-offset-${step.id}`}
                    type="number"
                    value={step.offset_days}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                      updateStep(index, { offset_days: isNaN(val) ? 0 : val });
                    }}
                    min={OFFSET_MIN}
                    max={OFFSET_MAX}
                    disabled={disabled}
                    aria-invalid={!!errors.offset_days}
                    aria-describedby={errors.offset_days ? `step-offset-error-${step.id}` : undefined}
                    className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {errors.offset_days && (
                    <p
                      id={`step-offset-error-${step.id}`}
                      className="text-[11px] text-status-red mt-0.5"
                      role="alert"
                    >
                      {errors.offset_days}
                    </p>
                  )}
                </div>

                {/* Channel */}
                <div>
                  <label
                    htmlFor={`step-channel-${step.id}`}
                    className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1"
                  >
                    Channel *
                  </label>
                  <select
                    id={`step-channel-${step.id}`}
                    value={step.channel}
                    onChange={(e) => {
                      const newChannel = e.target.value as StepChannel;
                      const patch: Partial<PlaybookStep> = { channel: newChannel };
                      // Clear template_id if switching to a channel that doesn't support templates
                      if (newChannel !== 'whatsapp' && newChannel !== 'email') {
                        patch.template_id = null;
                      }
                      updateStep(index, patch);
                    }}
                    disabled={disabled}
                    className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {STEP_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {CHANNEL_LABELS[ch]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template Selector (only for whatsapp/email) */}
              {showTemplateSelector && (
                <div>
                  <label
                    htmlFor={`step-template-${step.id}`}
                    className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1"
                  >
                    Template
                  </label>
                  <select
                    id={`step-template-${step.id}`}
                    value={step.template_id ?? ''}
                    onChange={(e) =>
                      updateStep(index, {
                        template_id: e.target.value || null,
                      })
                    }
                    disabled={disabled}
                    className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No template (compose manually)</option>
                    {templatesForChannel.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-2 mt-0.5">
                    Optional. Pre-fills the message when executing this step.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add step button at bottom (when steps exist) */}
      {value.length > 0 && canAddStep && (
        <button
          type="button"
          onClick={addStep}
          disabled={disabled}
          className="w-full border border-dashed border-onyx-line rounded-2xl py-3 text-sm text-gray-2 hover:text-white hover:border-brand/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          + Add Step
        </button>
      )}
    </div>
  );
}
