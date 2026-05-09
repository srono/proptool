'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LeadOption {
  id: string;
  deal_type: string;
  status: string;
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
}

export function DealForm({ leads, listings }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [leadId, setLeadId] = useState('');
  const [listingId, setListingId] = useState('');
  const [dealType, setDealType] = useState('sale');
  const [offerPrice, setOfferPrice] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
  const [coBrokeAgentName, setCoBrokeAgentName] = useState('');
  const [coBrokeSplitPct, setCoBrokeSplitPct] = useState('');
  const [otpDate, setOtpDate] = useState('');
  const [exerciseDeadline, setExerciseDeadline] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [notes, setNotes] = useState('');

  const agreedPriceNum = parseFloat(agreedPrice) || 0;
  const commissionPctNum = parseFloat(commissionPct) || 0;
  const coBrokeSplitPctNum = parseFloat(coBrokeSplitPct) || 0;

  const commissionAmount = useMemo(
    () => agreedPriceNum * commissionPctNum / 100,
    [agreedPriceNum, commissionPctNum]
  );

  const coBrokeDeduction = useMemo(
    () => commissionAmount * coBrokeSplitPctNum / 100,
    [commissionAmount, coBrokeSplitPctNum]
  );

  const netCommission = commissionAmount - coBrokeDeduction;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!leadId) {
      alert('Please select a lead');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.from('deals').insert({
        lead_id: leadId,
        listing_id: listingId || null,
        deal_type: dealType,
        offer_price: parseFloat(offerPrice) || null,
        agreed_price: agreedPriceNum || null,
        commission_pct: commissionPctNum || null,
        commission_amount: commissionAmount || null,
        co_broke_split_pct: coBrokeSplitPctNum || null,
        co_broke_agent_name: coBrokeAgentName || null,
        otp_date: otpDate || null,
        exercise_deadline: exerciseDeadline || null,
        completion_date: completionDate || null,
        notes: notes || null,
        status: 'negotiating',
      });

      if (error) {
        console.error('Failed to create deal:', error);
        alert('Failed to create deal. Please try again.');
        return;
      }

      // Update lead status
      await supabase
        .from('leads')
        .update({
          status: otpDate ? 'otp_loi_issued' : 'negotiating',
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      router.push('/deals');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Lead & Listing */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
        <h2 className="text-sm font-display font-bold text-white">Parties & Property</h2>

        <div>
          <label htmlFor="lead" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
            Lead *
          </label>
          <select
            id="lead"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            required
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
          <label htmlFor="listing" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
            Listing (optional)
          </label>
          <select
            id="listing"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">No listing linked</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.address} · {listing.district} · {listing.property_type}
                {listing.asking_price ? ` · $${(listing.asking_price / 1000000).toFixed(2)}M` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dealType" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
            Deal Type
          </label>
          <select
            id="dealType"
            value={dealType}
            onChange={(e) => setDealType(e.target.value)}
            className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="sale">Sale</option>
            <option value="resale">Resale</option>
            <option value="rental">Rental</option>
            <option value="new_launch">New Launch</option>
          </select>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
        <h2 className="text-sm font-display font-bold text-white">Pricing</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="offerPrice" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Offer Price ($)
            </label>
            <input
              type="number"
              id="offerPrice"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="0"
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="agreedPrice" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Agreed Price ($)
            </label>
            <input
              type="number"
              id="agreedPrice"
              value={agreedPrice}
              onChange={(e) => setAgreedPrice(e.target.value)}
              placeholder="0"
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {/* Commission */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
        <h2 className="text-sm font-display font-bold text-white">Commission</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="commissionPct" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Commission %
            </label>
            <input
              type="number"
              id="commissionPct"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              step="0.1"
              placeholder="e.g. 2"
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Commission Amount
            </label>
            <div className="rounded-xl border border-onyx-line bg-onyx-raised px-4 py-3 text-sm text-gray-2">
              ${commissionAmount.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="coBrokeAgent" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Co-broke Agent (optional)
            </label>
            <input
              type="text"
              id="coBrokeAgent"
              value={coBrokeAgentName}
              onChange={(e) => setCoBrokeAgentName(e.target.value)}
              placeholder="Agent name"
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="coBrokeSplit" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Co-broke Split %
            </label>
            <input
              type="number"
              id="coBrokeSplit"
              value={coBrokeSplitPct}
              onChange={(e) => setCoBrokeSplitPct(e.target.value)}
              step="1"
              placeholder="e.g. 50"
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Commission summary */}
        {commissionAmount > 0 && (
          <div className="rounded-2xl bg-status-green/10 border border-status-green/40 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-2">Gross Commission</span>
              <span className="font-medium text-white">
                ${commissionAmount.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {coBrokeSplitPctNum > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-2">Co-broke ({coBrokeSplitPctNum}%)</span>
                <span className="text-status-red">
                  -${coBrokeDeduction.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-status-green/40 pt-1">
              <span className="text-white">Net Commission</span>
              <span className="text-status-green">
                ${netCommission.toLocaleString('en-SG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
        <h2 className="text-sm font-display font-bold text-white">Key Dates</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="otpDate" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              OTP / LOI Date
            </label>
            <input
              type="date"
              id="otpDate"
              value={otpDate}
              onChange={(e) => setOtpDate(e.target.value)}
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="exerciseDeadline" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Exercise Deadline
            </label>
            <input
              type="date"
              id="exerciseDeadline"
              value={exerciseDeadline}
              onChange={(e) => setExerciseDeadline(e.target.value)}
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="completionDate" className="block text-[11px] text-gray-2 font-semibold tracking-wide uppercase mb-1.5">
              Completion Date
            </label>
            <input
              type="date"
              id="completionDate"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 space-y-4">
        <h2 className="text-sm font-display font-bold text-white">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional notes about this deal..."
          className="w-full bg-onyx-raised border border-onyx-line rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !leadId}
          className="flex-1 btn-primary"
        >
          {isSubmitting ? 'Creating...' : 'Create Deal'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
