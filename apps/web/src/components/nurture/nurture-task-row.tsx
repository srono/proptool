'use client';

import type { EnrichedNurtureTask } from '@/lib/nurture/types';
import {
  classifyUrgency,
  formatSingaporePhone,
  getContactInitials,
  formatRelativeActivity,
} from '@/lib/nurture/urgency';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaskRowProps {
  task: EnrichedNurtureTask;
  density: 'comfortable' | 'compact';
  showLastActivity: boolean;
  onOpenWhatsApp: (task: EnrichedNurtureTask) => void;
  onCall: (task: EnrichedNurtureTask) => void;
  onSnooze: (task: EnrichedNurtureTask) => void;
  onMarkDone: (task: EnrichedNurtureTask) => void;
  onRowClick: (task: EnrichedNurtureTask) => void;
  /** Inline error message displayed below the row when an action fails */
  errorMessage?: string | null;
  /** Whether the row is fading out (after mark done) */
  fadingOut?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const URGENCY_COLORS = {
  overdue: '#EF4444',
  today: '#F59E0B',
  upcoming: '#6B7280',
} as const;

const CONSENT_COLORS = {
  green: '#22C55E',
  yellow: '#F59E0B',
  red: '#EF4444',
} as const;

const CONSENT_LABELS = {
  green: 'Valid consent',
  yellow: 'Partial consent',
  red: 'No consent',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDueDateShort(dueAt: string, urgency: 'overdue' | 'today' | 'upcoming'): string {
  if (urgency === 'today') return 'Today';
  const date = new Date(dueAt);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
}

function getPropertySummary(task: EnrichedNurtureTask): string {
  const type = task.owned_property_type;
  const town = task.owned_property_town;
  if (type && town) return `${type} · ${town}`;
  if (type) return type;
  if (town) return town;
  return '—';
}

function getChannelLabel(channel: EnrichedNurtureTask['channel']): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'call':
      return 'Call';
    case 'email':
      return 'Email';
    case 'note':
      return 'Note';
    default:
      return channel;
  }
}

// ─── Channel Icons ───────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}

function CallIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function ChannelIcon({ channel, className }: { channel: EnrichedNurtureTask['channel']; className?: string }) {
  switch (channel) {
    case 'whatsapp':
      return <WhatsAppIcon className={className} />;
    case 'call':
      return <CallIcon className={className} />;
    case 'email':
      return <EmailIcon className={className} />;
    default:
      return <WhatsAppIcon className={className} />;
  }
}

// ─── Action Button Icons ─────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NurtureTaskRowComponent({ task, density, showLastActivity, onOpenWhatsApp, onCall, onSnooze, onMarkDone, onRowClick, errorMessage, fadingOut }: TaskRowProps) {
  const urgency = classifyUrgency(task.due_at);
  const urgencyColor = URGENCY_COLORS[urgency];
  const initials = getContactInitials(task.contact_name);
  const phone = formatSingaporePhone(task.contact_phone);
  const propertySummary = getPropertySummary(task);
  const lastActivity = formatRelativeActivity(task.last_activity_date);
  const dueDateLabel = formatDueDateShort(task.due_at, urgency);
  const consentColor = CONSENT_COLORS[task.consent_badge];
  const consentLabel = CONSENT_LABELS[task.consent_badge];
  const isConsentBlocked = task.consent_badge === 'red';

  const isComfortable = density === 'comfortable';
  const paddingClass = isComfortable ? 'py-4' : 'py-2';
  const textSizeClass = isComfortable ? 'text-sm' : 'text-[13px]';

  // Primary channel action handler
  const handlePrimaryChannel = () => {
    if (isConsentBlocked) return;
    if (task.channel === 'whatsapp' || task.channel === 'email') {
      onOpenWhatsApp(task);
    } else {
      onCall(task);
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('[data-action-buttons]')) return;
    onRowClick(task);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(task);
    }
  };

  return (
    <div className={`transition-opacity duration-300 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div
        className={`relative flex items-center gap-3 px-4 ${paddingClass} bg-onyx-card border border-onyx-line rounded-[16px] cursor-pointer transition-colors duration-150 hover:bg-onyx-raised/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2`}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        role="row"
        tabIndex={0}
        aria-label={`Task for ${task.contact_name}: ${task.next_action_title}`}
      >
      {/* Urgency Color Bar — 4px vertical strip on left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[16px]"
        style={{ backgroundColor: urgencyColor }}
        aria-hidden="true"
      />

      {/* Contact Avatar — 32px circular badge with initials */}
      <div
        className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-onyx-raised text-xs font-bold text-white"
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Contact Info Column */}
      <div className="min-w-0 flex-1 max-w-[180px]">
        <p
          className={`font-medium text-white truncate ${textSizeClass}`}
          title={task.contact_name}
        >
          {task.contact_name}
        </p>
        <p className="text-xs text-gray-2 truncate" title={phone}>
          {phone}
        </p>
        <p
          className="text-xs text-gray-2 truncate"
          title={propertySummary}
        >
          {propertySummary}
        </p>
      </div>

      {/* Action Details Column */}
      <div className="min-w-0 flex-1 max-w-[220px]">
        <div className="flex items-center gap-1.5 mb-0.5">
          <ChannelIcon channel={task.channel} className="shrink-0 text-gray-2" />
          <span className="text-xs text-gray-2">{getChannelLabel(task.channel)}</span>
        </div>
        <p
          className={`text-white truncate ${textSizeClass}`}
          title={task.next_action_title}
        >
          {task.next_action_title}
        </p>
        {showLastActivity && (
          <p className="text-xs text-gray-2">{lastActivity}</p>
        )}
      </div>

      {/* Due Date Badge */}
      <div className="shrink-0">
        <span
          className="inline-block px-2 py-0.5 rounded-[14px] text-xs font-medium text-white"
          style={{ backgroundColor: urgencyColor }}
        >
          {dueDateLabel}
        </span>
        {task.playbook_name && (
          <p className="text-[10px] text-gray-2 mt-0.5 truncate max-w-[120px]" title={task.playbook_name}>
            {task.playbook_name}
          </p>
        )}
      </div>

      {/* Consent Chip */}
      <div className="shrink-0" title={consentLabel}>
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: consentColor }}
          role="img"
          aria-label={consentLabel}
        />
      </div>

      {/* Action Buttons */}
      <div
        className="shrink-0 flex items-center gap-1"
        data-action-buttons
        onClick={(e) => e.stopPropagation()}
      >
        {/* Primary Channel Button */}
        <button
          type="button"
          onClick={handlePrimaryChannel}
          disabled={isConsentBlocked}
          title={
            isConsentBlocked
              ? 'Consent required'
              : task.channel === 'call'
              ? 'Call'
              : 'WhatsApp'
          }
          aria-label={
            isConsentBlocked
              ? 'Action disabled — consent required'
              : task.channel === 'call'
              ? 'Call contact'
              : 'Open WhatsApp'
          }
          className="p-1.5 rounded-[14px] text-gray-2 hover:text-white hover:bg-onyx transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-2 disabled:hover:bg-transparent"
        >
          <ChannelIcon channel={task.channel} />
        </button>

        {/* Snooze Button */}
        <button
          type="button"
          onClick={() => onSnooze(task)}
          title="Snooze"
          aria-label="Snooze task"
          className="p-1.5 rounded-[14px] text-gray-2 hover:text-white hover:bg-onyx transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
        >
          <ClockIcon />
        </button>

        {/* Mark Done Button */}
        <button
          type="button"
          onClick={() => {
            if (!isConsentBlocked) onMarkDone(task);
          }}
          disabled={isConsentBlocked}
          title={isConsentBlocked ? 'Consent required' : 'Mark done'}
          aria-label={
            isConsentBlocked
              ? 'Mark done disabled — consent required'
              : 'Mark task as done'
          }
          className="p-1.5 rounded-[14px] text-gray-2 hover:text-status-green hover:bg-onyx transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-2 disabled:hover:bg-transparent"
        >
          <CheckIcon />
        </button>
      </div>
      </div>

      {/* Inline error message */}
      {errorMessage && (
        <p className="text-xs text-status-red mt-1 px-4" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
