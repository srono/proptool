'use client';

import type { PropertyType } from '@propagent/shared';

interface PropertyTypeDropdownProps {
  value: PropertyType | null;
  onChange: (type: PropertyType | null) => void;
}

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'hdb', label: 'HDB' },
  { value: 'condo', label: 'Condo' },
  { value: 'landed', label: 'Landed' },
  { value: 'commercial', label: 'Commercial' },
];

export function PropertyTypeDropdown({ value, onChange }: PropertyTypeDropdownProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : (e.target.value as PropertyType))}
      className="bg-onyx-raised border border-onyx-line rounded-xl px-4 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand appearance-none cursor-pointer"
      aria-label="Filter by property type"
    >
      <option value="">All Types</option>
      {PROPERTY_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
