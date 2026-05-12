'use client';

import { format, isPast, isToday } from 'date-fns';
import type { NurtureTaskRow } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NurtureTaskRowProps {
  task: NurtureTaskRow;
  onOpenWhatsApp: (task: NurtureTaskRow) => void;
  onCall: (task: NurtureTaskRow) => void;
  onViewContact: (task: NurtureTaskRow) => void;
  onSnooze: (task: NurtureTaskRow) => void;
  onMarkDone: (task: NurtureTaskRow) => void;
  onRowClick?: (task: NurtureTaskRow) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONSENT_BADGE_MAP: Record<NurtureTaskRow['consent_badge'], { emoji: string; label: string }> = {
  green: { emoji: '🟢', label: 'Valid consent' },
  yellow: { emoji: '🟡', label: 'Partial consent' },
  red: { emoji: '🔴', label: 'No consent' },
};

function formatDueDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMM yyyy');
  } catch {
    return '—';
  }
}

function getDueDateStatus(dateStr: string): 'overdue' | 'today' | 'upcoming' {
  const date = new Date(dateStr);
  if (isToday(date)) return 'today';
  if (isPast(date)) return 'overdue';
  return 'upcoming';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NurtureTaskRowComponent({
  task,
  onOpenWhatsApp,
  onCall,
  onViewContact,
  onSnooze,
  onMarkDone,
  onRowClick,
}: NurtureTaskRowProps) {
  const consentBadge = CONSENT_BADGE_MAP[task.consent_badge];
  const isConsentBlocked = task.consent_badge === 'red';
  const dueDateStatus = getDueDateStatus(task.due_at);

  return (
    <tr
      className="border-b border-onyx-line hover:bg-onyx/50 transition-colors cursor-pointer"
      onClick={() => onRowClick?.(task)}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick?.(task);
        }
      }}
    >
      {/* Contact Name */}
      <td className="px-3 py-3">
        <p className="text-sm font-medium text-white truncate max-w-[160px]">
          {task.contact_name}
        </p>
      </td>

      {/* Owned Property Summary */}
      <td className="px-3 py-3">
        <p className="text-xs text-gray-2 truncate max-w-[180px]">
          {task.owned_property_summary || '—'}
        </p>
      </td>

      {/* Segment Tags */}
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {task.segment_tags.length > 0 ? (
            task.segment_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-aqua border border-brand/30"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-2">—</span>
          )}
          {task.segment_tags.length > 3 && (
            <span className="text-[10px] text-gray-2">
              +{task.segment_tags.length - 3}
            </span>
          )}
        </div>
      </td>

      {/* Next Action (title + due date) */}
      <td className="px-3 py-3">
        <p className="text-sm text-white truncate max-w-[180px]">
          {task.next_action_title}
        </p>
        <p
          className={`text-[11px] mt-0.5 ${
            dueDateStatus === 'overdue'
              ? 'text-status-red'
              : dueDateStatus === 'today'
              ? 'text-status-yellow'
              : 'text-gray-2'
          }`}
        >
          {dueDateStatus === 'overdue' && 'Overdue · '}
          {dueDateStatus === 'today' && 'Today · '}
          {formatDueDate(task.due_at)}
        </p>
      </td>

      {/* Last Activity */}
      <td className="px-3 py-3">
        <p className="text-xs text-gray-2">
          {formatLastActivity(task.last_activity_date)}
        </p>
      </td>

      {/* Consent Badge */}
      <td className="px-3 py-3 text-center">
        <span
          title={consentBadge.label}
          aria-label={consentBadge.label}
          role="img"
        >
          {consentBadge.emoji}
        </span>
      </td>

      {/* Action Buttons */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Open WhatsApp */}
          <button
            type="button"
            onClick={() => onOpenWhatsApp(task)}
            disabled={isConsentBlocked}
            title={isConsentBlocked ? 'Consent required for WhatsApp' : 'Open WhatsApp'}
            aria-label={isConsentBlocked ? 'WhatsApp disabled — consent required' : 'Open WhatsApp'}
            className="p-1.5 rounded-lg text-gray-2 hover:text-white hover:bg-onyx transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-2 disabled:hover:bg-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
              <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
            </svg>
          </button>

          {/* Call */}
          <button
            type="button"
            onClick={() => onCall(task)}
            disabled={isConsentBlocked}
            title={isConsentBlocked ? 'Consent required for calling' : 'Call'}
            aria-label={isConsentBlocked ? 'Call disabled — consent required' : 'Call contact'}
            className="p-1.5 rounded-lg text-gray-2 hover:text-white hover:bg-onyx transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-2 disabled:hover:bg-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>

          {/* View Contact */}
          <button
            type="button"
            onClick={() => onViewContact(task)}
            title="View contact"
            aria-label="View contact"
            className="p-1.5 rounded-lg text-gray-2 hover:text-white hover:bg-onyx transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {/* Snooze */}
          <button
            type="button"
            onClick={() => onSnooze(task)}
            title="Snooze"
            aria-label="Snooze task"
            className="p-1.5 rounded-lg text-gray-2 hover:text-white hover:bg-onyx transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          {/* Mark Done */}
          <button
            type="button"
            onClick={() => onMarkDone(task)}
            title="Mark done"
            aria-label="Mark task as done"
            className="p-1.5 rounded-lg text-gray-2 hover:text-green-400 hover:bg-onyx transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
