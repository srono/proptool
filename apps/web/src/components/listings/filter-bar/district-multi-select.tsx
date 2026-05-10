'use client';

import { useState, useRef, useEffect } from 'react';
import { SINGAPORE_DISTRICTS } from '@agentos/shared';

interface DistrictMultiSelectProps {
  selected: string[];
  onChange: (districts: string[]) => void;
}

export function DistrictMultiSelect({ selected, onChange }: DistrictMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  function handleToggle(code: string) {
    if (selected.includes(code)) {
      onChange(selected.filter((d) => d !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  const label = selected.length > 0 ? `District (${selected.length})` : 'District';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-onyx-line bg-onyx-card px-3 py-1.5 text-sm text-gray-2 hover:text-white hover:border-white/30 transition-colors"
      >
        <span>{label}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 max-h-64 overflow-y-auto rounded-lg border border-onyx-line bg-onyx-card shadow-lg">
          {SINGAPORE_DISTRICTS.map((d) => (
            <label
              key={d.code}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-2 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(d.code)}
                onChange={() => handleToggle(d.code)}
                className="h-3.5 w-3.5 rounded border-onyx-line bg-onyx text-aqua focus:ring-aqua/50 focus:ring-offset-0"
              />
              <span className="truncate">
                {d.code} – {d.name}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
