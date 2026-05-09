'use client';

import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search address or postal code...' }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-onyx-card border border-onyx-line rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
