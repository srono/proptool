'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/leads', label: 'Lead Inbox' },
  { href: '/nurture', label: 'Nurture' },
  { href: '/messages', label: 'Chat' },
  { href: '/settings', label: 'More' },
];

export function MobileNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-onyx-line bg-onyx px-[18px] pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <div className="flex items-center justify-around py-3">
        {mobileNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={cn(
                  'px-2.5 py-1 rounded-pill text-[11px] font-semibold transition-colors',
                  isActive ? 'bg-brand text-white' : 'text-gray-2'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
