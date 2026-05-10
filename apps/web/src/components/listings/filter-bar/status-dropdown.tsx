'use client';

import type { ListingStatus } from '@agentos/shared';

interface StatusDropdownProps {
  value: ListingStatus | null;
  onChange: (status: ListingStatus | null) => void;
}

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'live', label: 'Live' },
  { value: 'under_offer', label: 'Under Offer' },
  { value: 'sold', label: 'Sold' },
  { value: 'rented', label: 'Rented' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as ListingStatus))}
      className="bg-onyx-raised border border-onyx-line rounded-xl px-4 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
      aria-label="Filter by status"
    >
      <option value="">All Statuses</option>
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
