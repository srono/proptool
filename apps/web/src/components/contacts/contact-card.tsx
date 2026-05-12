import Link from 'next/link';
import type { ContactListItem, ContactStatus } from './contacts-types';
import { formatLastActivity } from './utils';

const STATUS_COLORS: Record<ContactStatus, string> = {
  active: 'text-status-green border-status-green/40 bg-status-green/10',
  inactive: 'text-gray-2 border-onyx-line bg-transparent',
  archived: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  do_not_contact: 'text-status-red border-status-red/40 bg-status-red/10',
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
  do_not_contact: 'Do Not Contact',
};

interface ContactCardProps {
  contact: ContactListItem;
}

export function ContactCard({ contact }: ContactCardProps) {
  const statusColor =
    STATUS_COLORS[contact.contact_status] ?? 'text-gray-2 border-onyx-line bg-transparent';
  const statusLabel = STATUS_LABELS[contact.contact_status] ?? contact.contact_status;
  const lastActivity = formatLastActivity(contact.last_contacted_at, contact.last_inbound_at);

  return (
    <Link
      href={`/contacts/${contact.id}`}
      aria-label={contact.full_name}
      className="block bg-onyx-card border border-onyx-line rounded-2xl p-4 hover:border-brand/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{contact.full_name}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-gray-2 mt-0.5 truncate">{contact.phone}</p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <span className="text-[11px] text-gray-2">{lastActivity}</span>
        </div>
      </div>
    </Link>
  );
}
