'use client';

import Link from 'next/link';

interface Props {
  phone?: string;
  contactName?: string;
  leadId: string;
  linkedinUrl?: string | null;
}

export function ActionButtons({ phone, contactName, leadId, linkedinUrl }: Props) {
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
          className="btn-primary text-xs py-2 px-3"
        >
          WhatsApp
        </a>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center rounded-pill bg-brand px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
        >
          Call
        </a>
      )}

      {linkedinSearchUrl && (
        <a
          href={linkedinSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost text-xs py-2 px-3"
        >
          LinkedIn
        </a>
      )}

      <Link
        href={`/viewings/new?lead_id=${leadId}`}
        className="btn-ghost text-xs py-2 px-3"
      >
        Book viewing
      </Link>

      <button
        type="button"
        className="btn-ghost text-xs py-2 px-3"
        onClick={() => alert('Add Note — coming soon')}
      >
        Add note
      </button>
    </div>
  );
}
