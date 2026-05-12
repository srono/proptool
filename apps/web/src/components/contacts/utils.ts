import { normalizePhone } from '@/lib/services/contact-service';
import type { ContactListItem, ContactStatus } from './contacts-types';

/**
 * Returns the more recent of the two timestamps as a Date, or null if both are null.
 */
export function getLastActivityDate(
  lastContactedAt: string | null,
  lastInboundAt: string | null
): Date | null {
  if (!lastContactedAt && !lastInboundAt) {
    return null;
  }

  if (!lastContactedAt) {
    return new Date(lastInboundAt!);
  }

  if (!lastInboundAt) {
    return new Date(lastContactedAt);
  }

  const contacted = new Date(lastContactedAt);
  const inbound = new Date(lastInboundAt);

  return contacted >= inbound ? contacted : inbound;
}

/**
 * Returns a formatted date string ("d Mon YYYY") for the most recent activity,
 * or "—" if both timestamps are null.
 */
export function formatLastActivity(
  lastContactedAt: string | null,
  lastInboundAt: string | null
): string {
  const date = getLastActivityDate(lastContactedAt, lastInboundAt);

  if (!date) {
    return '—';
  }

  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Filters contacts by case-insensitive partial match on full_name
 * or normalized phone digits.
 */
export function filterBySearch(
  contacts: ContactListItem[],
  term: string
): ContactListItem[] {
  if (!term.trim()) {
    return contacts;
  }

  const lowerTerm = term.toLowerCase();
  const digitTerm = term.replace(/\D/g, '');

  return contacts.filter((contact) => {
    // Match on full_name (case-insensitive)
    if (contact.full_name.toLowerCase().includes(lowerTerm)) {
      return true;
    }

    // Match on normalized phone digits
    if (digitTerm) {
      const normalizedDigits = normalizePhone(contact.phone).replace(/\D/g, '');
      if (normalizedDigits.includes(digitTerm)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Filters contacts by exact match on contact_status.
 * Pass-through (returns all) when status is "all".
 */
export function filterByStatus(
  contacts: ContactListItem[],
  status: ContactStatus | 'all'
): ContactListItem[] {
  if (status === 'all') {
    return contacts;
  }

  return contacts.filter((contact) => contact.contact_status === status);
}

/**
 * Combines search and status filters, then caps the result at 50 contacts.
 */
export function filterContacts(
  contacts: ContactListItem[],
  searchTerm: string,
  statusFilter: ContactStatus | 'all'
): ContactListItem[] {
  const searched = filterBySearch(contacts, searchTerm);
  const filtered = filterByStatus(searched, statusFilter);

  return filtered.slice(0, 50);
}
