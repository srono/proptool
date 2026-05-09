'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', badgeKey: 'overdue_tasks_count' },
  { href: '/leads', label: 'Leads', icon: '📥', badgeKey: 'new_leads_count' },
  { href: '/pipeline', label: 'Pipeline', icon: '🔄', badgeKey: null },
  { href: '/listings', label: 'Listings', icon: '🏠', badgeKey: null },
  { href: '/viewings', label: 'Viewings', icon: '📅', badgeKey: null },
  { href: '/messages', label: 'Messages', icon: '💬', badgeKey: 'unread_messages_count' },
  { href: '/deals', label: 'Deals', icon: '🤝', badgeKey: null },
  { href: '/tools', label: 'Tools', icon: '🧮', badgeKey: null },
  { href: '/settings', label: 'Settings', icon: '⚙️', badgeKey: null },
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
    <aside className={cn('w-64 border-r border-gray-200 bg-white flex flex-col', className)}>
      <div className="p-6">
        <h1 className="text-lg font-bold text-brand-700">PropAgent</h1>
        <p className="text-xs text-gray-400 mt-0.5">Singapore</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const badgeCount = item.badgeKey && badges ? badges[item.badgeKey as keyof BadgeCounts] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <SignOutButton />
      </div>
    </aside>
  );
}

function SignOutButton() {
  return (
    <a
      href="/auth/signout"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 w-full transition-colors"
    >
      <span className="text-base">🚪</span>
      Sign Out
    </a>
  );
}
