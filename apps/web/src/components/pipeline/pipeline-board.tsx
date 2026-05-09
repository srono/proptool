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

export function PipelineBoard({ leads, stages }: PipelineBoardProps) {
  // Filter out closed stages for the main board view
  const visibleStages = stages.filter(
    (s) => s.key !== 'closed_won' && s.key !== 'closed_lost'
  );

  return (
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
      <div className="flex gap-4 h-full min-w-max">
        {visibleStages.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);
          return (
            <div
              key={stage.key}
              className="flex flex-col min-w-[280px] lg:w-72 bg-gray-100 rounded-xl"
            >
              {/* Stage header */}
              <div className="p-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  {stage.label}
                </h3>
                <span className="text-xs font-medium text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                {stageLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
                {stageLeads.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">
                    No leads in this stage
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
