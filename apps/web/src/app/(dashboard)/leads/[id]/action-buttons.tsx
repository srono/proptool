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
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          💬 WhatsApp
        </a>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          📞 Call
        </a>
      )}

      {linkedinSearchUrl && (
        <a
          href={linkedinSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          🔗 LinkedIn
        </a>
      )}

      <Link
        href={`/viewings/new?lead_id=${leadId}`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
      >
        🏠 Book Viewing
      </Link>

      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={() => {
          // TODO: Open add note modal
          alert('Add Note — coming soon');
        }}
      >
        📝 Add Note
      </button>
    </div>
  );
}
