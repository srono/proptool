'use client';

import { AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';
import type { ComplianceWarning, ComplianceCategory } from '@/lib/ai/ad-copy-types';

// --- Category display labels ---

const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  unsupported_superlative: 'Unsupported Superlative',
  misleading_claim: 'Misleading Claim',
  discriminatory_language: 'Discriminatory Language',
  unverified_factual_claim: 'Unverified Factual Claim',
};

// --- Props ---

interface ComplianceNotesProps {
  warnings: ComplianceWarning[];
  checkFailed: boolean;
}

export function ComplianceNotes({ warnings, checkFailed }: ComplianceNotesProps) {
  // Fallback warning when compliance check fails
  if (checkFailed) {
    return (
      <div className="rounded-xl bg-status-amber/10 border border-status-amber/30 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertOctagon className="h-4 w-4 text-status-amber shrink-0 mt-0.5" />
          <p className="text-xs text-status-amber font-medium">
            Compliance checking could not be completed — review manually before publishing.
          </p>
        </div>
      </div>
    );
  }

  // No compliance issues detected
  if (warnings.length === 0) {
    return (
      <div className="rounded-xl bg-status-green/10 border border-status-green/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-status-green shrink-0" />
          <p className="text-xs text-status-green font-medium">
            No compliance issues detected
          </p>
        </div>
      </div>
    );
  }

  // Display warnings
  return (
    <div className="rounded-xl bg-status-amber/10 border border-status-amber/30 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-status-amber shrink-0" />
        <p className="text-xs text-status-amber font-semibold uppercase tracking-label">
          Compliance Warnings ({warnings.length})
        </p>
      </div>
      <ul className="space-y-1.5">
        {warnings.map((warning, index) => (
          <li key={index} className="flex items-start gap-2 text-xs text-gray-2">
            <span className="text-status-amber shrink-0 mt-0.5">•</span>
            <span>
              &ldquo;{warning.phrase}&rdquo;{' '}
              <span className="text-gray-2/70">— {CATEGORY_LABELS[warning.category]}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
