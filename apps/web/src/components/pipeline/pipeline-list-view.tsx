'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PIPELINE_STAGES } from '@agentos/shared';
import type { PipelineStage } from '@agentos/shared';
import type { Breakpoint } from '@/components/listings/hooks/use-breakpoint';
import {
  formatRelativeActivity,
  formatCreatedDate,
  formatSourceLabel,
  formatDealTypeLabel,
} from './utils/format-lead-fields';

// --- Types ---

export type SortableColumn =
  | 'contact_name'
  | 'deal_type'
  | 'urgency'
  | 'stage'
  | 'source'
  | 'intent_score'
  | 'last_activity'
  | 'created_at';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: SortableColumn;
  direction: SortDirection;
}

interface LeadWithRelations {
  id: string;
  status: PipelineStage;
  deal_type: string;
  urgency: string;
  source: string;
  intent_score: number | null;
  verification_score: number | null;
  eligibility_risk: boolean;
  last_activity_at: string | null;
  created_at: string;
  contact: {
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
  tasks: {
    id: string;
    title: string;
    due_at: string;
    completed_at: string | null;
  }[];
}

export interface PipelineListViewProps {
  leads: LeadWithRelations[];
  sort: SortState;
  onSort: (column: SortableColumn) => void;
  breakpoint: Breakpoint;
}

// --- Column definitions ---

interface ColumnDef {
  key: SortableColumn;
  label: string;
  /** Tailwind classes controlling responsive visibility */
  className: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'contact_name', label: 'Contact Name', className: '' },
  { key: 'deal_type', label: 'Deal Type', className: '' },
  { key: 'urgency', label: 'Urgency', className: '' },
  { key: 'stage', label: 'Stage', className: '' },
  { key: 'source', label: 'Source', className: 'hidden lg:table-cell' },
  { key: 'intent_score', label: 'Intent Score', className: 'hidden lg:table-cell' },
  { key: 'last_activity', label: 'Last Activity', className: '' },
  { key: 'created_at', label: 'Created Date', className: 'hidden lg:table-cell' },
];

// Phone column is special — visible only on desktop
const PHONE_COLUMN = { key: 'phone' as const, label: 'Phone', className: 'hidden lg:table-cell' };

// --- Helpers ---

function getUrgencyBadgeClasses(urgency: string): string {
  switch (urgency) {
    case 'hot':
      return 'text-status-red bg-status-red/10 border-status-red/40';
    case 'warm':
      return 'text-status-amber bg-status-amber/10 border-status-amber/40';
    case 'cold':
      return 'text-brand bg-brand/10 border-brand/40';
    default:
      return 'text-gray-2 bg-gray-1/10 border-gray-1/40';
  }
}

function getUrgencyLabel(urgency: string): string {
  switch (urgency) {
    case 'hot':
      return 'Hot';
    case 'warm':
      return 'Warm';
    case 'cold':
      return 'Cold';
    default:
      return urgency;
  }
}

function getIntentScoreClasses(score: number): string {
  if (score >= 4) return 'text-status-green';
  if (score >= 2) return 'text-status-amber';
  return 'text-status-red';
}

function getStageLabel(status: PipelineStage): string {
  const stage = PIPELINE_STAGES.find((s) => s.key === status);
  return stage ? stage.label : status;
}

// --- Component ---

export function PipelineListView({ leads, sort, onSort, breakpoint }: PipelineListViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-onyx-line">
            {/* Contact Name */}
            <SortableHeader
              column="contact_name"
              label="Contact Name"
              sort={sort}
              onSort={onSort}
              className=""
            />
            {/* Phone — desktop only */}
            <th className="hidden lg:table-cell px-3 py-3 text-[11px] font-semibold text-gray-2 uppercase tracking-label whitespace-nowrap">
              Phone
            </th>
            {/* Remaining sortable columns */}
            {COLUMNS.slice(1).map((col) => (
              <SortableHeader
                key={col.key}
                column={col.key}
                label={col.label}
                sort={sort}
                onSort={onSort}
                className={col.className}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-onyx-line">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} breakpoint={breakpoint} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- SortableHeader ---

interface SortableHeaderProps {
  column: SortableColumn;
  label: string;
  sort: SortState;
  onSort: (column: SortableColumn) => void;
  className?: string;
}

function SortableHeader({ column, label, sort, onSort, className = '' }: SortableHeaderProps) {
  const isActive = sort.column === column;

  return (
    <th
      className={`px-3 py-3 text-[11px] font-semibold text-gray-2 uppercase tracking-label whitespace-nowrap cursor-pointer select-none hover:text-white transition-colors ${className}`}
      onClick={() => onSort(column)}
      aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          sort.direction === 'asc' ? (
            <ChevronUp className="w-3 h-3 text-aqua" />
          ) : (
            <ChevronDown className="w-3 h-3 text-aqua" />
          )
        )}
      </span>
    </th>
  );
}

// --- LeadRow ---

interface LeadRowProps {
  lead: LeadWithRelations;
  breakpoint: Breakpoint;
}

function LeadRow({ lead }: LeadRowProps) {
  const router = useRouter();
  const contactName = lead.contact?.full_name ?? 'Unknown';
  const phone = lead.contact?.phone ?? '—';
  const isHot = lead.urgency === 'hot' || (lead.intent_score !== null && lead.intent_score >= 4);

  function handleClick() {
    router.push(`/leads/${lead.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/leads/${lead.id}`);
    }
  }

  return (
    <tr
      className="group cursor-pointer hover:bg-brand/[0.06] transition-colors"
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Contact Name */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {/* Hot indicator */}
          {isHot && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-aqua shadow-[0_0_8px_theme(colors.aqua.DEFAULT)]" />
              <span className="text-[10px] text-aqua font-bold tracking-wider">HOT</span>
            </div>
          )}
          <span
            className="block text-sm text-white font-medium truncate max-w-[200px]"
            title={contactName}
          >
            {contactName}
          </span>
          {/* Eligibility risk badge */}
          {lead.eligibility_risk && (
            <span className="chip text-status-red border-status-red/40 bg-status-red/10 shrink-0">
              ELIG WATCH
            </span>
          )}
        </div>
      </td>

      {/* Phone — desktop only */}
      <td className="hidden lg:table-cell px-3 py-3 text-sm text-gray-2">
        {phone}
      </td>

      {/* Deal Type */}
      <td className="px-3 py-3 text-sm text-gray-3">
        {formatDealTypeLabel(lead.deal_type)}
      </td>

      {/* Urgency */}
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-pill border text-[10px] font-semibold tracking-wide ${getUrgencyBadgeClasses(lead.urgency)}`}
        >
          {getUrgencyLabel(lead.urgency)}
        </span>
      </td>

      {/* Stage */}
      <td className="px-3 py-3 text-sm text-gray-3">
        {getStageLabel(lead.status)}
      </td>

      {/* Source — desktop only */}
      <td className="hidden lg:table-cell px-3 py-3 text-sm text-gray-3">
        {formatSourceLabel(lead.source)}
      </td>

      {/* Intent Score — desktop only */}
      <td className="hidden lg:table-cell px-3 py-3 text-sm">
        {lead.intent_score !== null ? (
          <span className={`font-semibold ${getIntentScoreClasses(lead.intent_score)}`}>
            {lead.intent_score}
          </span>
        ) : (
          <span className="text-gray-2">—</span>
        )}
      </td>

      {/* Last Activity */}
      <td className="px-3 py-3 text-sm text-gray-2">
        {formatRelativeActivity(lead.last_activity_at)}
      </td>

      {/* Created Date — desktop only */}
      <td className="hidden lg:table-cell px-3 py-3 text-sm text-gray-2">
        {formatCreatedDate(lead.created_at)}
      </td>
    </tr>
  );
}
