'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', badgeKey: 'overdue_tasks_count' },
  { href: '/leads', label: 'Leads', badgeKey: 'new_leads_count' },
  { href: '/pipeline', label: 'Pipeline', badgeKey: null },
  { href: '/listings', label: 'Listings', badgeKey: null },
  { href: '/viewings', label: 'Viewings', badgeKey: null },
  { href: '/messages', label: 'Messages', badgeKey: 'unread_messages_count' },
  { href: '/deals', label: 'Deals', badgeKey: null },
  { href: '/tools', label: 'Insights', badgeKey: null },
  { href: '/settings', label: 'Settings', badgeKey: null },
] as const;

interface BadgeCounts {
  new_leads_count: number;
  unread_messages_count: number;
  overdue_tasks_count: number;
}

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
          <div className="font-display font-bold text-base">PropAgent</div>
          <div className="text-[11px] text-gray-2 mt-0.5">SG · Singapore</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
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
                'flex items-center justify-between px-[14px] py-[10px] rounded-pill mb-0.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-brand/[0.18] border border-brand/50 text-white'
                  : 'border border-transparent text-gray-2 hover:text-white hover:bg-onyx-card'
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'w-1 h-1 rounded-full',
                    isActive ? 'bg-aqua' : 'bg-gray-2'
                  )}
                />
                {item.label}
              </span>
              {badgeCount > 0 && (
                <span
                  className={cn(
                    'rounded-pill px-[7px] py-px text-[10px] font-bold',
                    isActive
                      ? 'bg-aqua text-onyx'
                      : 'bg-onyx-raised text-gray-2'
                  )}
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-onyx-line">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-aqua flex-shrink-0" />
          <div className="leading-tight flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">Agent</div>
            <div className="text-[10px] text-gray-2">CEA R0000000</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LogoMark() {
  return (
    <div className="w-8 h-8 rounded-md bg-brand flex items-center justify-center flex-shrink-0">
      <svg width={19} height={19} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.6" />
        <path
          d="M12 7 L12 12 L15 13.5"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
