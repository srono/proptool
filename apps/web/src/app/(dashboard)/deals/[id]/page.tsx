import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { MilestoneTracker, getMilestoneTemplate } from '@/components/deals/milestone-tracker';
import type { Milestone } from '@/components/deals/milestone-tracker';

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  negotiating: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  otp_issued: 'text-aqua border-brand/50 bg-brand/[0.12]',
  otp_signed: 'text-aqua border-brand/50 bg-brand/[0.12]',
  exercised: 'text-brand border-brand/50 bg-brand/[0.12]',
  completed: 'text-status-green border-status-green/40 bg-status-green/10',
  fallen_through: 'text-status-red border-status-red/40 bg-status-red/10',
};

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return `$${amount.toLocaleString('en-SG', { minimumFractionDigits: 2 })}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      *,
      lead:leads(
        id,
        deal_type,
        status,
        contact:contacts(full_name, phone, email)
      ),
      listing:listings(id, address, district, property_type)
    `)
    .eq('id', id)
    .single();

  if (error || !deal) {
    notFound();
  }

  const contact = Array.isArray(deal.lead?.contact)
    ? deal.lead.contact[0]
    : deal.lead?.contact;

  // Get or initialize milestones
  const milestones: Milestone[] =
    deal.milestones && Array.isArray(deal.milestones)
      ? (deal.milestones as Milestone[])
      : getMilestoneTemplate(deal.deal_type ?? deal.lead?.deal_type ?? 'sale');

  const grossCommission = deal.commission_amount ?? 0;
  const coBrokeDeduction = grossCommission * ((deal.co_broke_split_pct ?? 0) / 100);
  const netCommission = grossCommission - coBrokeDeduction;

  return (
    <div className="p-4 lg:p-7 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-onyx-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
              {contact?.full_name ?? 'Unknown Contact'}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                STATUS_COLORS[deal.status] ?? 'text-gray-2 border-onyx-line bg-transparent'
              }`}
            >
              {formatStatus(deal.status)}
            </span>
          </div>
          <p className="text-[13px] text-gray-2 mt-0.5">
            {deal.deal_type?.replace(/_/g, ' ')} ·{' '}
            {deal.listing?.address ?? 'No listing linked'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Deal Summary */}
          <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
            <h2 className="text-sm font-display font-bold text-white mb-3">Deal Summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-2">Contact</dt>
                <dd className="text-white font-medium">{contact?.full_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-2">Phone</dt>
                <dd className="text-white">{contact?.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-2">Property</dt>
                <dd className="text-white">
                  {deal.listing ? `${deal.listing.address}, D${deal.listing.district}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-2">Property Type</dt>
                <dd className="text-white">{deal.listing?.property_type ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-2">Offer Price</dt>
                <dd className="text-white">{formatCurrency(deal.offer_price)}</dd>
              </div>
              <div>
                <dt className="text-gray-2">Agreed Price</dt>
                <dd className="text-white font-medium">{formatCurrency(deal.agreed_price)}</dd>
              </div>
              {deal.otp_date && (
                <div>
                  <dt className="text-gray-2">OTP / LOI Date</dt>
                  <dd className="text-white">
                    {new Date(deal.otp_date).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {deal.exercise_deadline && (
                <div>
                  <dt className="text-gray-2">Exercise Deadline</dt>
                  <dd className="text-white">
                    {new Date(deal.exercise_deadline).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {deal.completion_date && (
                <div>
                  <dt className="text-gray-2">Completion Date</dt>
                  <dd className="text-white">
                    {new Date(deal.completion_date).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
            {deal.notes && (
              <div className="mt-4 pt-3 border-t border-onyx-line">
                <p className="text-xs text-gray-2 mb-1">Notes</p>
                <p className="text-sm text-gray-2">{deal.notes}</p>
              </div>
            )}
          </div>

          {/* Milestone Tracker */}
          <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
            <h2 className="text-sm font-display font-bold text-white mb-4">Milestone Tracker</h2>
            <MilestoneTracker
              dealId={deal.id}
              dealType={deal.deal_type ?? deal.lead?.deal_type ?? 'sale'}
              milestones={milestones}
            />
          </div>

          {/* Documents */}
          <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
            <h2 className="text-sm font-display font-bold text-white mb-3">Documents</h2>
            {deal.documents && Array.isArray(deal.documents) && deal.documents.length > 0 ? (
              <div className="space-y-2">
                {(deal.documents as Array<{ url: string; type: string; name: string }>).map(
                  (doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-2xl border border-onyx-line p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-gray-2 truncate">{doc.name}</span>
                        <span className="text-xs bg-onyx-raised text-gray-2 px-1.5 py-0.5 rounded shrink-0">
                          {doc.type}
                        </span>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                      >
                        View
                      </a>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-2">No documents uploaded yet</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Commission Summary */}
          <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
            <h3 className="text-sm font-display font-bold text-white mb-3">Commission</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-2">Gross Commission</dt>
                <dd className="text-white font-medium">{formatCurrency(grossCommission)}</dd>
              </div>
              {deal.commission_pct && (
                <div className="flex justify-between">
                  <dt className="text-gray-2">Rate</dt>
                  <dd className="text-white">{deal.commission_pct}%</dd>
                </div>
              )}
              {deal.co_broke_split_pct > 0 && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-2">
                      Co-broke ({deal.co_broke_split_pct}%)
                    </dt>
                    <dd className="text-status-red">-{formatCurrency(coBrokeDeduction)}</dd>
                  </div>
                  {deal.co_broke_agent_name && (
                    <div className="flex justify-between">
                      <dt className="text-gray-2">Co-broke Agent</dt>
                      <dd className="text-white">{deal.co_broke_agent_name}</dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-t border-onyx-line pt-2">
                <dt className="text-white font-semibold">Net Commission</dt>
                <dd className="text-status-green font-bold">{formatCurrency(netCommission)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Payment Status</dt>
                <dd>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      deal.commission_paid
                        ? 'text-status-green border-status-green/40 bg-status-green/10'
                        : 'text-status-amber border-status-amber/40 bg-status-amber/10'
                    }`}
                  >
                    {deal.commission_paid ? 'Paid' : 'Pending'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Key Dates */}
          <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4">
            <h3 className="text-sm font-display font-bold text-white mb-3">Key Dates</h3>
            <dl className="space-y-2 text-sm">
              {deal.otp_date && (
                <div className="flex justify-between">
                  <dt className="text-gray-2">OTP / LOI</dt>
                  <dd className="text-white">
                    {new Date(deal.otp_date).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </dd>
                </div>
              )}
              {deal.exercise_deadline && (
                <div className="flex justify-between">
                  <dt className="text-gray-2">Exercise By</dt>
                  <dd className="text-white">
                    {new Date(deal.exercise_deadline).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </dd>
                </div>
              )}
              {deal.completion_date && (
                <div className="flex justify-between">
                  <dt className="text-gray-2">Completion</dt>
                  <dd className="text-white">
                    {new Date(deal.completion_date).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-2">Created</dt>
                <dd className="text-white">
                  {new Date(deal.created_at).toLocaleDateString('en-SG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
