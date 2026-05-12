'use client';

import { useRouter, usePathname } from 'next/navigation';

interface LeadOption {
  id: string;
  label: string;
  contact_name: string;
}

interface MessagesLeadFilterProps {
  leads: LeadOption[];
  currentLeadId: string | null;
}

export function MessagesLeadFilter({ leads, currentLeadId }: MessagesLeadFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value) {
      router.push(`${pathname}?lead=${value}`);
    } else {
      router.push(pathname);
    }
  }

  return (
    <select
      value={currentLeadId ?? ''}
      onChange={handleChange}
      className="w-full rounded-pill border border-onyx-line bg-onyx-card py-2.5 px-4 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand appearance-none"
    >
      <option value="">All contacts</option>
      {leads.map((lead) => (
        <option key={lead.id} value={lead.id}>
          {lead.contact_name} — {lead.label}
        </option>
      ))}
    </select>
  );
}
