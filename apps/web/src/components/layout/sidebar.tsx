'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Icon Components (15px SVG stroke) ───────────────────────────────────────

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function NurtureIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22c4-4 8-7.5 8-12a8 8 0 10-16 0c0 4.5 4 8 8 12z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PipelineIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ContactsIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function DealsIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function ListingsIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ViewingsIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function InsightsIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function SettingsGearIcon({ className }: { className?: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
  );
}

// ─── Navigation Data Structure ───────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey: string | null;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Daily',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon, badgeKey: 'overdue_tasks_count' },
      { href: '/leads', label: 'Lead Inbox', icon: InboxIcon, badgeKey: 'new_leads_count' },
      { href: '/messages', label: 'Messages', icon: MessageIcon, badgeKey: 'unread_messages_count' },
      { href: '/nurture', label: 'Nurture', icon: NurtureIcon, badgeKey: null },
    ],
  },
  {
    label: 'Clients',
    items: [
      { href: '/pipeline', label: 'Pipeline', icon: PipelineIcon, badgeKey: null },
      { href: '/contacts', label: 'Contacts', icon: ContactsIcon, badgeKey: null },
      { href: '/deals', label: 'Deals', icon: DealsIcon, badgeKey: null },
    ],
  },
  {
    label: 'Properties',
    items: [
      { href: '/listings', label: 'Listings', icon: ListingsIcon, badgeKey: null },
      { href: '/viewings', label: 'Viewings', icon: ViewingsIcon, badgeKey: null },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/tools', label: 'Insights', icon: InsightsIcon, badgeKey: null },
    ],
  },
];

// ─── Badge Counts Interface ──────────────────────────────────────────────────

interface BadgeCounts {
  new_leads_count: number;
  unread_messages_count: number;
  overdue_tasks_count: number;
}

// ─── Sidebar Component ───────────────────────────────────────────────────────

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<BadgeCounts | null>(null);

  useEffect(() => {
    fetch('/api/badges')
      .then((res) => res.json())
      .then((data) => setBadges(data))
      .catch(() => {});
  }, []);

  return (
    <aside
      className={cn(
        'w-[232px] bg-onyx border-r border-onyx-line flex flex-col text-white',
        className
      )}
    >
      {/* Logo */}
      <div className="px-[22px] pt-[22px] pb-[18px] flex items-center gap-3">
        <LogoMark />
        <div className="leading-tight">
          <div className="font-display font-bold text-base">AgentOS</div>
          <div className="text-[11px] text-gray-2 mt-0.5">SG · Singapore</div>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn(
              groupIndex > 0 && 'border-t border-onyx-line mt-[2px] pt-[8px]'
            )}
          >
            {/* Section Label */}
            <div className="px-[14px] pb-[6px] pt-[4px] text-[10px] font-bold uppercase tracking-[0.09em] text-gray-1">
              {group.label}
            </div>

            {/* Nav Items */}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              const badgeCount =
                item.badgeKey && badges
                  ? badges[item.badgeKey as keyof BadgeCounts]
                  : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center justify-between px-[14px] py-[10px] rounded-[10px] mb-0.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2',
                    isActive
                      ? 'bg-brand/[0.14] border border-brand/[0.38] text-white'
                      : 'border border-transparent text-gray-2 hover:text-white hover:bg-onyx-card'
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        'flex-shrink-0 transition-opacity duration-150',
                        isActive
                          ? 'opacity-100 text-aqua'
                          : 'opacity-45 group-hover:opacity-75'
                      )}
                    />
                    {item.label}
                  </span>
                  {badgeCount > 0 && (
                    <span
                      className={cn(
                        'rounded-[10px] px-[7px] py-px text-[10px] font-bold',
                        isActive
                          ? 'bg-aqua/20 text-aqua'
                          : 'bg-onyx-raised text-gray-2'
                      )}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-onyx-line">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0" />
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">Agent</div>
            <div className="text-[10px] text-gray-2">CEA R0000000</div>
          </div>
          <Link
            href="/settings"
            className="p-[5px] rounded-[8px] text-gray-2 hover:text-white hover:bg-onyx-card transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
            aria-label="Settings"
          >
            <SettingsGearIcon />
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ─── Logo Mark ───────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width={32} height={32} viewBox="0 0 500 500" fill="none" className="flex-shrink-0">
      <path d="M 250 0 C 200.555 0 152.22 14.662 111.108 42.133 C 69.995 69.603 37.952 108.648 19.03 154.329 C 0.108 200.011 -4.842 250.277 4.804 298.772 C 14.45 347.268 38.26 391.814 73.224 426.777 C 108.187 461.74 152.732 485.55 201.228 495.196 C 249.723 504.842 299.989 499.892 345.671 480.97 C 391.352 462.048 430.397 430.005 457.868 388.892 C 485.338 347.78 500 299.445 500 250 C 500 183.696 473.661 120.107 426.777 73.223 C 379.893 26.339 316.304 0 250 0 Z M 250 469.894 L 214.53 264.225 L 124.501 124.054 L 285.47 234.855 L 250 469.894 Z" fill="white" fillRule="nonzero"/>
    </svg>
  );
}
