'use client';

import { useState } from 'react';
import { ActionButtons } from './action-buttons';
import { Timeline } from './timeline';
import type { TimelineItem } from './note-utils';

interface LeadClientSectionProps {
  leadId: string;
  contactId: string;
  phone?: string;
  contactName?: string;
  linkedinUrl?: string | null;
  timelineItems: TimelineItem[];
}

export function LeadClientSection({
  leadId,
  contactId,
  phone,
  contactName,
  linkedinUrl,
  timelineItems: initialItems,
}: LeadClientSectionProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(initialItems);

  const handleNoteSaved = (note: TimelineItem) => {
    setTimelineItems((prev) => [note, ...prev]);
  };

  return (
    <>
      {/* Action buttons — span full grid width */}
      <div className="lg:col-span-3">
        <ActionButtons
          phone={phone}
          contactName={contactName}
          leadId={leadId}
          contactId={contactId}
          linkedinUrl={linkedinUrl}
          onNoteSaved={handleNoteSaved}
        />
      </div>

      {/* Timeline — spans 2 columns in the parent grid */}
      <div className="lg:col-span-2 space-y-4">
        <Timeline items={timelineItems} />
      </div>
    </>
  );
}
