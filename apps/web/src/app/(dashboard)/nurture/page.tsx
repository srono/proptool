'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useNurtureFilters } from '@/hooks/use-nurture-filters';
import {
  computeStatsCounts,
  filterTasks,
  groupTasksByUrgency,
  groupTasksByContact,
  formatSingaporePhone,
} from '@/lib/nurture/urgency';
import type { EnrichedNurtureTask } from '@/lib/nurture/types';

import { PageHeader } from '@/components/nurture/page-header';
import { StatsStrip, type UrgencyFilter } from '@/components/nurture/stats-strip';
import { FilterBar, type PlaybookOption } from '@/components/nurture/filter-bar';
import { TaskGroup } from '@/components/nurture/task-group';
import { ContactTaskGroup } from '@/components/nurture/contact-task-group';
import { DetailPanel } from '@/components/nurture/detail-panel';
import { SnoozeDialog } from '@/components/nurture/snooze-dialog';
import { ConsentWarningDialog } from '@/components/nurture/consent-warning-dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskListResponse {
  tasks: EnrichedNurtureTask[];
  total: number;
  page: number;
}

type PendingAction = {
  type: 'whatsapp' | 'call' | 'markDone';
  task: EnrichedNurtureTask;
};

// ─── Urgency Group Display Config ────────────────────────────────────────────

const URGENCY_GROUP_ORDER = ['overdue', 'today', 'upcoming'] as const;
const URGENCY_GROUP_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Due Today',
  upcoming: 'Upcoming',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Main Nurture Page — composes all nurture components into a unified dashboard.
 *
 * Data flow:
 * 1. Fetch tasks from API
 * 2. Compute urgency counts via computeStatsCounts
 * 3. Apply filters via filterTasks
 * 4. Group filtered tasks via groupTasksByUrgency or groupTasksByPlaybook
 * 5. Render grouped tasks in TaskGroup sections with TaskRow components
 *
 * Validates: Requirements 1.1, 2.1, 3.1, 4.1, 4.6, 7.5, 12.1–12.8
 */
export default function NurturePage() {
  const router = useRouter();

  // ─── Hooks ─────────────────────────────────────────────────────────────────

  const {
    activePill,
    playbookFilter,
    consentFilter,
    myTasksOnly,
    setActivePill,
    setPlaybookFilter,
    setConsentFilter,
    setMyTasksOnly,
  } = useNurtureFilters();

  // ─── State ─────────────────────────────────────────────────────────────────

  const [tasks, setTasks] = useState<EnrichedNurtureTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbooks, setPlaybooks] = useState<PlaybookOption[]>([]);
  const [selectedTask, setSelectedTask] = useState<EnrichedNurtureTask | null>(null);

  // Action state
  const [snoozeTaskId, setSnoozeTaskId] = useState<string | null>(null);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [fadingTasks, setFadingTasks] = useState<Set<string>>(new Set());

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/nurture/tasks?limit=100');
      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data: TaskListResponse = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaybooks = useCallback(async () => {
    try {
      const res = await fetch('/api/nurture/playbooks?limit=50');
      if (!res.ok) return;
      const data = await res.json();
      setPlaybooks(
        (data.playbooks ?? []).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        }))
      );
    } catch {
      // Silently fail — playbook dropdown shows only "All Playbooks"
    }
  }, []);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ─── Derived Data ──────────────────────────────────────────────────────────

  // Compute urgency counts from all tasks (before filtering)
  const statsCounts = computeStatsCounts(tasks);

  // Build filter state object for the filterTasks utility
  const filterState = {
    activePill,
    playbookFilter,
    consentFilter,
    myTasksOnly,
  };

  // Apply filters
  const filteredTasks = filterTasks(tasks, filterState);

  // Group filtered tasks by urgency (default grouping)
  const groupedTasks = groupTasksByUrgency(filteredTasks);

  // Ordered group keys for rendering
  const groupKeys = URGENCY_GROUP_ORDER.filter((key) => key in groupedTasks);

  // ─── StatsStrip ↔ FilterBar Wiring ─────────────────────────────────────────

  const handleStatsFilterChange = useCallback(
    (filter: UrgencyFilter | null) => {
      if (filter === null) {
        setActivePill('all');
      } else {
        setActivePill(filter);
      }
    },
    [setActivePill]
  );

  const activeStatsFilter: UrgencyFilter | null =
    activePill === 'overdue' || activePill === 'today' || activePill === 'upcoming'
      ? activePill
      : null;

  // ─── Helper: Clear error for a task ────────────────────────────────────────

  const clearTaskError = useCallback((taskId: string) => {
    setTaskErrors((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  // ─── Helper: Execute action (after consent check passes) ───────────────────

  const executeWhatsApp = useCallback(
    (task: EnrichedNurtureTask) => {
      clearTaskError(task.id);
      router.push(`/messages/${task.contact_id}?nurture_task=${task.id}`);
    },
    [router, clearTaskError]
  );

  const executeCall = useCallback(
    (task: EnrichedNurtureTask) => {
      clearTaskError(task.id);
      if (task.contact_phone) {
        // Format the phone number, then strip spaces for the tel: link
        const formatted = formatSingaporePhone(task.contact_phone);
        // If formatting returned a dash, fall back to raw phone
        const telNumber =
          formatted === '–'
            ? task.contact_phone.replace(/\s/g, '')
            : formatted.replace(/\s/g, '');
        window.location.href = `tel:${telNumber}`;
      }
    },
    [clearTaskError]
  );

  const executeMarkDone = useCallback(
    async (task: EnrichedNurtureTask) => {
      clearTaskError(task.id);

      try {
        const res = await fetch(`/api/nurture/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setTaskErrors((prev) => ({
            ...prev,
            [task.id]: data?.error ?? 'Failed to mark task as done. Please try again.',
          }));
          return;
        }

        // Fade-out transition: set fading state, then remove after 300ms
        setFadingTasks((prev) => new Set(prev).add(task.id));
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          setFadingTasks((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        }, 300);
      } catch {
        setTaskErrors((prev) => ({
          ...prev,
          [task.id]: 'Network error. Could not mark task as done.',
        }));
      }
    },
    [clearTaskError]
  );

  // ─── Consent-Aware Action Dispatchers ──────────────────────────────────────

  const handleOpenWhatsApp = useCallback(
    (task: EnrichedNurtureTask) => {
      if (task.consent_badge === 'red') return;

      if (task.consent_badge === 'yellow') {
        setPendingAction({ type: 'whatsapp', task });
        setConsentDialogOpen(true);
        return;
      }

      executeWhatsApp(task);
    },
    [executeWhatsApp]
  );

  const handleCall = useCallback(
    (task: EnrichedNurtureTask) => {
      if (task.consent_badge === 'red') return;

      if (task.consent_badge === 'yellow') {
        setPendingAction({ type: 'call', task });
        setConsentDialogOpen(true);
        return;
      }

      executeCall(task);
    },
    [executeCall]
  );

  const handleSnooze = useCallback((task: EnrichedNurtureTask) => {
    setSnoozeTaskId(task.id);
    setSnoozeDialogOpen(true);
  }, []);

  const handleMarkDone = useCallback(
    (task: EnrichedNurtureTask) => {
      if (task.consent_badge === 'red') return;

      if (task.consent_badge === 'yellow') {
        setPendingAction({ type: 'markDone', task });
        setConsentDialogOpen(true);
        return;
      }

      executeMarkDone(task);
    },
    [executeMarkDone]
  );

  // ─── Consent Dialog Handlers ───────────────────────────────────────────────

  const handleConsentConfirm = useCallback(() => {
    setConsentDialogOpen(false);
    if (!pendingAction) return;

    const { type, task } = pendingAction;
    setPendingAction(null);

    switch (type) {
      case 'whatsapp':
        executeWhatsApp(task);
        break;
      case 'call':
        executeCall(task);
        break;
      case 'markDone':
        executeMarkDone(task);
        break;
    }
  }, [pendingAction, executeWhatsApp, executeCall, executeMarkDone]);

  const handleConsentCancel = useCallback(() => {
    setConsentDialogOpen(false);
    setPendingAction(null);
  }, []);

  // ─── Snooze Dialog Handlers ────────────────────────────────────────────────

  const handleSnoozeConfirm = useCallback(() => {
    // Optimistic update: remove the snoozed task from the list
    if (snoozeTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === snoozeTaskId ? { ...t, status: 'snoozed' as const } : t
        )
      );
    }
    setSnoozeDialogOpen(false);
    setSnoozeTaskId(null);
  }, [snoozeTaskId]);

  // ─── TaskRow Handlers ──────────────────────────────────────────────────────

  const handleRowClick = useCallback((task: EnrichedNurtureTask) => {
    setSelectedTask(task);
  }, []);

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedTask(null);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Nurture"
        subtitle="Manage outreach tasks across your active playbooks"
      />

      {/* Stats Strip */}
      <StatsStrip
        overdueCount={statsCounts.overdue}
        todayCount={statsCounts.today}
        upcomingCount={statsCounts.upcoming}
        activeFilter={activeStatsFilter}
        onFilterChange={handleStatsFilterChange}
      />

      {/* Filter Bar */}
      <FilterBar
        activePill={activePill}
        onPillChange={setActivePill}
        playbookFilter={playbookFilter}
        onPlaybookFilterChange={setPlaybookFilter}
        consentFilter={consentFilter}
        onConsentFilterChange={setConsentFilter}
        myTasksOnly={myTasksOnly}
        onMyTasksToggle={setMyTasksOnly}
        taskCount={filteredTasks.length}
        playbooks={playbooks}
      />

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <p className="text-gray-2 text-sm mt-3">Loading tasks…</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-status-red text-sm">{error}</p>
          <button
            onClick={fetchTasks}
            className="mt-3 text-xs text-aqua hover:underline transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 rounded-[14px] px-3 py-1"
          >
            Retry
          </button>
        </div>
      ) : filteredTasks.length === 0 && activePill === 'all' && !playbookFilter && !consentFilter && !myTasksOnly ? (
        /* Empty state — no tasks and no filters applied */
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
          <p className="text-white font-medium text-sm">No nurture tasks yet</p>
          <p className="text-gray-2 text-xs mt-1 max-w-sm mx-auto">
            Create a playbook with outreach steps and activate it. Tasks will appear
            once contacts are enrolled.
          </p>
          <a
            href="/nurture/playbooks/new"
            className="inline-flex items-center mt-4 rounded-[14px] bg-aqua text-onyx font-medium text-xs px-[18px] py-[10px] hover:opacity-90 transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            + Create Playbook
          </a>
        </div>
      ) : filteredTasks.length === 0 ? (
        /* Filtered empty state */
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-white font-medium text-sm">No tasks match your filters</p>
          <p className="text-gray-2 text-xs mt-1">
            Try adjusting your filter criteria.
          </p>
        </div>
      ) : (
        /* Grouped Task List */
        <div className="space-y-4">
          {groupKeys.map((groupKey) => {
            const groupTasks = groupedTasks[groupKey];
            const groupTitle =
              URGENCY_GROUP_LABELS[groupKey] ?? groupKey;

            return (
              <TaskGroup
                key={groupKey}
                title={groupTitle}
                count={groupTasks.length}
              >
                <div className="space-y-2">
                  {Array.from(groupTasksByContact(groupTasks)).map(([contactId, contactTasks]) => (
                    <ContactTaskGroup
                      key={contactId}
                      contactId={contactId}
                      tasks={contactTasks}
                      onOpenWhatsApp={handleOpenWhatsApp}
                      onCall={handleCall}
                      onSnooze={handleSnooze}
                      onMarkDone={handleMarkDone}
                      onRowClick={handleRowClick}
                      taskErrors={taskErrors}
                      fadingTasks={fadingTasks}
                    />
                  ))}
                </div>
              </TaskGroup>
            );
          })}
        </div>
      )}

      {/* Detail Panel — slides in on row click */}
      <DetailPanel
        task={selectedTask}
        onClose={handleCloseDetailPanel}
      />

      {/* Snooze Dialog */}
      <SnoozeDialog
        taskId={snoozeTaskId ?? ''}
        open={snoozeDialogOpen}
        onOpenChange={setSnoozeDialogOpen}
        onConfirm={handleSnoozeConfirm}
      />

      {/* Consent Warning Dialog */}
      <ConsentWarningDialog
        open={consentDialogOpen}
        consentGapReason="This contact has partial consent. Proceed?"
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
      />
    </div>
  );
}
