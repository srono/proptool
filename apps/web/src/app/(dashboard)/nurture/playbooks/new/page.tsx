'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlaybookForm, type PlaybookFormData } from '@/components/nurture/playbook-form';
import { StepEditor } from '@/components/nurture/step-editor';
import { SegmentBuilder } from '@/components/nurture/segment-builder';
import type { PlaybookStep, SegmentDefinition } from '@/lib/nurture/types';

export default function NewPlaybookPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<PlaybookStep[]>([]);
  const [segment, setSegment] = useState<SegmentDefinition>({ conditions: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: PlaybookFormData) {
    if (steps.length === 0) {
      setError('At least one step is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/nurture/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          trigger_field: formData.trigger_field,
          target_ad_purpose: formData.target_ad_purpose || undefined,
          steps_json: steps,
          segment_definition_json: segment,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Failed to create playbook.');
        return;
      }

      const { playbook } = await res.json();
      router.push(`/nurture/playbooks/${playbook.id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 lg:p-7 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
          New Playbook
        </h1>
        <p className="text-[13px] text-gray-2">
          Define a nurture sequence with steps, timing, and target segment.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-status-red/10 border border-status-red/30 rounded-xl px-4 py-3" role="alert">
          <p className="text-sm text-status-red">{error}</p>
        </div>
      )}

      {/* Playbook form (name, description, trigger field, target ad purpose) */}
      <section>
        <h2 className="text-sm font-display font-bold text-white mb-3">Details</h2>
        <PlaybookForm onSubmit={handleSubmit} submitting={submitting} />
      </section>

      {/* Step editor */}
      <section className="bg-onyx-card border border-onyx-line rounded-2xl p-5">
        <StepEditor value={steps} onChange={setSteps} disabled={submitting} />
      </section>

      {/* Segment builder */}
      <section className="bg-onyx-card border border-onyx-line rounded-2xl p-5">
        <SegmentBuilder value={segment} onChange={setSegment} />
      </section>
    </div>
  );
}
