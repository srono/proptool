'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NurtureTaskList } from '@/components/nurture/nurture-task-list';
import { DetailPanel, type DetailPanelContact, type PlaybookTimelineData, type AdHocTaskPayload } from '@/components/nurture/detail-panel';
import { ConsentWarningDialog } from '@/components/nurture/consent-warning-dialog';
import type { NurtureTaskRow } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlaybookOption {
  id: string;
  name: string;
}

interface TaskListResponse {
  tasks: NurtureTaskRow[];
  total: number;
  page: number;
}

type ConsentFilter = '' | 'green' | 'yellow' | 'red';
type StatusFilter = '' | 'pending' | 'snoozed';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Main Nurture View page — displays all nurture tasks with filter controls.
 *
 * Filters: playbook, status (pending/snoozed), assigned agent, consent status.
 * Integrates the NurtureTaskList component for rendering task rows.
 * Shows an empty state explaining how to create a playbook when no tasks exist.
 * Opens detail panel on contact row click.
 * Shows consent warning dialog before executing tasks with yellow/red badges.
 *
 * Validates: Requirements 6.1, 6.11, 6.12, 10.5
 */
export default function NurturePage() {
  const router = useRouter();

  // ─── State ───────────────────────────────────────────────────────────────

  const [tasks, setTasks] = useState<NurtureTaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [playbookFilter, setPlaybookFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [consentFilter, setConsentFilter] = useState<ConsentFilter>('');

  // Playbook options for filter dropdown
  const [playbooks, setPlaybooks] = useState<PlaybookOption[]>([]);

  // Detail panel state
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<DetailPanelContact | null>(null);
  const [playbookTimelines, setPlaybookTimelines] = useState<PlaybookTimelineData[]>([]);

  // Consent warning dialog state
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentGapReason, setConsentGapReason] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (playbookFilter) params.set('playbook_id', playbookFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (assignedFilter) params.set('assigned_to', assignedFilter);
      if (consentFilter) params.set('consent_status', consentFilter);

      const res = await fetch(`/api/nurture/tasks?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data: TaskListResponse = await res.json();
      setTasks(data.tasks);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [playbookFilter, statusFilter, assignedFilter, consentFilter]);

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
      // Silently fail — filter will just be empty
    }
  }, []);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ─── Detail Panel ──────────────────────────────────────────────────────────

  const fetchContactDetails = useCallback(async (task: NurtureTaskRow) => {
    try {
      // Fetch contact details and playbook timelines for the detail panel
      const [contactRes, timelinesRes] = await Promise.all([
        fetch(`/api/nurture/tasks/${task.id}/prepare`),
        fetch(`/api/nurture/tasks?contact_id=${task.contact_id}&include_timelines=true`),
      ]);

      // Build contact details from available task data
      const contactData: DetailPanelContact = {
        id: task.contact_id,
        full_name: task.contact_name,
        phone: null,
        email: null,
        consent: {
          whatsapp_optin: task.consent_badge !== 'red',
          consent_given_at: null,
          consent_source: null,
          ad_purpose: null,
          data_retention_expiry: null,
          channel_preference: task.consent_badge === 'red' ? 'none' : 'whatsapp',
        },
        owned_property: {
          owned_property_type: 'none',
          owned_property_label: task.owned_property_summary || null,
          owned_property_town: null,
          owned_property_flat_type: null,
          mop_date: null,
        },
        consent_badge: task.consent_badge,
      };

      // Enrich with prepare API data if available
      if (contactRes.ok) {
        const prepareData = await contactRes.json();
        if (prepareData.contact_phone) {
          contactData.phone = prepareData.contact_phone;
        }
        if (prepareData.consent_status) {
          contactData.consent_badge = prepareData.consent_status;
        }
      }

      // Build timelines from tasks response
      let timelines: PlaybookTimelineData[] = [];
      if (timelinesRes.ok) {
        const timelinesData = await timelinesRes.json();
        if (timelinesData.timelines) {
          timelines = timelinesData.timelines;
        }
      }

      setSelectedContact(contactData);
      setPlaybookTimelines(timelines);
      setDetailPanelOpen(true);
    } catch {
      // Fallback: open panel with basic task data
      const contactData: DetailPanelContact = {
        id: task.contact_id,
        full_name: task.contact_name,
        phone: null,
        email: null,
        consent: {
          whatsapp_optin: task.consent_badge !== 'red',
          consent_given_at: null,
          consent_source: null,
          ad_purpose: null,
          data_retention_expiry: null,
          channel_preference: task.consent_badge === 'red' ? 'none' : 'whatsapp',
        },
        owned_property: {
          owned_property_type: 'none',
          owned_property_label: task.owned_property_summary || null,
          owned_property_town: null,
          owned_property_flat_type: null,
          mop_date: null,
        },
        consent_badge: task.consent_badge,
      };
      setSelectedContact(contactData);
      setPlaybookTimelines([]);
      setDetailPanelOpen(true);
    }
  }, []);

  const handleRowClick = useCallback(
    (task: NurtureTaskRow) => {
      fetchContactDetails(task);
    },
    [fetchContactDetails]
  );

  const handleCloseDetailPanel = useCallback(() => {
    setDetailPanelOpen(false);
    setSelectedContact(null);
    setPlaybookTimelines([]);
  }, []);

  const handleCreateAdHocTask = useCallback(
    async (payload: AdHocTaskPayload) => {
      try {
        const res = await fetch('/api/nurture/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await fetchTasks();
          handleCloseDetailPanel();
        }
      } catch {
        // Error handling — could show toast
      }
    },
    [fetchTasks, handleCloseDetailPanel]
  );

  // ─── Consent Warning ──────────────────────────────────────────────────────

  /**
   * Wraps an action with a consent check. If the task has a yellow or red
   * consent badge, shows the consent warning dialog before proceeding.
   * Red badges block WhatsApp/Call actions entirely (handled by disabled buttons),
   * but yellow badges show a warning that requires explicit confirmation.
   */
  const withConsentCheck = useCallback(
    (task: NurtureTaskRow, action: () => void) => {
      if (task.consent_badge === 'yellow') {
        setConsentGapReason(
          `This contact's consent may not cover the intended purpose of this outreach. ` +
          `The contact has WhatsApp opt-in but the ad purpose does not match the playbook's target purpose. ` +
          `Proceeding may not comply with PDPA requirements.`
        );
        setPendingAction(() => action);
        setConsentDialogOpen(true);
      } else if (task.consent_badge === 'red') {
        setConsentGapReason(
          `This contact does not have valid consent for this outreach channel. ` +
          `The contact may have withdrawn consent, opted out of WhatsApp, or their data retention has expired. ` +
          `You should not proceed with this action.`
        );
        setPendingAction(() => action);
        setConsentDialogOpen(true);
      } else {
        // Green badge — proceed directly
        action();
      }
    },
    []
  );

  const handleConsentConfirm = useCallback(() => {
    setConsentDialogOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const handleConsentCancel = useCallback(() => {
    setConsentDialogOpen(false);
    setPendingAction(null);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenWhatsApp = useCallback(
    (task: NurtureTaskRow) => {
      withConsentCheck(task, () => {
        router.push(`/messages/${task.contact_id}?nurture_task=${task.id}`);
      });
    },
    [router, withConsentCheck]
  );

  const handleCall = useCallback(
    (task: NurtureTaskRow) => {
      withConsentCheck(task, () => {
        // Deep-link to device dialer — handled via tel: protocol
        window.location.href = `tel:${task.contact_id}`;
      });
    },
    [withConsentCheck]
  );

  const handleViewContact = useCallback(
    (task: NurtureTaskRow) => {
      router.push(`/leads/${task.contact_id}`);
    },
    [router]
  );

  const handleSnooze = useCallback(
    async (task: NurtureTaskRow) => {
      // The snooze dialog is handled by the task row component
      await fetchTasks();
    },
    [fetchTasks]
  );

  const handleMarkDone = useCallback(
    async (task: NurtureTaskRow) => {
      const doMarkDone = async () => {
        try {
          const res = await fetch(`/api/nurture/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'done' }),
          });
          if (res.ok) {
            await fetchTasks();
          }
        } catch {
          // Error handling — could show toast
        }
      };

      withConsentCheck(task, doMarkDone);
    },
    [fetchTasks, withConsentCheck]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            Nurture
          </h1>
          <p className="text-[13px] text-gray-2 mt-1">
            Manage your nurture outreach tasks
          </p>
        </div>
        <Link href="/nurture/playbooks" className="btn-primary text-xs">
          Playbooks
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Playbook filter */}
        <select
          value={playbookFilter}
          onChange={(e) => setPlaybookFilter(e.target.value)}
          className="bg-onyx-card border border-onyx-line rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand/50"
          aria-label="Filter by playbook"
        >
          <option value="">All Playbooks</option>
          {playbooks.map((pb) => (
            <option key={pb.id} value={pb.id}>
              {pb.name}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-onyx-card border border-onyx-line rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand/50"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="snoozed">Snoozed</option>
        </select>

        {/* Assigned agent filter */}
        <input
          type="text"
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          placeholder="Assigned agent ID"
          className="bg-onyx-card border border-onyx-line rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-gray-2 focus:outline-none focus:border-brand/50 w-44"
          aria-label="Filter by assigned agent"
        />

        {/* Consent status filter */}
        <select
          value={consentFilter}
          onChange={(e) => setConsentFilter(e.target.value as ConsentFilter)}
          className="bg-onyx-card border border-onyx-line rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand/50"
          aria-label="Filter by consent status"
        >
          <option value="">All Consent</option>
          <option value="green">🟢 Valid</option>
          <option value="yellow">🟡 Partial</option>
          <option value="red">🔴 No Consent</option>
        </select>

        {total > 0 && (
          <span className="self-center text-xs text-gray-2 ml-auto">
            {total} task{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
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
            className="mt-3 text-xs text-aqua hover:underline"
          >
            Retry
          </button>
        </div>
      ) : tasks.length === 0 && !playbookFilter && !statusFilter && !assignedFilter && !consentFilter ? (
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
            Create a playbook with outreach steps and activate it. The system will
            automatically generate nurture tasks for contacts matching your segment.
          </p>
          <Link
            href="/nurture/playbooks/new"
            className="inline-flex items-center mt-4 btn-primary text-xs"
          >
            + Create Playbook
          </Link>
        </div>
      ) : tasks.length === 0 ? (
        /* No results for current filters */
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-white font-medium text-sm">No tasks match your filters</p>
          <p className="text-gray-2 text-xs mt-1">
            Try adjusting your filter criteria.
          </p>
        </div>
      ) : (
        <NurtureTaskList
          tasks={tasks}
          onOpenWhatsApp={handleOpenWhatsApp}
          onCall={handleCall}
          onViewContact={handleViewContact}
          onSnooze={handleSnooze}
          onMarkDone={handleMarkDone}
          onRowClick={handleRowClick}
        />
      )}

      {/* Detail Panel */}
      {selectedContact && (
        <DetailPanel
          open={detailPanelOpen}
          onClose={handleCloseDetailPanel}
          contact={selectedContact}
          playbookTimelines={playbookTimelines}
          activePlaybooks={playbooks}
          onCreateAdHocTask={handleCreateAdHocTask}
        />
      )}

      {/* Consent Warning Dialog */}
      <ConsentWarningDialog
        open={consentDialogOpen}
        consentGapReason={consentGapReason}
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
      />
    </div>
  );
}
