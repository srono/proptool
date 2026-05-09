'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/leads', label: 'Leads', icon: '📥' },
  { href: '/pipeline', label: 'Pipeline', icon: '🔄' },
  { href: '/messages', label: 'Chat', icon: '💬' },
  { href: '/settings', label: 'More', icon: '⚙️' },
];

export function MobileNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-2 pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center py-2 px-3 text-xs',
                isActive ? 'text-brand-600' : 'text-gray-500'
              )}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
