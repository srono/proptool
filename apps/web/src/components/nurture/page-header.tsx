'use client';

import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

/**
 * PageHeader — renders the nurture page title, subtitle, and navigation buttons.
 *
 * - Title: Figtree 26px bold white
 * - Subtitle: Inter 13px gray-2, directly below title
 * - "Playbooks" ghost button: transparent bg, 1px border, navigates to /nurture/playbooks
 * - "+ New Playbook" primary button: aqua bg, onyx text, navigates to /nurture/playbooks/new
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-display font-bold text-[26px] text-white leading-tight">
          {title}
        </h1>
        <p className="text-[13px] text-gray-2 mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/nurture/playbooks"
          className="rounded-[14px] border border-onyx-line bg-transparent text-white font-medium text-sm px-[18px] py-[10px] transition-colors duration-150 hover:bg-onyx-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
        >
          Playbooks
        </Link>
        <Link
          href="/nurture/playbooks/new"
          className="rounded-[14px] bg-aqua text-onyx font-medium text-sm px-[18px] py-[10px] transition-colors duration-150 hover:bg-aqua/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
        >
          + New Playbook
        </Link>
      </div>
    </div>
  );
}
