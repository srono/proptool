import { cn } from '@/lib/utils';

export interface Tab {
  label: string;
  value: string;
}

export interface PillTabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillTabs({ tabs, value, onChange, className }: PillTabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 bg-onyx-card border border-onyx-line rounded-pill p-1',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
            tab.value === value
              ? 'bg-brand text-white'
              : 'text-gray-2 hover:text-white'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
