'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { DuplicateDetectionResult } from '@agentos/shared';
import { DuplicateBanner } from './duplicate-banner';

export default function NewLeadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('manual');
  const [dealType, setDealType] = useState('sale');
  const [urgency, setUrgency] = useState('warm');
  const [notes, setNotes] = useState('');

  // Duplicate detection state
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [resolvedContactId, setResolvedContactId] = useState<string | null>(null);

  /**
   * 11.4 Trigger duplicate check after phone number is entered/blurred.
   * Searches for an existing contact by phone and runs duplicate detection.
   */
  const handlePhoneBlur = useCallback(async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || trimmedPhone.length < 8) {
      setDuplicateResult(null);
      setResolvedContactId(null);
      return;
    }

    setIsCheckingDuplicate(true);
    try {
      const supabase = createClient();

      // Search for existing contact by phone
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', trimmedPhone)
        .single();

      if (!existingContact) {
        // No existing contact — no duplicate check needed
        setDuplicateResult(null);
        setResolvedContactId(null);
        return;
      }

      setResolvedContactId(existingContact.id);

      // Derive lead category from deal type for duplicate check
      const leadCategory = dealType === 'rental' ? 'tenant' : 'buyer';

      // Fetch all leads for this contact to build context
      const { data: allLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('contact_id', existingContact.id)
        .order('created_at', { ascending: false });

      const leads = allLeads ?? [];

      // Build context banner counts
      const pastLeadsCount = leads.length;
      const closedDealsCount = leads.filter(
        (l: { status: string }) => l.status === 'closed_won'
      ).length;
      const activeLeadsCount = leads.filter(
        (l: { is_active: boolean }) => l.is_active === true
      ).length;

      // Check for duplicate: active lead with same category created within 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const potentialDuplicate = leads.find(
        (l: { is_active: boolean; lead_category: string; created_at: string }) =>
          l.is_active === true &&
          l.lead_category === leadCategory &&
          new Date(l.created_at) >= fourteenDaysAgo
      );

      const result: DuplicateDetectionResult = potentialDuplicate
        ? {
            isDuplicate: true,
            reason: `Active lead with same category "${leadCategory}" created within the past 14 days`,
            existingLead: potentialDuplicate,
            contextBanner: { pastLeadsCount, closedDealsCount, activeLeadsCount },
          }
        : {
            isDuplicate: false,
            contextBanner: { pastLeadsCount, closedDealsCount, activeLeadsCount },
          };

      setDuplicateResult(result);
    } catch {
      // Silently fail — duplicate check is advisory, not blocking
      setDuplicateResult(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, [phone, dealType]);

  /**
   * 11.5 Action handler: Create a new lead (default action).
   * Proceeds with normal lead creation flow.
   */
  async function handleCreateNewLead() {
    await handleSubmit();
  }

  /**
   * 11.5 Action handler: Attach activity to existing lead.
   * Calls attachToExistingLead — updates the existing lead's notes and last_activity_at.
   */
  async function handleAttachToExisting(leadId: string) {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Fetch current lead to append notes
      const { data: currentLead } = await supabase
        .from('leads')
        .select('notes')
        .eq('id', leadId)
        .single();

      const existingNotes = currentLead?.notes ?? '';
      const separator = existingNotes ? '\n---\n' : '';
      const updatedNotes = notes.trim()
        ? `${existingNotes}${separator}[${now}] ${notes.trim()}`
        : existingNotes;

      await supabase
        .from('leads')
        .update({
          last_activity_at: now,
          ...(notes.trim() ? { notes: updatedNotes } : {}),
        })
        .eq('id', leadId);

      router.push(`/leads/${leadId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Action handler: Merge into active lead.
   * For now, this behaves the same as attach — navigates to the existing lead.
   */
  async function handleMerge(leadId: string) {
    // Merge behaves like attach for now — link activity to existing lead
    await handleAttachToExisting(leadId);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Name and phone are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone.trim())
        .single();

      let contactId: string;

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            full_name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            source,
            lead_type: 'buyer',
            whatsapp_optin: false,
          })
          .select('id')
          .single();

        if (contactError || !newContact) {
          alert('Failed to create contact');
          return;
        }
        contactId = newContact.id;
      }

      // Derive lead_category from deal_type
      const leadCategory = dealType === 'rental' ? 'tenant' : 'buyer';

      const { error: leadError } = await supabase.from('leads').insert({
        contact_id: contactId,
        status: 'new_lead',
        source,
        deal_type: dealType,
        urgency,
        lead_category: leadCategory,
        is_active: true,
        opened_at: new Date().toISOString(),
        notes: notes.trim() || null,
        eligibility_risk: false,
        paynow_verified: false,
        last_activity_at: new Date().toISOString(),
        ...(duplicateResult?.existingLead
          ? { duplicate_of_lead_id: duplicateResult.existingLead.id }
          : {}),
      });

      if (leadError) {
        alert('Failed to create lead');
        return;
      }

      router.push('/leads');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 lg:p-7 max-w-lg mx-auto space-y-5">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Add Lead</h1>
        <p className="text-[13px] text-gray-2 mt-1">Quick-add a new lead to your pipeline</p>
      </div>

      {/* 11.4 Duplicate detection banner — shown after phone check */}
      {isCheckingDuplicate && (
        <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
          <p className="text-xs text-gray-2 animate-pulse">Checking for existing contact...</p>
        </div>
      )}

      {duplicateResult && !isCheckingDuplicate && (
        <DuplicateBanner
          detectionResult={duplicateResult}
          onCreateNew={handleCreateNewLead}
          onAttachToExisting={handleAttachToExisting}
          onMerge={handleMerge}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-onyx-card border border-onyx-line rounded-2xl p-5 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5">Name *</label>
            <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Rachel Lim" className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5">Phone *</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              required
              placeholder="+65 9XXX XXXX"
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="source" className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5">Source</label>
              <select id="source" value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="manual">Manual</option>
                <option value="referral">Referral</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="open_house">Open House</option>
                <option value="portal">Portal</option>
              </select>
            </div>
            <div>
              <label htmlFor="dealType" className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5">Deal Type</label>
              <select id="dealType" value={dealType} onChange={(e) => setDealType(e.target.value)} className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="sale">Sale</option>
                <option value="resale">Resale</option>
                <option value="rental">Rental</option>
              </select>
            </div>
            <div>
              <label htmlFor="urgency" className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5">Urgency</label>
              <select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-3 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand">
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="block text-[11px] text-gray-2 font-semibold tracking-label uppercase mb-1.5">Notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any initial notes..." className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary py-3 text-sm font-semibold disabled:opacity-50">
            {isSubmitting ? 'Adding...' : 'Add lead'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost py-3 px-5 text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
