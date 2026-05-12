'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TemplateForm, type TemplateFormData } from '@/components/nurture/template-form';
import { TemplatePreview } from '@/components/nurture/template-preview';
import type { ResolveContext } from '@/lib/nurture/template-resolver';

// ─── Sample Context ──────────────────────────────────────────────────────────

/** Sample contact data used for the live preview */
const SAMPLE_CONTEXT: ResolveContext = {
  contact: {
    full_name: 'John Tan',
    owned_property_label: 'Blk 123 Ang Mo Kio Ave 4 #08-123',
    owned_property_town: 'Ang Mo Kio',
    mop_date: '2025-06-15',
  },
  agent: { full_name: 'Sarah Lee' },
  trigger_field: '2025-06-15',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Create/edit template page with TemplateForm and TemplatePreview side by side.
 * When an `edit` query param is present, loads the existing template for editing.
 *
 * Validates: Requirements 13.1, 13.6, 13.7
 */
export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [saving, setSaving] = useState(false);
  const [liveBody, setLiveBody] = useState('');
  const [initialData, setInitialData] = useState<Partial<TemplateFormData> | undefined>(undefined);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [warning, setWarning] = useState<string | null>(null);

  // ─── Load Existing Template for Edit ─────────────────────────────────

  useEffect(() => {
    if (!editId) return;

    async function loadTemplate() {
      try {
        const res = await fetch(`/api/nurture/templates/${editId}`);
        if (!res.ok) {
          router.push('/nurture/templates');
          return;
        }
        const data = await res.json();
        const template = data.template;
        setInitialData({
          name: template.name,
          channel: template.channel,
          body: template.body,
        });
        setLiveBody(template.body);
      } catch {
        router.push('/nurture/templates');
      } finally {
        setLoadingEdit(false);
      }
    }
    loadTemplate();
  }, [editId, router]);

  // ─── Submit Handler ────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (data: TemplateFormData) => {
      setSaving(true);
      setWarning(null);

      try {
        const url = editId
          ? `/api/nurture/templates/${editId}`
          : '/api/nurture/templates';
        const method = editId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.invalid_placeholders) {
            alert(
              `Unsupported placeholders: ${errorData.invalid_placeholders.map((p: string) => `{{${p}}}`).join(', ')}`
            );
          } else {
            alert(errorData.error ?? 'Failed to save template');
          }
          return;
        }

        const responseData = await res.json();

        // Show warning if template is referenced by active playbook steps (Req 13.7)
        if (responseData.warning) {
          setWarning(responseData.warning);
        }

        router.push('/nurture/templates');
      } catch {
        alert('Failed to save template');
      } finally {
        setSaving(false);
      }
    },
    [editId, router]
  );

  // ─── Cancel Handler ────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    router.push('/nurture/templates');
  }, [router]);

  // ─── Track Live Body for Preview ───────────────────────────────────────

  // We intercept the form's body changes via a MutationObserver-like approach.
  // Since TemplateForm manages its own state, we use a polling approach on the
  // textarea value. A simpler approach: wrap the form with an onChange callback.
  // For now, we use a custom hook that observes the textarea.
  useEffect(() => {
    const interval = setInterval(() => {
      const textarea = document.getElementById('template-body') as HTMLTextAreaElement | null;
      if (textarea && textarea.value !== liveBody) {
        setLiveBody(textarea.value);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [liveBody]);

  // ─── Render ────────────────────────────────────────────────────────────

  if (loadingEdit) {
    return (
      <div className="p-4 lg:p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-onyx-card rounded w-48" />
          <div className="h-4 bg-onyx-card rounded w-64" />
          <div className="h-64 bg-onyx-card rounded-2xl mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Header */}
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
          {editId ? 'Edit Template' : 'New Template'}
        </h1>
        <p className="text-[13px] text-gray-2">
          {editId
            ? 'Update your message template'
            : 'Create a reusable message template with placeholders'}
        </p>
      </div>

      {/* Warning banner for active references (Req 13.7) */}
      {warning && (
        <div
          className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"
          role="alert"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400 mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs text-amber-300">{warning}</p>
        </div>
      )}

      {/* Form + Preview side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div>
          <TemplateForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            saving={saving}
          />
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-white mb-1.5">Live Preview</h2>
            <p className="text-[11px] text-gray-2">
              See how your template looks with sample contact data
            </p>
          </div>

          {liveBody.trim() ? (
            <TemplatePreview body={liveBody} context={SAMPLE_CONTEXT} />
          ) : (
            <div className="bg-onyx-card border border-onyx-line rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-2">
                Start typing in the message body to see a live preview
              </p>
            </div>
          )}

          {/* Sample data legend */}
          <div className="bg-onyx-card border border-onyx-line rounded-lg p-3">
            <p className="text-[11px] font-medium text-gray-2 uppercase tracking-label mb-2">
              Sample Data
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <dt className="text-gray-2">Contact Name</dt>
              <dd className="text-white">{SAMPLE_CONTEXT.contact.full_name}</dd>
              <dt className="text-gray-2">Property Label</dt>
              <dd className="text-white truncate">{SAMPLE_CONTEXT.contact.owned_property_label}</dd>
              <dt className="text-gray-2">Property Town</dt>
              <dd className="text-white">{SAMPLE_CONTEXT.contact.owned_property_town}</dd>
              <dt className="text-gray-2">MOP Date</dt>
              <dd className="text-white">{SAMPLE_CONTEXT.contact.mop_date}</dd>
              <dt className="text-gray-2">Agent Name</dt>
              <dd className="text-white">{SAMPLE_CONTEXT.agent.full_name}</dd>
              <dt className="text-gray-2">Trigger Date</dt>
              <dd className="text-white">{SAMPLE_CONTEXT.trigger_field}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
