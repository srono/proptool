import { LEAD_SOURCES } from '@propagent/shared';

const DEAL_TYPE_LABELS: Record<string, string> = {
  sale: 'Sale',
  resale: 'Resale',
  rental: 'Rental',
  landlord_rep: 'Landlord Rep',
  tenant_rep: 'Tenant Rep',
};

/**
 * Returns "Today" for 0 days elapsed, "{n}d ago" otherwise, "—" for null.
 */
export function formatRelativeActivity(dateStr: string | null): string {
  if (dateStr === null) return '—';

  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  return `${days}d ago`;
}

/**
 * Returns DD MMM YYYY format (e.g., "15 Jan 2024").
 */
export function formatCreatedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Maps source key to LEAD_SOURCES display label.
 * Returns the key itself if no matching label is found.
 */
export function formatSourceLabel(source: string): string {
  const found = LEAD_SOURCES.find((s) => s.key === source);
  return found ? found.label : source;
}

/**
 * Maps deal_type key to display label.
 * Returns the key itself if no matching label is found.
 */
export function formatDealTypeLabel(dealType: string): string {
  return DEAL_TYPE_LABELS[dealType] ?? dealType;
}
