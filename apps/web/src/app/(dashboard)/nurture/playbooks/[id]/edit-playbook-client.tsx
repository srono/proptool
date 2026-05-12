'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlaybookForm, type PlaybookFormData } from '@/components/nurture/playbook-form';
import { StepEditor, type TemplateOption } from '@/components/nurture/step-editor';
import { SegmentBuilder } from '@/components/nurture/segment-builder';
import type { PlaybookStep, SegmentDefinition } from '@/lib/nurture/types';

interface Playbook {
  id: string;
  name: string;
  description: string;
  active: boolean;
  segment_definition_json: SegmentDefinition;
  trigger_field: string;
  steps_json: PlaybookStep[];
  target_ad_purpose: string | null;
  created_at: string;
  updated_at: string;
}

interface EditPlaybookClientProps {
  playbook: Playbook;
  templates: TemplateOption[];
}

export function EditPlaybookClient({ playbook, templates }: EditPlaybookClientProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<PlaybookStep[]>(playbook.steps_json ?? []);
  const [segment, setSegment] = useState<SegmentDefinition>(
    playbook.segment_definition_json ?? { conditions: [] }
  );
  const [active, setActive] = useState(playbook.active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: PlaybookFormData) {
    if (steps.length === 0) {
      setError('At least one step is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/nurture/playbooks/${playbook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          trigger_field: formData.trigger_field,
          target_ad_purpose: formData.target_ad_purpose || null,
          steps_json: steps,
          segment_definition_json: segment,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to update playbook.');
        return;
      }

      setSuccess('Playbook saved successfully.');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/nurture/playbooks/${playbook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to update playbook status.');
        return;
      }

      setActive(!active);
      setSuccess(`Playbook ${!active ? 'activated' : 'deactivated'}.`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this playbook? This cannot be undone.')) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/nurture/playbooks/${playbook.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to delete playbook.');
        return;
      }

      router.push('/nurture/playbooks');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 lg:p-7 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            {playbook.name}
          </h1>
          <p className="text-[13px] text-gray-2">
            Edit playbook details, steps, and segment targeting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={submitting}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              active
                ? 'text-status-amber border-status-amber/40 hover:bg-status-amber/10'
                : 'text-status-green border-status-green/40 hover:bg-status-green/10'
            }`}
          >
            {active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border text-status-red border-status-red/40 hover:bg-status-red/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
            active
              ? 'text-status-green border-status-green/40 bg-status-green/10'
              : 'text-gray-2 border-onyx-line bg-onyx-card'
          }`}
        >
          {active ? 'Active' : 'Inactive'}
        </span>
        <span className="text-[11px] text-gray-2">
          Last updated{' '}
          {new Date(playbook.updated_at).toLocaleDateString('en-SG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Error / Success banners */}
      {error && (
        <div className="bg-status-red/10 border border-status-red/30 rounded-xl px-4 py-3" role="alert">
          <p className="text-sm text-status-red">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-status-green/10 border border-status-green/30 rounded-xl px-4 py-3" role="status">
          <p className="text-sm text-status-green">{success}</p>
        </div>
      )}

      {/* Playbook form (pre-filled) */}
      <section>
        <h2 className="text-sm font-display font-bold text-white mb-3">Details</h2>
        <PlaybookForm
          onSubmit={handleSubmit}
          initialData={{
            name: playbook.name,
            description: playbook.description,
            trigger_field: playbook.trigger_field,
            target_ad_purpose: playbook.target_ad_purpose ?? undefined,
          }}
          submitting={submitting}
        />
      </section>

      {/* Step editor (pre-filled) */}
      <section className="bg-onyx-card border border-onyx-line rounded-2xl p-5">
        <StepEditor
          value={steps}
          onChange={setSteps}
          templates={templates}
          disabled={submitting}
        />
      </section>

      {/* Segment builder (pre-filled) */}
      <section className="bg-onyx-card border border-onyx-line rounded-2xl p-5">
        <SegmentBuilder value={segment} onChange={setSegment} />
      </section>
    </div>
  );
}
