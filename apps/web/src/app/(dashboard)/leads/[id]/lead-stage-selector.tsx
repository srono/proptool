'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PIPELINE_STAGES } from '@agentos/shared';
import type { PipelineStage } from '@agentos/shared';

interface Props {
  leadId: string;
  currentStage: PipelineStage;
}

export function LeadStageSelector({ leadId, currentStage }: Props) {
  const [stage, setStage] = useState<PipelineStage>(currentStage);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleChange(newStage: PipelineStage) {
    setStage(newStage);
    const supabase = createClient();

    const { error } = await supabase
      .from('leads')
      .update({ status: newStage, last_activity_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) {
      console.error('Failed to update stage:', error);
      setStage(currentStage);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex-shrink-0">
      <select
        value={stage}
        onChange={(e) => handleChange(e.target.value as PipelineStage)}
        disabled={isPending}
        className="text-sm rounded-pill border border-onyx-line bg-onyx-card px-4 py-2 font-medium text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
