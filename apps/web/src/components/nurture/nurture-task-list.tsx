'use client';

import { useMemo } from 'react';
import type { NurtureTaskRow } from '@/lib/nurture/types';
import { NurtureTaskRowComponent } from './nurture-task-row';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NurtureTaskListProps {
  tasks: NurtureTaskRow[];
  onOpenWhatsApp: (task: NurtureTaskRow) => void;
  onCall: (task: NurtureTaskRow) => void;
  onViewContact: (task: NurtureTaskRow) => void;
  onSnooze: (task: NurtureTaskRow) => void;
  onMarkDone: (task: NurtureTaskRow) => void;
  onRowClick?: (task: NurtureTaskRow) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sort tasks by due_at ascending so overdue tasks appear first,
 * followed by today's tasks, then upcoming tasks.
 */
function sortByDueDate(tasks: NurtureTaskRow[]): NurtureTaskRow[] {
  return [...tasks].sort((a, b) => {
    const dateA = new Date(a.due_at).getTime();
    const dateB = new Date(b.due_at).getTime();
    return dateA - dateB;
  });
}

// ─── Column Headers ──────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'contact', label: 'Contact' },
  { key: 'property', label: 'Property' },
  { key: 'segments', label: 'Segments' },
  { key: 'action', label: 'Next Action' },
  { key: 'activity', label: 'Last Activity' },
  { key: 'consent', label: 'Consent' },
  { key: 'actions', label: 'Actions' },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Nurture task list component that displays all active nurture tasks
 * in a table ordered by due_at ascending (overdue first).
 *
 * Columns: contact name, owned property summary, segment tags,
 * next action (title + due date), last activity, consent badge, action buttons.
 *
 * Action buttons: Open WhatsApp, Call, View contact, Snooze, Mark done.
 * WhatsApp and Call buttons are disabled when consent badge is red.
 *
 * Validates: Requirements 6.2, 6.4, 6.9, 6.10
 */
export function NurtureTaskList({
  tasks,
  onOpenWhatsApp,
  onCall,
  onViewContact,
  onSnooze,
  onMarkDone,
  onRowClick,
}: NurtureTaskListProps) {
  const sortedTasks = useMemo(() => sortByDueDate(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
          <svg
            className="w-5 h-5 text-aqua"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-white font-medium text-sm">No nurture tasks</p>
        <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
          Create a playbook and activate it to start generating nurture tasks for your contacts.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left" role="grid" aria-label="Nurture tasks">
          <thead>
            <tr className="border-b border-onyx-line bg-onyx/30">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-[11px] font-medium uppercase tracking-label text-gray-2 ${
                    col.key === 'consent' ? 'text-center' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <NurtureTaskRowComponent
                key={task.id}
                task={task}
                onOpenWhatsApp={onOpenWhatsApp}
                onCall={onCall}
                onViewContact={onViewContact}
                onSnooze={onSnooze}
                onMarkDone={onMarkDone}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
