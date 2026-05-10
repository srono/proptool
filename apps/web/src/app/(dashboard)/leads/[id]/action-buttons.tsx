'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NoteDialog } from './note-dialog';
import { TimelineItem } from './note-utils';

interface Props {
  phone?: string;
  contactName?: string;
  leadId: string;
  contactId: string;
  linkedinUrl?: string | null;
  onNoteSaved?: (note: TimelineItem) => void;
}

export function ActionButtons({ phone, contactName, leadId, contactId, linkedinUrl, onNoteSaved }: Props) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  const whatsappUrl = phone
    ? `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(`Hi ${contactName ?? ''}, `)}`
    : null;

  const linkedinSearchUrl = linkedinUrl
    ?? (contactName
      ? `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(contactName)}`
      : null);

  return (
    <div className="flex flex-wrap gap-2">
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-9 px-4 rounded-pill bg-aqua text-onyx text-xs font-medium hover:opacity-90 transition-opacity"
        >
          WhatsApp
        </a>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center justify-center h-9 px-4 rounded-pill bg-brand text-white text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Call
        </a>
      )}

      {linkedinSearchUrl && (
        <a
          href={linkedinSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-9 px-4 rounded-pill border border-onyx-line bg-transparent text-white text-xs font-medium hover:bg-onyx-card transition-colors"
        >
          LinkedIn
        </a>
      )}

      <Link
        href={`/viewings/new?lead_id=${leadId}`}
        className="inline-flex items-center justify-center h-9 px-4 rounded-pill border border-onyx-line bg-transparent text-white text-xs font-medium hover:bg-onyx-card transition-colors"
      >
        Book viewing
      </Link>

      <button
        type="button"
        className="inline-flex items-center justify-center h-9 px-4 rounded-pill border border-onyx-line bg-transparent text-white text-xs font-medium hover:bg-onyx-card transition-colors"
        onClick={() => setNoteDialogOpen(true)}
      >
        Add note
      </button>

      <NoteDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        leadId={leadId}
        contactId={contactId}
        onSaved={(note) => {
          onNoteSaved?.(note);
        }}
      />
    </div>
  );
}
