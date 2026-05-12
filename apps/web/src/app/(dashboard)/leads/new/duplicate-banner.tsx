'use client';

import type { DuplicateDetectionResult } from '@agentos/shared';

export interface DuplicateBannerProps {
  /** Result from the duplicate detection engine */
  detectionResult: DuplicateDetectionResult;
  /** Called when agent chooses to create a new lead (default action) */
  onCreateNew: () => void;
  /** Called when agent chooses to attach activity to the existing lead */
  onAttachToExisting: (leadId: string) => void;
  /** Called when agent chooses to merge into the active lead */
  onMerge: (leadId: string) => void;
}

/**
 * Duplicate Detection Banner Component
 *
 * Shows context about an existing contact's lead history during lead creation.
 * When a potential duplicate is detected (same category within 14 days),
 * displays a warning and presents three action choices to the agent.
 */
export function DuplicateBanner({
  detectionResult,
  onCreateNew,
  onAttachToExisting,
  onMerge,
}: DuplicateBannerProps) {
  const { isDuplicate, reason, existingLead, contextBanner } = detectionResult;
  const { pastLeadsCount, closedDealsCount, activeLeadsCount } = contextBanner;

  return (
    <div className="bg-onyx-card border border-onyx-line rounded-2xl p-5 space-y-4">
      {/* 11.1 Context info banner */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">Existing contact found</p>
          <p className="text-xs text-gray-2 mt-0.5">
            {pastLeadsCount} past lead{pastLeadsCount !== 1 ? 's' : ''}, {closedDealsCount} closed deal{closedDealsCount !== 1 ? 's' : ''}, {activeLeadsCount} active lead{activeLeadsCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* 11.2 Duplicate warning section */}
      {isDuplicate && existingLead && (
        <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-xs font-medium text-status-warning">Potential duplicate detected</p>
              <p className="text-xs text-gray-2 mt-0.5">{reason}</p>
              {existingLead.lead_title && (
                <p className="text-xs text-white mt-1">
                  Existing lead: <span className="font-medium">{existingLead.lead_title}</span>
                  {' '}({existingLead.lead_category} · {existingLead.status.replace(/_/g, ' ')})
                </p>
              )}
              {!existingLead.lead_title && (
                <p className="text-xs text-white mt-1">
                  Existing lead: <span className="font-medium">{existingLead.lead_category}</span>
                  {' '}· {existingLead.status.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11.3 Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center h-9 px-4 rounded-pill bg-brand text-white text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Create New Lead
        </button>
        {isDuplicate && existingLead && (
          <>
            <button
              type="button"
              onClick={() => onAttachToExisting(existingLead.id)}
              className="inline-flex items-center justify-center h-9 px-4 rounded-pill border border-onyx-line bg-transparent text-white text-xs font-medium hover:bg-onyx-raised transition-colors"
            >
              Attach to Existing
            </button>
            <button
              type="button"
              onClick={() => onMerge(existingLead.id)}
              className="inline-flex items-center justify-center h-9 px-4 rounded-pill border border-onyx-line bg-transparent text-white text-xs font-medium hover:bg-onyx-raised transition-colors"
            >
              Merge into Active
            </button>
          </>
        )}
      </div>
    </div>
  );
}
