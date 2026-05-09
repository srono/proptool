'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PreViewingChecklist } from '@propagent/shared';

interface LeadOption {
  id: string;
  status: string;
  deal_type: string;
  pre_viewing_checklist: PreViewingChecklist | null;
  contact: { full_name: string; phone: string }[] | { full_name: string; phone: string } | null;
}

interface ListingOption {
  id: string;
  address: string;
  district: string;
  property_type: string;
  asking_price: number | null;
  asking_rental: number | null;
}

interface Props {
  leads: LeadOption[];
  listings: ListingOption[];
  preselectedLeadId?: string;
  googleCalendarConnected?: boolean;
}

const CHECKLIST_ITEMS: { key: keyof PreViewingChecklist; label: string }[] = [
  { key: 'residency_confirmed', label: 'Residency status confirmed' },
  { key: 'eligibility_confirmed', label: 'Eligibility confirmed' },
  { key: 'financing_discussed', label: 'Financing discussed' },
  { key: 'existing_property_understood', label: 'Existing property understood' },
  { key: 'decision_maker_confirmed', label: 'Decision maker confirmed' },
  { key: 'timeline_genuine', label: 'Timeline is genuine' },
  { key: 'paynow_verified', label: 'PayNow verified' },
];

const DEFAULT_CHECKLIST: PreViewingChecklist = {
  residency_confirmed: false,
  eligibility_confirmed: false,
  financing_discussed: false,
  existing_property_understood: false,
  decision_maker_confirmed: false,
  timeline_genuine: false,
  paynow_verified: false,
};

export function NewViewingForm({ leads, listings, preselectedLeadId, googleCalendarConnected }: Props) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState(preselectedLeadId ?? '');
  const [selectedListingId, setSelectedListingId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [syncToCalendar, setSyncToCalendar] = useState(!!googleCalendarConnected);
  const [checklist, setChecklist] = useState<PreViewingChecklist>(DEFAULT_CHECKLIST);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChecklistWarning, setShowChecklistWarning] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // Load existing checklist when lead changes
  function handleLeadChange(leadId: string) {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead?.pre_viewing_checklist) {
      setChecklist(lead.pre_viewing_checklist);
    } else {
      setChecklist(DEFAULT_CHECKLIST);
    }
    setShowChecklistWarning(false);
  }

  function toggleChecklistItem(key: keyof PreViewingChecklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    setShowChecklistWarning(false);
  }

  const checklistComplete = Object.values(checklist).every(Boolean);
  const completedCount = Object.values(checklist).filter(Boolean).length;

  async function handleSubmit(skipChecklist = false) {
    // Validate required fields
    if (!selectedLeadId || !selectedListingId || !date || !time) {
      alert('Please fill in all required fields');
      return;
    }

    // Soft gate: warn if checklist incomplete
    if (!skipChecklist && !checklistComplete) {
      setShowChecklistWarning(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const scheduledAt = new Date(`${date}T${time}`).toISOString();

      // Update lead's pre_viewing_checklist
      await supabase
        .from('leads')
        .update({
          pre_viewing_checklist: checklist,
          status: 'viewing_booked',
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', selectedLeadId);

      // Create viewing
      const { data: newViewing, error } = await supabase
        .from('viewings')
        .insert({
          lead_id: selectedLeadId,
          listing_id: selectedListingId,
          scheduled_at: scheduledAt,
          duration_mins: duration,
          status: 'scheduled',
          attended: null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create viewing:', error);
        alert('Failed to schedule viewing. Please try again.');
        return;
      }

      // Sync to Google Calendar (non-blocking — don't fail the main action)
      if (syncToCalendar && newViewing?.id) {
        try {
          await fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ viewing_id: newViewing.id }),
          });
        } catch (calError) {
          console.warn('Google Calendar sync failed (non-blocking):', calError);
        }
      }

      router.push('/viewings');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Lead selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Viewing Details</h2>

        <div>
          <label htmlFor="lead" className="block text-sm font-medium text-gray-700 mb-1">
            Lead *
          </label>
          <select
            id="lead"
            value={selectedLeadId}
            onChange={(e) => handleLeadChange(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          >
            <option value="">Select a lead...</option>
            {leads.map((lead) => {
              const contact = Array.isArray(lead.contact) ? lead.contact[0] : lead.contact;
              return (
                <option key={lead.id} value={lead.id}>
                  {contact?.full_name ?? 'Unknown'} — {contact?.phone} ({lead.deal_type})
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label htmlFor="listing" className="block text-sm font-medium text-gray-700 mb-1">
            Listing *
          </label>
          <select
            id="listing"
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          >
            <option value="">Select a listing...</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.address} · {listing.district} · {listing.property_type}
                {listing.asking_price ? ` · $${(listing.asking_price / 1000000).toFixed(2)}M` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time *
            </label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (min)
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            >
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
              <option value={120}>120 min</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pre-viewing qualification checklist */}
      {selectedLeadId && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Pre-Viewing Qualification Checklist
            </h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              checklistComplete
                ? 'bg-green-50 text-green-700'
                : 'bg-yellow-50 text-yellow-700'
            }`}>
              {completedCount}/{CHECKLIST_ITEMS.length}
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Complete these items before the viewing to ensure the lead is qualified.
            You can skip and book anyway if needed.
          </p>

          <ul className="space-y-2">
            {CHECKLIST_ITEMS.map((item) => (
              <li key={item.key}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={() => toggleChecklistItem(item.key)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {/* Checklist warning */}
          {showChecklistWarning && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Qualification checklist is incomplete ({completedCount}/{CHECKLIST_ITEMS.length})
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                It&apos;s recommended to complete all items before booking a viewing.
                You can still proceed if needed.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="text-xs rounded-lg bg-yellow-600 px-3 py-1.5 font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
                >
                  Skip and Book Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setShowChecklistWarning(false)}
                  className="text-xs rounded-lg border border-yellow-300 px-3 py-1.5 font-medium text-yellow-700 hover:bg-yellow-100"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Google Calendar sync */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={syncToCalendar}
            onChange={(e) => setSyncToCalendar(e.target.checked)}
            disabled={!googleCalendarConnected}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">
              Sync to Google Calendar
            </span>
            {!googleCalendarConnected && (
              <p className="text-xs text-gray-500 mt-0.5">
                Connect Google Calendar in{' '}
                <a href="/settings?tab=integrations" className="text-brand-600 hover:underline">
                  Settings
                </a>{' '}
                to enable this
              </p>
            )}
          </div>
        </label>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting || !selectedLeadId || !selectedListingId || !date || !time}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Viewing'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
