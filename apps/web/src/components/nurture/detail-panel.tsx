'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { PlaybookTimeline, type TimelineStep } from './playbook-timeline';
import type { ConsentBadge } from '@/lib/nurture/consent';
import type { TaskChannel } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContactConsentDetails {
  whatsapp_optin: boolean;
  consent_given_at: string | null;
  consent_source: string | null;
  ad_purpose: string | null;
  data_retention_expiry: string | null;
  channel_preference: string;
}

export interface OwnedPropertySummary {
  owned_property_type: string;
  owned_property_label: string | null;
  owned_property_town: string | null;
  owned_property_flat_type: string | null;
  mop_date: string | null;
}

export interface PlaybookTimelineData {
  playbook_id: string;
  playbook_name: string;
  steps: TimelineStep[];
}

export interface DetailPanelContact {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  consent: ContactConsentDetails;
  owned_property: OwnedPropertySummary;
  consent_badge: ConsentBadge;
}

export interface AdHocTaskPayload {
  contact_id: string;
  playbook_id: string;
  channel: TaskChannel;
  due_at: string;
  title: string;
}

export interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  contact: DetailPanelContact;
  playbookTimelines: PlaybookTimelineData[];
  activePlaybooks: { id: string; name: string }[];
  onCreateAdHocTask: (payload: AdHocTaskPayload) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'd MMM yyyy');
  } catch {
    return '—';
  }
}

const BADGE_CONFIG: Record<ConsentBadge, { label: string; emoji: string; className: string }> = {
  green: {
    label: 'Valid consent',
    emoji: '🟢',
    className: 'text-status-green border-status-green/40 bg-status-green/10',
  },
  yellow: {
    label: 'Partial consent',
    emoji: '🟡',
    className: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  },
  red: {
    label: 'No consent',
    emoji: '🔴',
    className: 'text-status-red border-status-red/40 bg-status-red/10',
  },
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  none: 'None',
  hdb: 'HDB',
  private: 'Private',
  landed: 'Landed',
  commercial: 'Commercial',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DetailPanel({
  open,
  onClose,
  contact,
  playbookTimelines,
  activePlaybooks,
  onCreateAdHocTask,
}: DetailPanelProps) {
  const [showAdHocForm, setShowAdHocForm] = useState(false);

  if (!open) return null;

  const badge = BADGE_CONFIG[contact.consent_badge];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="detail-panel-heading">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="relative z-10 w-full max-w-md h-full overflow-y-auto bg-onyx border-l border-onyx-line shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-onyx border-b border-onyx-line px-5 py-4 flex items-center justify-between">
          <h2 id="detail-panel-heading" className="text-base font-display font-bold text-white truncate">
            {contact.full_name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-2 hover:text-white transition-colors p-1 -mr-1"
            aria-label="Close panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Consent Badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>
              <span aria-hidden="true">{badge.emoji}</span>
              {badge.label}
            </span>
          </div>

          {/* Owned Property Summary */}
          <section aria-labelledby="property-summary-heading">
            <h3 id="property-summary-heading" className="text-sm font-display font-bold text-white mb-3">
              Owned Property
            </h3>
            <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-2">Type</dt>
                  <dd className="text-white font-medium">
                    {PROPERTY_TYPE_LABELS[contact.owned_property.owned_property_type] ?? contact.owned_property.owned_property_type}
                  </dd>
                </div>
                {contact.owned_property.owned_property_label && (
                  <div className="flex justify-between">
                    <dt className="text-gray-2">Property</dt>
                    <dd className="text-white font-medium truncate ml-4">
                      {contact.owned_property.owned_property_label}
                    </dd>
                  </div>
                )}
                {contact.owned_property.owned_property_town && (
                  <div className="flex justify-between">
                    <dt className="text-gray-2">Town</dt>
                    <dd className="text-white font-medium">
                      {contact.owned_property.owned_property_town}
                    </dd>
                  </div>
                )}
                {contact.owned_property.owned_property_flat_type && (
                  <div className="flex justify-between">
                    <dt className="text-gray-2">Flat Type</dt>
                    <dd className="text-white font-medium">
                      {contact.owned_property.owned_property_flat_type}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-2">MOP Date</dt>
                  <dd className="text-white font-medium">
                    {formatDate(contact.owned_property.mop_date)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Consent Details */}
          <section aria-labelledby="consent-details-heading">
            <h3 id="consent-details-heading" className="text-sm font-display font-bold text-white mb-3">
              Consent Details
            </h3>
            <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-2">WhatsApp Opt-in</dt>
                  <dd className={`font-medium ${contact.consent.whatsapp_optin ? 'text-status-green' : 'text-status-red'}`}>
                    {contact.consent.whatsapp_optin ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-2">Consent Given</dt>
                  <dd className="text-white font-medium">
                    {formatDate(contact.consent.consent_given_at)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-2">Source</dt>
                  <dd className="text-white font-medium">
                    {contact.consent.consent_source ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-2">Ad Purpose</dt>
                  <dd className="text-white font-medium">
                    {contact.consent.ad_purpose ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-2">Channel Preference</dt>
                  <dd className="text-white font-medium capitalize">
                    {contact.consent.channel_preference}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-2">Data Retention Expiry</dt>
                  <dd className="text-white font-medium">
                    {formatDate(contact.consent.data_retention_expiry)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Playbook Timelines */}
          <section aria-labelledby="timelines-heading">
            <h3 id="timelines-heading" className="text-sm font-display font-bold text-white mb-3">
              Playbook Progress
            </h3>
            {playbookTimelines.length === 0 ? (
              <div className="bg-onyx-card border border-onyx-line rounded-2xl p-6 text-center">
                <p className="text-gray-2 text-sm">Not enrolled in any playbooks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playbookTimelines.map((timeline) => (
                  <PlaybookTimeline
                    key={timeline.playbook_id}
                    playbookName={timeline.playbook_name}
                    steps={timeline.steps}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Create Ad-Hoc Task */}
          <section aria-labelledby="adhoc-task-heading">
            {!showAdHocForm ? (
              <button
                type="button"
                onClick={() => setShowAdHocForm(true)}
                className="w-full btn-primary py-2.5 text-sm font-semibold rounded-lg"
              >
                Create Ad-Hoc Task
              </button>
            ) : (
              <AdHocTaskForm
                contactId={contact.id}
                activePlaybooks={activePlaybooks}
                onSubmit={(payload) => {
                  onCreateAdHocTask(payload);
                  setShowAdHocForm(false);
                }}
                onCancel={() => setShowAdHocForm(false)}
              />
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

// ─── Ad-Hoc Task Form ────────────────────────────────────────────────────────

interface AdHocTaskFormProps {
  contactId: string;
  activePlaybooks: { id: string; name: string }[];
  onSubmit: (payload: AdHocTaskPayload) => void;
  onCancel: () => void;
}

function AdHocTaskForm({ contactId, activePlaybooks, onSubmit, onCancel }: AdHocTaskFormProps) {
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState<TaskChannel>('whatsapp');
  const [dueAt, setDueAt] = useState('');
  const [playbookId, setPlaybookId] = useState(activePlaybooks[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (title.length > 80) {
      setError('Title must be 80 characters or fewer');
      return;
    }
    if (!dueAt) {
      setError('Due date is required');
      return;
    }
    if (dueAt < todayStr) {
      setError('Due date must be today or later');
      return;
    }
    if (!playbookId) {
      setError('Please select a playbook');
      return;
    }

    onSubmit({
      contact_id: contactId,
      playbook_id: playbookId,
      channel,
      due_at: new Date(dueAt).toISOString(),
      title: title.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-onyx-card border border-onyx-line rounded-2xl p-4 space-y-3">
      <h4 id="adhoc-task-heading" className="text-sm font-display font-bold text-white">
        New Ad-Hoc Task
      </h4>

      {/* Title */}
      <div>
        <label htmlFor="adhoc-title" className="block text-xs font-medium text-gray-2 mb-1">
          Title
        </label>
        <input
          id="adhoc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="e.g. Follow up on MOP enquiry"
          className="w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-2/50 focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <p className="text-[10px] text-gray-2 mt-0.5 text-right">{title.length}/80</p>
      </div>

      {/* Channel */}
      <div>
        <label htmlFor="adhoc-channel" className="block text-xs font-medium text-gray-2 mb-1">
          Channel
        </label>
        <select
          id="adhoc-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as TaskChannel)}
          className="w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="call">Call</option>
          <option value="note">Note</option>
        </select>
      </div>

      {/* Due Date */}
      <div>
        <label htmlFor="adhoc-due-date" className="block text-xs font-medium text-gray-2 mb-1">
          Due Date
        </label>
        <input
          id="adhoc-due-date"
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          min={todayStr}
          className="w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Playbook */}
      <div>
        <label htmlFor="adhoc-playbook" className="block text-xs font-medium text-gray-2 mb-1">
          Playbook
        </label>
        <select
          id="adhoc-playbook"
          value={playbookId}
          onChange={(e) => setPlaybookId(e.target.value)}
          className="w-full bg-onyx border border-onyx-line rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
        >
          {activePlaybooks.map((pb) => (
            <option key={pb.id} value={pb.id}>
              {pb.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-status-red" role="alert">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm font-semibold text-gray-2 border border-onyx-line rounded-lg hover:text-white hover:border-white/20 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 btn-primary py-2 text-sm font-semibold rounded-lg"
        >
          Create Task
        </button>
      </div>
    </form>
  );
}
