'use client';

import { useState } from 'react';
import type { EnrichedNurtureTask } from '@/lib/nurture/types';
import {
  classifyUrgency,
  formatSingaporePhone,
  getContactInitials,
} from '@/lib/nurture/urgency';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContactTaskGroupProps {
  contactId: string;
  tasks: EnrichedNurtureTask[];
  onOpenWhatsApp: (task: EnrichedNurtureTask) => void;
  onCall: (task: EnrichedNurtureTask) => void;
  onSnooze: (task: EnrichedNurtureTask) => void;
  onMarkDone: (task: EnrichedNurtureTask) => void;
  onRowClick: (task: EnrichedNurtureTask) => void;
  /** Map of task ID → error message for inline errors */
  taskErrors?: Record<string, string>;
  /** Set of task IDs currently fading out */
  fadingTasks?: Set<string>;
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

function getPropertySummary(task: EnrichedNurtureTask): string {
  const type = task.owned_property_type;
  const town = task.owned_property_town;
  if (type && town) return `${type} · ${town}`;
  if (type) return type;
  if (town) return town;
  return '—';
}

function formatDueDateShort(dueAt: string, urgency: 'overdue' | 'today' | 'upcoming'): string {
  if (urgency === 'today') return 'Today';
  const date = new Date(dueAt);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
}

// ─── Channel Icons ───────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
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
      width="14"
      height="14"
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
      width="14"
      height="14"
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

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
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
      width="14"
      height="14"
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

// ─── Sub-Row Component ───────────────────────────────────────────────────────

interface TaskSubRowProps {
  task: EnrichedNurtureTask;
  onOpenWhatsApp: (task: EnrichedNurtureTask) => void;
  onCall: (task: EnrichedNurtureTask) => void;
  onSnooze: (task: EnrichedNurtureTask) => void;
  onMarkDone: (task: EnrichedNurtureTask) => void;
  errorMessage?: string | null;
  fadingOut?: boolean;
}

function TaskSubRow({ task, onOpenWhatsApp, onCall, onSnooze, onMarkDone, errorMessage, fadingOut }: TaskSubRowProps) {
  const urgency = classifyUrgency(task.due_at);
  const urgencyColor = URGENCY_COLORS[urgency];
  const dueDateLabel = formatDueDateShort(task.due_at, urgency);
  const isConsentBlocked = task.consent_badge === 'red';

  const handlePrimaryChannel = () => {
    if (isConsentBlocked) return;
    if (task.channel === 'whatsapp' || task.channel === 'email') {
      onOpenWhatsApp(task);
    } else {
      onCall(task);
    }
  };

  return (
    <div className={`transition-opacity duration-300 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex items-center gap-3 pl-14 pr-4 py-2 border-t border-onyx-line/50">
        {/* Channel Icon */}
        <ChannelIcon channel={task.channel} className="shrink-0 text-gray-2" />

        {/* Action Title */}
        <p className="min-w-0 flex-1 text-[13px] text-white truncate" title={task.next_action_title}>
          {task.next_action_title}
        </p>

        {/* Due Date Badge */}
        <span
          className="shrink-0 inline-block px-2 py-0.5 rounded-[14px] text-[11px] font-medium text-white"
          style={{ backgroundColor: urgencyColor }}
        >
          {dueDateLabel}
        </span>

        {/* Playbook Name */}
        {task.playbook_name && (
          <span className="shrink-0 text-[11px] text-gray-2 truncate max-w-[100px]" title={task.playbook_name}>
            {task.playbook_name}
          </span>
        )}

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
            title={isConsentBlocked ? 'Consent required' : task.channel === 'call' ? 'Call' : 'WhatsApp'}
            aria-label={isConsentBlocked ? 'Action disabled — consent required' : task.channel === 'call' ? 'Call contact' : 'Open WhatsApp'}
            className="p-1 rounded-[14px] text-gray-2 hover:text-white hover:bg-onyx transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-2 disabled:hover:bg-transparent"
          >
            <ChannelIcon channel={task.channel} />
          </button>

          {/* Snooze Button */}
          <button
            type="button"
            onClick={() => onSnooze(task)}
            title="Snooze"
            aria-label="Snooze task"
            className="p-1 rounded-[14px] text-gray-2 hover:text-white hover:bg-onyx transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            <ClockIcon />
          </button>

          {/* Mark Done Button */}
          <button
            type="button"
            onClick={() => { if (!isConsentBlocked) onMarkDone(task); }}
            disabled={isConsentBlocked}
            title={isConsentBlocked ? 'Consent required' : 'Mark done'}
            aria-label={isConsentBlocked ? 'Mark done disabled — consent required' : 'Mark task as done'}
            className="p-1 rounded-[14px] text-gray-2 hover:text-status-green hover:bg-onyx transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-2 disabled:hover:bg-transparent"
          >
            <CheckIcon />
          </button>
        </div>
      </div>

      {/* Inline error message */}
      {errorMessage && (
        <p className="text-xs text-status-red mt-0.5 pl-14 pr-4" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ─── Contact Header Row ──────────────────────────────────────────────────────

interface ContactHeaderProps {
  task: EnrichedNurtureTask;
  taskCount: number;
  expanded: boolean;
  onToggle: () => void;
  onRowClick: (task: EnrichedNurtureTask) => void;
}

function ContactHeader({ task, taskCount, expanded, onToggle, onRowClick }: ContactHeaderProps) {
  const initials = getContactInitials(task.contact_name);
  const phone = formatSingaporePhone(task.contact_phone);
  const propertySummary = getPropertySummary(task);
  const consentColor = CONSENT_COLORS[task.consent_badge];
  const consentLabel = CONSENT_LABELS[task.consent_badge];

  const handleClick = (e: React.MouseEvent) => {
    // If clicking the chevron area, toggle collapse; otherwise open detail panel
    const target = e.target as HTMLElement;
    if (target.closest('[data-toggle-collapse]')) {
      onToggle();
    } else {
      onRowClick(task);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(task);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 hover:bg-onyx-raised/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="row"
      tabIndex={0}
      aria-label={`Contact: ${task.contact_name}, ${taskCount} task${taskCount !== 1 ? 's' : ''}`}
    >
      {/* Collapse/Expand Chevron */}
      <button
        type="button"
        data-toggle-collapse
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="shrink-0 p-0.5 text-gray-2 hover:text-white transition-transform duration-200"
        aria-label={expanded ? 'Collapse tasks' : 'Expand tasks'}
        aria-expanded={expanded}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? 'rotate-90' : 'rotate-0'}`}
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Contact Avatar */}
      <div
        className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-onyx-raised text-xs font-bold text-white"
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Contact Info */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-white truncate" title={task.contact_name}>
          {task.contact_name}
        </p>
        <p className="text-xs text-gray-2 truncate" title={phone}>
          {phone}
        </p>
        <p className="text-xs text-gray-2 truncate" title={propertySummary}>
          {propertySummary}
        </p>
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

      {/* Task Count Badge */}
      <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[14px] bg-onyx-raised text-[11px] font-medium text-gray-2">
        {taskCount}
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ContactTaskGroup({
  tasks,
  onOpenWhatsApp,
  onCall,
  onSnooze,
  onMarkDone,
  onRowClick,
  taskErrors = {},
  fadingTasks = new Set(),
}: ContactTaskGroupProps) {
  const [expanded, setExpanded] = useState(true);

  if (tasks.length === 0) return null;

  const firstTask = tasks[0];

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-[16px] overflow-hidden">
      {/* Contact Header Row — always shown, toggles collapse */}
      <ContactHeader
        task={firstTask}
        taskCount={tasks.length}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onRowClick={onRowClick}
      />

      {/* Collapsible Sub-Rows */}
      {expanded && (
        <div>
          {tasks.map((task) => (
            <TaskSubRow
              key={task.id}
              task={task}
              onOpenWhatsApp={onOpenWhatsApp}
              onCall={onCall}
              onSnooze={onSnooze}
              onMarkDone={onMarkDone}
              errorMessage={taskErrors[task.id] ?? null}
              fadingOut={fadingTasks.has(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
