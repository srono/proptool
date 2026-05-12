import { Bell } from 'lucide-react';

export interface SellerUpdateReminderProps {
  pendingCount: number;
}

/**
 * Badge indicator showing the count of completed viewings pending seller update.
 * Only renders content when pendingCount > 0.
 *
 * Validates: Requirements 6.4, 6.5
 */
export function SellerUpdateReminder({ pendingCount }: SellerUpdateReminderProps) {
  if (pendingCount <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-status-amber/10 border border-status-amber/20 px-3 py-2">
      <div className="relative flex-shrink-0">
        <Bell className="w-4 h-4 text-status-amber" />
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-status-amber text-[10px] font-bold text-onyx">
          {pendingCount}
        </span>
      </div>
      <p className="text-xs text-gray-2">
        <span className="font-medium text-status-amber">{pendingCount}</span>{' '}
        {pendingCount === 1 ? 'viewing' : 'viewings'} pending seller update
      </p>
    </div>
  );
}
