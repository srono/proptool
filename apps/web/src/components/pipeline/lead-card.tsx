'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { URGENCY_CONFIG, PIPELINE_STAGES } from '@propagent/shared';
import type { PipelineStage } from '@propagent/shared';
import { createClient } from '@/lib/supabase/client';

interface LeadCardProps {
  lead: {
    id: string;
    status: PipelineStage;
    deal_type: string;
    urgency: string;
    source: string;
    intent_score: number | null;
    verification_score: number | null;
    eligibility_risk: boolean;
    last_activity_at: string;
    contact: {
      full_name: string;
      phone: string;
      email: string | null;
    } | null;
    tasks: {
      id: string;
      title: string;
      due_at: string;
      completed_at: string | null;
    }[];
  };
}

export function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const isHot = lead.urgency === 'hot' || (lead.intent_score && lead.intent_score >= 4);

  async function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = e.target.value as PipelineStage;
    if (newStatus === lead.status) return;

    setUpdating(true);
    const supabase = createClient();
    await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', lead.id);
    setUpdating(false);
    router.refresh();
  }

  return (
    <div
      className={`bg-onyx-card border rounded-[14px] p-3.5 transition-shadow hover:shadow-lg ${
        isHot ? 'border-aqua/40' : 'border-onyx-line'
      }`}
    >
      <Link href={`/leads/${lead.id}`} className="block">
        {/* Hot indicator */}
        {isHot && (
          <div className="flex items-center gap-1 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-aqua shadow-[0_0_8px_theme(colors.aqua.DEFAULT)]" />
            <span className="text-[10px] text-aqua font-bold tracking-wider">HOT</span>
          </div>
        )}

        {/* Name + phone */}
        <div className="text-sm font-semibold text-white tracking-tight">
          {lead.contact?.full_name ?? 'Unknown'}
        </div>
        <div className="text-[11px] text-gray-2 mt-0.5">
          {lead.contact?.phone}
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="chip text-aqua border-brand/50 bg-brand/[0.12]">
            {lead.deal_type}
          </span>
          {lead.eligibility_risk && (
            <span className="chip text-status-red border-status-red/40 bg-status-red/10">
              ELIG WATCH
            </span>
          )}
          {lead.intent_score && (
            <span
              className={`chip ${
                lead.intent_score >= 4
                  ? 'text-status-green border-status-green/40 bg-status-green/10'
                  : 'text-status-amber border-status-amber/40 bg-status-amber/10'
              }`}
            >
              INTENT {lead.intent_score}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-onyx-line">
          <span className="text-[11px] text-gray-2">
            {daysSinceActivity === 0 ? 'Today' : `${daysSinceActivity}d ago`}
          </span>
          <div className="flex gap-1.5">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-pill border border-onyx-line text-[10px] text-gray-2 font-semibold tracking-wide">
              WA
            </span>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-pill border border-onyx-line text-[10px] text-gray-2 font-semibold tracking-wide">
              Call
            </span>
          </div>
        </div>
      </Link>

      {/* Stage selector */}
      <div className="mt-2.5 pt-2.5 border-t border-onyx-line" onClick={(e) => e.stopPropagation()}>
        <select
          value={lead.status}
          onChange={handleStageChange}
          disabled={updating}
          className="w-full text-xs bg-onyx-raised border border-onyx-line rounded-pill px-3 py-1.5 text-gray-2 focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
