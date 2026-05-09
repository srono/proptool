import type { Announcements } from '@dnd-kit/core';

interface LeadWithRelations {
  id: string;
  status: string;
  contact: {
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
}

interface PipelineStageConfig {
  key: string;
  label: string;
  order: number;
}

/**
 * Provides screen reader announcements for drag operations.
 * - onDragStart: "Picked up {contact name} from {stage}"
 * - onDragOver: "Moved {contact name} over {stage} column"
 * - onDragEnd: "Dropped {contact name} in {stage}"
 * - onDragCancel: "Drag cancelled, {contact name} returned to {original stage}"
 */
export function createAnnouncements(
  leads: LeadWithRelations[],
  stages: PipelineStageConfig[]
): Announcements {
  function getContactName(leadId: string | number): string {
    const lead = leads.find((l) => l.id === String(leadId));
    return lead?.contact?.full_name ?? 'Unknown contact';
  }

  function getStageLabel(stageKey: string | number): string {
    const stage = stages.find((s) => s.key === String(stageKey));
    return stage?.label ?? 'unknown stage';
  }

  function getLeadCurrentStageLabel(leadId: string | number): string {
    const lead = leads.find((l) => l.id === String(leadId));
    if (!lead) return 'unknown stage';
    return getStageLabel(lead.status);
  }

  return {
    onDragStart({ active }) {
      const name = getContactName(active.id);
      const stageLabel = getLeadCurrentStageLabel(active.id);
      return `Picked up ${name} from ${stageLabel}`;
    },
    onDragOver({ active, over }) {
      const name = getContactName(active.id);
      if (!over) return undefined;
      const stageLabel = getStageLabel(over.id);
      return `Moved ${name} over ${stageLabel} column`;
    },
    onDragEnd({ active, over }) {
      const name = getContactName(active.id);
      if (!over) return `Drag cancelled, ${name} returned to ${getLeadCurrentStageLabel(active.id)}`;
      const stageLabel = getStageLabel(over.id);
      return `Dropped ${name} in ${stageLabel}`;
    },
    onDragCancel({ active }) {
      const name = getContactName(active.id);
      const stageLabel = getLeadCurrentStageLabel(active.id);
      return `Drag cancelled, ${name} returned to ${stageLabel}`;
    },
  };
}
