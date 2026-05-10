'use client';

import { useDraggable } from '@dnd-kit/core';
import { LeadCard } from './lead-card';
import type { PipelineStage } from '@agentos/shared';

interface LeadWithRelations {
  id: string;
  status: PipelineStage;
  deal_type: string;
  urgency: string;
  source: string;
  intent_score: number | null;
  verification_score: number | null;
  eligibility_risk: boolean;
  last_activity_at: string | null;
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

interface DraggableLeadCardProps {
  lead: LeadWithRelations;
  isDragging: boolean;
}

export function DraggableLeadCard({ lead, isDragging }: DraggableLeadCardProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="transition-opacity"
    >
      <LeadCard lead={lead} />
    </div>
  );
}
