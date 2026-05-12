'use client';

import { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { DroppableColumn } from './droppable-column';
import { DraggableLeadCard } from './draggable-lead-card';
import { LeadCard } from './lead-card';
import { columnKeyboardCoordinates } from './keyboard-coordinates';
import { createAnnouncements } from './announcements';
import type { PipelineStage } from '@agentos/shared';

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

interface PipelineBoardProps {
  leads: LeadWithRelations[];
  stages: PipelineStageConfig[];
}

export function PipelineBoard({ leads, stages }: PipelineBoardProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const dndContextId = useId();

  // Local optimistic state, synced from props
  const [localLeads, setLocalLeads] = useState<LeadWithRelations[]>(leads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync local state when props change (e.g., after router.refresh())
  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
    })
  );

  // Filter visible stages (exclude closed_won and closed_lost)
  const visibleStages = useMemo(
    () => stages.filter((s) => s.key !== 'closed_won' && s.key !== 'closed_lost'),
    [stages]
  );

  // Screen reader announcements
  const announcements = useMemo(
    () => createAnnouncements(localLeads, visibleStages),
    [localLeads, visibleStages]
  );

  // Find the active lead for DragOverlay
  const activeLead = useMemo(
    () => (activeId ? localLeads.find((l) => l.id === activeId) ?? null : null),
    [activeId, localLeads]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      // Guard against concurrent drops
      if (isUpdating) {
        setActiveId(null);
        return;
      }

      // No valid drop target
      if (!over) {
        setActiveId(null);
        return;
      }

      const leadId = active.id as string;
      const newStage = over.id as PipelineStage;

      // Find the lead's current status
      const lead = localLeads.find((l) => l.id === leadId);
      if (!lead) {
        setActiveId(null);
        return;
      }

      // Guard against same-column drops (no-op)
      if (lead.status === newStage) {
        setActiveId(null);
        return;
      }

      // Optimistic update
      const previousLeads = localLeads;
      setIsUpdating(true);
      setLocalLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStage } : l))
      );
      setActiveId(null);

      // Persist to Supabase
      const supabase = createClient();
      const { error } = await supabase
        .from('leads')
        .update({ status: newStage, last_activity_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) {
        // Revert on error
        setLocalLeads(previousLeads);
        addToast('Failed to update lead stage. Please try again.', 'error');
      } else {
        router.refresh();
      }

      setIsUpdating(false);
    },
    [isUpdating, localLeads, addToast, router]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements }}
    >
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
        <div className="flex gap-3.5 h-full min-w-max">
          {visibleStages.map((stage, idx) => {
            const stageLeads = localLeads.filter((l) => l.status === stage.key);
            return (
              <DroppableColumn
                key={stage.key}
                stageKey={stage.key}
                label={stage.label}
                count={stageLeads.length}
                colorIndex={idx}
                isOver={false}
                isDragging={activeId !== null}
              >
                {stageLeads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    isDragging={activeId === lead.id}
                  />
                ))}
                {/* Drop zone hint */}
                <div
                  className={cn(
                    'border border-onyx-line rounded-[14px] p-3 text-center text-[11px] transition-colors',
                    activeId !== null
                      ? 'border-brand/60 bg-brand/5 text-brand'
                      : 'border-onyx-line/50 text-gray-2/60'
                  )}
                >
                  Drop here
                </div>
              </DroppableColumn>
            );
          })}
        </div>
      </div>

      {/* Drag overlay: styled clone of the active card */}
      <DragOverlay>
        {activeLead ? (
          <div className="shadow-xl rotate-2">
            <LeadCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
