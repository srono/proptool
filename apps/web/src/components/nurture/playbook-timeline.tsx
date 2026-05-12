'use client';

import { format } from 'date-fns';
import type { TaskStatus } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimelineStep {
  id: string;
  title: string;
  channel: 'whatsapp' | 'email' | 'call' | 'task_only';
  offset_days: number;
  status: TaskStatus | 'future';
  completed_at?: string | null;
  due_at?: string | null;
}

export interface PlaybookTimelineProps {
  playbookName: string;
  steps: TimelineStep[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<TimelineStep['channel'], string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Call',
  task_only: 'Task',
};

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), 'd MMM yyyy');
  } catch {
    return null;
  }
}

function getStepState(step: TimelineStep): 'completed' | 'pending' | 'future' {
  if (step.status === 'done' || step.status === 'skipped') return 'completed';
  if (step.status === 'pending' || step.status === 'snoozed') return 'pending';
  return 'future';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlaybookTimeline({ playbookName, steps }: PlaybookTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="bg-onyx-card border border-onyx-line rounded-2xl p-6 text-center">
        <p className="text-gray-2 text-sm">No steps in this playbook</p>
      </div>
    );
  }

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-onyx-line">
        <h3 className="text-sm font-display font-bold text-white">{playbookName}</h3>
      </div>

      <div className="px-5 py-4">
        <ol className="relative" aria-label={`Timeline for ${playbookName}`}>
          {steps.map((step, index) => {
            const state = getStepState(step);
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className="relative pb-6 last:pb-0">
                {/* Vertical connector line */}
                {!isLast && (
                  <span
                    className={`absolute left-[7px] top-4 w-0.5 h-[calc(100%-8px)] ${
                      state === 'completed'
                        ? 'bg-status-green/40'
                        : 'bg-onyx-line'
                    }`}
                    aria-hidden="true"
                  />
                )}

                <div className="flex items-start gap-3">
                  {/* Step indicator dot */}
                  <span
                    className={`relative z-10 flex-shrink-0 mt-0.5 w-[15px] h-[15px] rounded-full border-2 ${
                      state === 'completed'
                        ? 'bg-status-green border-status-green'
                        : state === 'pending'
                        ? 'bg-brand/20 border-brand ring-2 ring-brand/30'
                        : 'bg-onyx-card border-onyx-line'
                    }`}
                    aria-hidden="true"
                  >
                    {state === 'completed' && (
                      <svg
                        className="w-full h-full text-white p-[1px]"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 8.5L6.5 11L12 5.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {state === 'pending' && (
                      <span className="absolute inset-[3px] rounded-full bg-brand" />
                    )}
                  </span>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[13px] font-medium ${
                          state === 'completed'
                            ? 'text-gray-2'
                            : state === 'pending'
                            ? 'text-white'
                            : 'text-gray-2/60'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-label px-1.5 py-0.5 rounded font-display font-semibold ${
                          state === 'completed'
                            ? 'text-status-green/80 bg-status-green/10'
                            : state === 'pending'
                            ? 'text-brand bg-brand/10'
                            : 'text-gray-2/50 bg-gray-2/5'
                        }`}
                      >
                        {CHANNEL_LABELS[step.channel]}
                      </span>
                    </div>

                    {/* Date info */}
                    <p
                      className={`text-[11px] mt-0.5 ${
                        state === 'pending' ? 'text-gray-2' : 'text-gray-2/60'
                      }`}
                    >
                      {state === 'completed' && step.status === 'skipped' && (
                        <>Skipped{step.completed_at ? ` ${formatDate(step.completed_at)}` : ''}</>
                      )}
                      {state === 'completed' && step.status !== 'skipped' && step.completed_at && (
                        <>Completed {formatDate(step.completed_at)}</>
                      )}
                      {state === 'pending' && step.due_at && (
                        <>
                          Due {formatDate(step.due_at)}
                          {step.status === 'snoozed' && (
                            <span className="ml-1 text-status-amber">(snoozed)</span>
                          )}
                        </>
                      )}
                      {state === 'future' && step.due_at && (
                        <>Scheduled {formatDate(step.due_at)}</>
                      )}
                      {state === 'future' && !step.due_at && (
                        <>Day {step.offset_days > 0 ? '+' : ''}{step.offset_days}</>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
