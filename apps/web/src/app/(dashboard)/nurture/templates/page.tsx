'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TemplateChannel } from '@/lib/nurture/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MessageTemplate {
  id: string;
  name: string;
  channel: TemplateChannel;
  body: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
};

const CHANNEL_COLORS: Record<TemplateChannel, string> = {
  whatsapp: 'text-status-green border-status-green/40 bg-status-green/10',
  email: 'text-aqua border-brand/50 bg-brand/[0.12]',
};

function truncateBody(body: string, maxLength = 80): string {
  if (body.length <= maxLength) return body;
  return body.slice(0, maxLength).trimEnd() + '…';
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Template list page — displays all message templates for the tenant.
 * Allows navigating to create new templates or edit/delete existing ones.
 *
 * Validates: Requirements 13.1, 13.6
 */
export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Fetch Templates ───────────────────────────────────────────────────

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/nurture/templates');
        if (!res.ok) throw new Error('Failed to fetch templates');
        const data = await res.json();
        setTemplates(data.templates ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  // ─── Delete Handler ────────────────────────────────────────────────────

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/nurture/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          alert(
            `Cannot delete: this template is referenced by active playbook steps (${data.referenced_by?.join(', ') ?? 'unknown'}).`
          );
        } else {
          alert(data.error ?? 'Failed to delete template');
        }
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 lg:p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-onyx-card rounded w-48" />
          <div className="h-4 bg-onyx-card rounded w-64" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-onyx-card rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-7">
        <div className="text-center py-12 bg-onyx-card rounded-2xl border border-onyx-line">
          <p className="text-status-red text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-brand hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            Message Templates
          </h1>
          <p className="text-[13px] text-gray-2">
            Create and manage reusable message templates with placeholders
          </p>
        </div>
        <Link href="/nurture/templates/new" className="btn-primary">
          + New Template
        </Link>
      </div>

      {/* Template list */}
      <div className="space-y-3">
        {templates.length > 0 ? (
          templates.map((template) => (
            <div
              key={template.id}
              className="bg-onyx-card rounded-2xl border border-onyx-line p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{template.name}</p>
                    <span className={`chip ${CHANNEL_COLORS[template.channel]}`}>
                      {CHANNEL_LABELS[template.channel]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-2 mt-1.5 line-clamp-2">
                    {truncateBody(template.body)}
                  </p>
                  <p className="text-[11px] text-gray-2/60 mt-2">
                    Updated{' '}
                    {new Date(template.updated_at).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => router.push(`/nurture/templates/new?edit=${template.id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-2 border border-onyx-line rounded-lg hover:text-white hover:border-white/20 transition-colors"
                    aria-label={`Edit template ${template.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    disabled={deletingId === template.id}
                    className="px-3 py-1.5 text-xs font-medium text-status-red/80 border border-status-red/20 rounded-lg hover:text-status-red hover:border-status-red/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Delete template ${template.name}`}
                  >
                    {deletingId === template.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-onyx-card rounded-2xl border border-onyx-line">
            <p className="text-gray-2 text-sm">No templates yet</p>
            <p className="text-gray-2 text-xs mt-1">
              Create a message template to use in your playbook steps
            </p>
            <Link
              href="/nurture/templates/new"
              className="inline-block mt-4 text-sm text-brand hover:underline"
            >
              Create your first template →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
