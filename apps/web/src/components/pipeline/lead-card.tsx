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
  const urgency = URGENCY_CONFIG[lead.urgency as keyof typeof URGENCY_CONFIG];
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(lead.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const overdueTasks = lead.tasks.filter(
    (t) => !t.completed_at && new Date(t.due_at) < new Date()
  );

  const verificationBadge = lead.verification_score === 3
    ? '🟢'
    : lead.verification_score === 2
    ? '🟡'
    : lead.verification_score === 1
    ? '🔴'
    : null;

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
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/leads/${lead.id}`}>
        {/* Header row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {lead.contact?.full_name ?? 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {lead.contact?.phone}
            </p>
          </div>
          <span className="text-xs ml-2">{urgency?.emoji}</span>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
            {lead.deal_type}
          </span>
          {lead.eligibility_risk && (
            <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-xs text-red-700">
              🔴 Eligibility
            </span>
          )}
          {verificationBadge && (
            <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-xs">
              {verificationBadge}
            </span>
          )}
          {lead.intent_score && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
              Intent: {lead.intent_score}/5
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <span className={daysSinceActivity > 3 ? 'text-red-600 font-medium' : 'text-gray-400'}>
            {daysSinceActivity === 0 ? 'Today' : `${daysSinceActivity}d ago`}
          </span>
          {overdueTasks.length > 0 && (
            <span className="text-red-600 font-medium">
              {overdueTasks.length} overdue
            </span>
          )}
        </div>
      </Link>

      {/* Stage selector */}
      <div className="mt-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <select
          value={lead.status}
          onChange={handleStageChange}
          disabled={updating}
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
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
