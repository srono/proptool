'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaskGroupProps {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskGroup({
  title,
  count,
  defaultExpanded = true,
  children,
}: TaskGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Hidden entirely when count is 0
  if (count === 0) return null;

  return (
    <section className="rounded-[16px] border border-onyx-line bg-onyx-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors duration-150 hover:bg-onyx-raised/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
      >
        {/* Chevron indicator */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-gray-2 shrink-0 transition-transform duration-200 ${
            expanded ? 'rotate-90' : 'rotate-0'
          }`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>

        {/* Group name (bold) + count in parentheses */}
        <span className="font-display text-sm font-bold text-white">
          {title}
        </span>
        <span className="text-sm text-gray-2">({count})</span>
      </button>

      {/* Collapsible content with smooth transition */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          expanded
            ? 'max-h-[5000px] opacity-100'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-4 pb-3">{children}</div>
      </div>
    </section>
  );
}
