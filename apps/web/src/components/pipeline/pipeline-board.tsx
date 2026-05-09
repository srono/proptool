'use client';

import { LeadCard } from './lead-card';
import type { PipelineStage } from '@propagent/shared';

interface PipelineStageConfig {
  key: PipelineStage;
  label: string;
  order: number;
}

interface LeadWithRelations {
  id: string;
  status: PipelineStage;
  deal_type: string;
  urgency: string;
  source: string;
  intent_score: number | null;
  verification_score: number | null;
  eligibility_risk: boolean;
  last_activity_at: string;
  created_at: string;
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
}

interface PipelineBoardProps {
  leads: LeadWithRelations[];
  stages: PipelineStageConfig[];
}

const stageColors: Record<number, string> = {
  0: 'bg-aqua',
  1: 'bg-aqua',
  2: 'bg-aqua',
  3: 'bg-brand',
  4: 'bg-brand',
  5: 'bg-status-green',
  6: 'bg-status-green',
};

export function PipelineBoard({ leads, stages }: PipelineBoardProps) {
  const visibleStages = stages.filter(
    (s) => s.key !== 'closed_won' && s.key !== 'closed_lost'
  );

  return (
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
      <div className="flex gap-3.5 h-full min-w-max">
        {visibleStages.map((stage, idx) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);
          return (
            <div
              key={stage.key}
              className="flex flex-col min-w-[270px] lg:w-[270px]"
            >
              {/* Stage header */}
              <div className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${stageColors[idx] ?? 'bg-brand'}`}
                  />
                  <span className="font-display font-bold text-xs tracking-[1.2px] text-white uppercase">
                    {stage.label}
                  </span>
                </div>
                <span className="text-[11px] text-gray-2 font-semibold">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2.5">
                {stageLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
                {/* Drop zone */}
                <div className="border border-dashed border-onyx-line rounded-[14px] p-3 text-center text-gray-2 text-[11px]">
                  + drag here
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
