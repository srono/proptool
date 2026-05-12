'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { EnrichedNurtureTask, PlaybookStepStatus } from '@/lib/nurture/types';
import { getContactInitials, formatSingaporePhone } from '@/lib/nurture/urgency';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DetailPanelProps {
  task: EnrichedNurtureTask | null;
  onClose: () => void;
  onCreateAdHocTask?: () => void;
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

const CONSENT_CHIP_CONFIG: Record<string, { label: string; className: string }> = {
  green: {
    label: 'Valid consent',
    className: 'text-status-green border-status-green/40 bg-status-green/10',
  },
  yellow: {
    label: 'Partial consent',
    className: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  },
  red: {
    label: 'No consent',
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

export function DetailPanel({ task, onClose, onCreateAdHocTask }: DetailPanelProps) {
  const router = useRouter();
  const isOpen = task !== null;
  const isRedConsent = task?.consent_badge === 'red';

  // Handle backdrop click
  function handleBackdropClick() {
    onClose();
  }

  // Quick action handlers
  function handleWhatsApp() {
    if (!task || isRedConsent) return;
    router.push(`/messages/${task.contact_id}?nurture_task=${task.id}`);
  }

  function handleCall() {
    if (!task || isRedConsent) return;
    const formatted = formatSingaporePhone(task.contact_phone);
    if (formatted !== '–') {
      window.location.href = `tel:${formatted.replace(/\s/g, '')}`;
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          aria-hidden="true"
          onClick={handleBackdropClick}
        />
      )}

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[380px] bg-onyx-card border-l border-onyx-line shadow-xl overflow-y-auto transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-heading"
        aria-hidden={!isOpen}
      >
        {task && (
          <>
            {/* ─── Contact Header ─────────────────────────────────────── */}
            <div className="sticky top-0 z-20 bg-onyx-card border-b border-onyx-line px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {getContactInitials(task.contact_name)}
                    </span>
                  </div>
                  {/* Name + Consent Chip */}
                  <div className="min-w-0">
                    <h2
                      id="detail-panel-heading"
                      className="text-base font-display font-bold text-white truncate"
                    >
                      {task.contact_name}
                    </h2>
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-[14px] border mt-1 ${
                        CONSENT_CHIP_CONFIG[task.consent_badge]?.className ?? ''
                      }`}
                    >
                      {CONSENT_CHIP_CONFIG[task.consent_badge]?.label ?? ''}
                    </span>
                  </div>
                </div>
                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 text-gray-2 hover:text-white transition-colors duration-150 p-1 -mr-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
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
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* ─── Quick Actions ─────────────────────────────────────── */}
              <section aria-labelledby="quick-actions-heading">
                <h3
                  id="quick-actions-heading"
                  className="text-sm font-display font-bold text-white mb-3"
                >
                  Quick Actions
                </h3>
                <div className="flex gap-3">
                  {/* WhatsApp button */}
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    disabled={isRedConsent}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
                      isRedConsent
                        ? 'bg-status-green/5 text-status-green/40 cursor-not-allowed opacity-40'
                        : 'bg-status-green/10 text-status-green border border-status-green/30 hover:bg-status-green/20'
                    }`}
                    aria-label="Send WhatsApp message"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </button>
                  {/* Call button */}
                  <button
                    type="button"
                    onClick={handleCall}
                    disabled={isRedConsent}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
                      isRedConsent
                        ? 'bg-brand/5 text-brand/40 cursor-not-allowed opacity-40'
                        : 'bg-brand/10 text-brand border border-brand/30 hover:bg-brand/20'
                    }`}
                    aria-label="Call contact"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Call
                  </button>
                </div>
              </section>

              {/* ─── Divider ──────────────────────────────────────────── */}
              <div className="border-t border-onyx-line" />

              {/* ─── Contact Info ──────────────────────────────────────── */}
              <section aria-labelledby="contact-info-heading">
                <h3
                  id="contact-info-heading"
                  className="text-sm font-display font-bold text-white mb-3"
                >
                  Contact Info
                </h3>
                <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-2">Phone</dt>
                      <dd className="text-white font-medium">
                        {formatSingaporePhone(task.contact_phone)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-2">Email</dt>
                      <dd className="text-white font-medium">
                        {(task as EnrichedNurtureTaskWithEmail).email ?? '–'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              {/* ─── Divider ──────────────────────────────────────────── */}
              <div className="border-t border-onyx-line" />

              {/* ─── Owned Property (hidden if no data) ────────────────── */}
              {hasOwnedPropertyData(task) && (
                <section aria-labelledby="owned-property-heading">
                  <h3
                    id="owned-property-heading"
                    className="text-sm font-display font-bold text-white mb-3"
                  >
                    Owned Property
                  </h3>
                  <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-2">Type</dt>
                        <dd className="text-white font-medium">
                          {PROPERTY_TYPE_LABELS[task.owned_property_type] ?? task.owned_property_type}
                        </dd>
                      </div>
                      {task.owned_property_label && (
                        <div className="flex justify-between">
                          <dt className="text-gray-2">Label</dt>
                          <dd className="text-white font-medium truncate ml-4">
                            {task.owned_property_label}
                          </dd>
                        </div>
                      )}
                      {task.owned_property_town && (
                        <div className="flex justify-between">
                          <dt className="text-gray-2">Town</dt>
                          <dd className="text-white font-medium">
                            {task.owned_property_town}
                          </dd>
                        </div>
                      )}
                      {task.owned_property_flat_type && (
                        <div className="flex justify-between">
                          <dt className="text-gray-2">Flat Type</dt>
                          <dd className="text-white font-medium">
                            {task.owned_property_flat_type}
                          </dd>
                        </div>
                      )}
                      {task.mop_date && (
                        <div className="flex justify-between">
                          <dt className="text-gray-2">MOP Date</dt>
                          <dd className="text-white font-medium">
                            {formatDate(task.mop_date)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </section>
              )}

              {/* ─── Divider (only if property section shown) ─────────── */}
              {hasOwnedPropertyData(task) && (
                <div className="border-t border-onyx-line" />
              )}

              {/* ─── Consent ──────────────────────────────────────────── */}
              <section aria-labelledby="consent-heading">
                <h3
                  id="consent-heading"
                  className="text-sm font-display font-bold text-white mb-3"
                >
                  Consent
                </h3>
                <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-2">WhatsApp Opt-in</dt>
                      <dd
                        className={`font-medium ${
                          task.consent_badge !== 'red'
                            ? 'text-status-green'
                            : 'text-status-red'
                        }`}
                      >
                        {task.consent_badge !== 'red' ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-2">Consent Given</dt>
                      <dd className="text-white font-medium">
                        {formatDate((task as EnrichedNurtureTaskWithConsent).consent_given_at)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-2">Source</dt>
                      <dd className="text-white font-medium">
                        {(task as EnrichedNurtureTaskWithConsent).consent_source ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-2">Ad Purpose</dt>
                      <dd className="text-white font-medium">
                        {(task as EnrichedNurtureTaskWithConsent).ad_purpose ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-2">Data Retention Expiry</dt>
                      <dd className="text-white font-medium">
                        {formatDate((task as EnrichedNurtureTaskWithConsent).data_retention_expiry)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              {/* ─── Divider ──────────────────────────────────────────── */}
              <div className="border-t border-onyx-line" />

              {/* ─── Playbook Progress ─────────────────────────────────── */}
              {task.playbook_steps && task.playbook_steps.length > 0 ? (
                <section aria-labelledby="playbook-progress-heading">
                  <h3
                    id="playbook-progress-heading"
                    className="text-sm font-display font-bold text-white mb-3"
                  >
                    Playbook Progress
                  </h3>
                  <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
                    <PlaybookProgressTimeline steps={task.playbook_steps} />
                  </div>
                </section>
              ) : (
                <section aria-labelledby="playbook-progress-heading">
                  <h3
                    id="playbook-progress-heading"
                    className="text-sm font-display font-bold text-white mb-3"
                  >
                    Playbook Progress
                  </h3>
                  <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4 text-center">
                    <p className="text-gray-2 text-sm">No active playbook</p>
                  </div>
                </section>
              )}

              {/* ─── Create Ad-Hoc Task Button ─────────────────────────── */}
              <button
                type="button"
                onClick={onCreateAdHocTask}
                className="w-full py-2.5 text-sm font-semibold rounded-[14px] bg-aqua text-onyx hover:bg-aqua/90 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
              >
                + Create Ad-Hoc Task
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// ─── Playbook Progress Timeline ──────────────────────────────────────────────

interface PlaybookProgressTimelineProps {
  steps: PlaybookStepStatus[];
}

function PlaybookProgressTimeline({ steps }: PlaybookProgressTimelineProps) {
  const sortedSteps = [...steps].sort((a, b) => a.step_number - b.step_number);

  return (
    <ol className="relative" aria-label="Playbook progress timeline">
      {sortedSteps.map((step, index) => {
        const isLast = index === sortedSteps.length - 1;

        return (
          <li key={step.step_number} className="relative pb-5 last:pb-0">
            {/* Vertical connector line */}
            {!isLast && (
              <span
                className={`absolute left-[7px] top-4 w-0.5 h-[calc(100%-8px)] ${
                  step.status === 'done'
                    ? 'bg-status-green/40'
                    : 'bg-onyx-line'
                }`}
                aria-hidden="true"
              />
            )}

            <div className="flex items-start gap-3">
              {/* Step indicator */}
              <span
                className={`relative z-10 flex-shrink-0 mt-0.5 w-[15px] h-[15px] rounded-full border-2 ${
                  step.status === 'done'
                    ? 'bg-status-green border-status-green'
                    : step.status === 'pending'
                    ? 'bg-brand/20 border-brand ring-2 ring-brand/30'
                    : 'bg-onyx-card border-onyx-line opacity-50'
                }`}
                aria-hidden="true"
              >
                {step.status === 'done' && (
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
                {step.status === 'pending' && (
                  <span className="absolute inset-[3px] rounded-full bg-brand" />
                )}
              </span>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-[13px] font-medium ${
                    step.status === 'done'
                      ? 'text-gray-2'
                      : step.status === 'pending'
                      ? 'text-white'
                      : 'text-gray-2/50'
                  }`}
                >
                  {step.title}
                </span>
                {step.status === 'done' && (
                  <p className="text-[11px] text-gray-2/60 mt-0.5">Completed</p>
                )}
                {step.status === 'pending' && (
                  <p className="text-[11px] text-brand mt-0.5">In progress</p>
                )}
                {step.status === 'upcoming' && (
                  <p className="text-[11px] text-gray-2/40 mt-0.5">Upcoming</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Determines if the task has any owned property data worth displaying.
 * Returns false if property type is "none" and all other fields are null/empty.
 */
function hasOwnedPropertyData(task: EnrichedNurtureTask): boolean {
  if (
    task.owned_property_type === 'none' &&
    !task.owned_property_label &&
    !task.owned_property_town &&
    !task.owned_property_flat_type &&
    !task.mop_date
  ) {
    return false;
  }
  return true;
}

// ─── Extended type for consent fields not yet in EnrichedNurtureTask ─────────
// These fields may be added to the type in a future task; for now we cast safely.

interface EnrichedNurtureTaskWithEmail extends EnrichedNurtureTask {
  email?: string | null;
}

interface EnrichedNurtureTaskWithConsent extends EnrichedNurtureTask {
  consent_given_at?: string | null;
  consent_source?: string | null;
  ad_purpose?: string | null;
  data_retention_expiry?: string | null;
}

// ─── Backward-compatible type exports ────────────────────────────────────────
// These are exported for backward compatibility with the existing nurture page
// (task 8.1 will remove these when the page is rewritten).

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
  steps: Array<{
    id: string;
    title: string;
    channel: 'whatsapp' | 'email' | 'call' | 'task_only';
    offset_days: number;
    status: string;
    completed_at?: string | null;
    due_at?: string | null;
  }>;
}

export interface DetailPanelContact {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  consent: ContactConsentDetails;
  owned_property: OwnedPropertySummary;
  consent_badge: 'green' | 'yellow' | 'red';
}

export interface AdHocTaskPayload {
  contact_id: string;
  playbook_id: string;
  channel: string;
  due_at: string;
  title: string;
}
