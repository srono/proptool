'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Milestone {
  key: string;
  label: string;
  completed: boolean;
  date: string | null;
  notes: string;
}

interface Props {
  dealId: string;
  dealType: string;
  milestones: Milestone[];
}

const SALE_MILESTONES = [
  { key: 'offer_accepted', label: 'Offer Accepted' },
  { key: 'otp_issued', label: 'OTP Issued' },
  { key: 'otp_exercised', label: 'OTP Exercised' },
  { key: 'booking_fee', label: 'Booking Fee Received' },
  { key: 'caveat_lodged', label: 'Caveat Lodged' },
  { key: 'legal', label: 'Legal Completion' },
  { key: 'completion', label: 'Completion' },
  { key: 'commission_received', label: 'Commission Received' },
];

const RENTAL_MILESTONES = [
  { key: 'offer_accepted', label: 'Offer Accepted' },
  { key: 'loi_signed', label: 'LOI Signed' },
  { key: 'ta_signed', label: 'TA Signed' },
  { key: 'deposit_received', label: 'Deposit Received' },
  { key: 'handover', label: 'Handover' },
  { key: 'commission_received', label: 'Commission Received' },
];

export function getMilestoneTemplate(dealType: string): Milestone[] {
  const template = dealType === 'rental' ? RENTAL_MILESTONES : SALE_MILESTONES;
  return template.map((m) => ({
    key: m.key,
    label: m.label,
    completed: false,
    date: null,
    notes: '',
  }));
}

export function MilestoneTracker({ dealId, dealType, milestones: initialMilestones }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isSaving, setIsSaving] = useState(false);

  const completedCount = milestones.filter((m) => m.completed).length;
  const totalCount = milestones.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const saveMilestones = useCallback(
    async (updated: Milestone[]) => {
      setIsSaving(true);
      try {
        const supabase = createClient();
        await supabase
          .from('deals')
          .update({ milestones: updated })
          .eq('id', dealId);
      } finally {
        setIsSaving(false);
      }
    },
    [dealId]
  );

  function toggleMilestone(index: number) {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      completed: !updated[index].completed,
      date: !updated[index].completed ? new Date().toISOString().split('T')[0] : updated[index].date,
    };
    setMilestones(updated);
    saveMilestones(updated);
  }

  function updateDate(index: number, date: string) {
    const updated = [...milestones];
    updated[index] = { ...updated[index], date };
    setMilestones(updated);
    saveMilestones(updated);
  }

  function updateNotes(index: number, notes: string) {
    const updated = [...milestones];
    updated[index] = { ...updated[index], notes };
    setMilestones(updated);
  }

  function saveNotes(index: number) {
    saveMilestones(milestones);
  }

  // Find current step (first incomplete)
  const currentStepIndex = milestones.findIndex((m) => !m.completed);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-onyx-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-status-green rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs text-gray-2 shrink-0">
          {completedCount}/{totalCount}
        </span>
        {isSaving && (
          <span className="text-xs text-gray-2">Saving...</span>
        )}
      </div>

      {/* Vertical stepper */}
      <div className="relative">
        {milestones.map((milestone, index) => {
          const isCompleted = milestone.completed;
          const isCurrent = index === currentStepIndex;
          const isFuture = !isCompleted && index > currentStepIndex;

          return (
            <div key={milestone.key} className="relative flex gap-3 pb-6 last:pb-0">
              {/* Vertical line */}
              {index < milestones.length - 1 && (
                <div
                  className={`absolute left-[11px] top-6 w-0.5 h-[calc(100%-12px)] ${
                    isCompleted ? 'bg-status-green/40' : 'bg-onyx-line'
                  }`}
                />
              )}

              {/* Step indicator */}
              <button
                type="button"
                onClick={() => toggleMilestone(index)}
                className={`relative z-10 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isCompleted
                    ? 'bg-status-green border-status-green text-white'
                    : isCurrent
                    ? 'bg-onyx-card border-brand text-brand'
                    : 'bg-onyx-card border-onyx-line text-gray-2'
                }`}
                aria-label={`${isCompleted ? 'Unmark' : 'Mark'} ${milestone.label} as complete`}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current" />
                )}
              </button>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isFuture ? 'opacity-50' : ''}`}>
                <p
                  className={`text-sm font-medium ${
                    isCompleted
                      ? 'text-status-green'
                      : isCurrent
                      ? 'text-white'
                      : 'text-gray-2'
                  }`}
                >
                  {milestone.label}
                </p>

                {/* Date and notes (show for completed or current) */}
                {(isCompleted || isCurrent) && (
                  <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={milestone.date ?? ''}
                      onChange={(e) => updateDate(index, e.target.value)}
                      className="bg-onyx-raised border border-onyx-line rounded-xl px-2 py-1 text-xs text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-36"
                      aria-label={`Date for ${milestone.label}`}
                    />
                    <input
                      type="text"
                      value={milestone.notes}
                      onChange={(e) => updateNotes(index, e.target.value)}
                      onBlur={() => saveNotes(index)}
                      placeholder="Notes..."
                      className="flex-1 bg-onyx-raised border border-onyx-line rounded-xl px-2 py-1 text-xs text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      aria-label={`Notes for ${milestone.label}`}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
