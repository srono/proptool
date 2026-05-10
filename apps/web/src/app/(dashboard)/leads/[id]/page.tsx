import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { LeadStageSelector } from './lead-stage-selector';
import { LeadClientSection } from './lead-client-section';
import { QualificationChecklist } from './qualification-checklist';
import { ViewingPrepCard } from '@/components/insights/viewing-prep-card';
import { BuyerFitPanel } from '@/components/insights/buyer-fit-panel';
import { generateBuyerFitSignals } from '@/lib/insights/generate';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from('leads')
    .select('contact:contacts(full_name)')
    .eq('id', id)
    .single();
  const contact = lead?.contact as { full_name: string } | null;
  return { title: contact?.full_name ? `${contact.full_name} – Lead` : 'Lead Detail' };
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from('leads')
    .select(`
      *,
      contact:contacts(*),
      messages:messages(*, id, direction, channel, body, media_url, sent_at),
      tasks:tasks(*),
      viewings:viewings(*),
      buyer_requirements:buyer_requirements(*)
    `)
    .eq('id', id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const contact = lead.contact;
  const messages = lead.messages ?? [];
  const tasks = lead.tasks ?? [];
  const viewings = lead.viewings ?? [];
  const buyerRequirements = lead.buyer_requirements?.[0] ?? null;

  const scheduledViewing = viewings.find((v: { status: string; listing_id: string }) => v.status === 'scheduled');
  let viewingListingInsights = null;
  let viewingListingAddress = '';
  if (scheduledViewing) {
    const { data: viewingListing } = await supabase
      .from('listings')
      .select('address, area_insights')
      .eq('id', (scheduledViewing as { listing_id: string }).listing_id)
      .single();
    if (viewingListing) {
      viewingListingInsights = viewingListing.area_insights;
      viewingListingAddress = viewingListing.address;
    }
  }

  let buyerFit = { fit_signals: [] as string[], watchouts: [] as string[] };
  if (buyerRequirements && scheduledViewing) {
    const { data: fitListing } = await supabase
      .from('listings')
      .select('address, district, property_type, asking_price, asking_rental, floor_area_sqft, tenure, listing_type')
      .eq('id', (scheduledViewing as { listing_id: string }).listing_id)
      .single();
    if (fitListing) {
      buyerFit = generateBuyerFitSignals(
        fitListing as Parameters<typeof generateBuyerFitSignals>[0],
        {
          districts: buyerRequirements.districts,
          property_types: buyerRequirements.property_types,
          budget_min: buyerRequirements.budget_min,
          budget_max: buyerRequirements.budget_max,
          timeline: buyerRequirements.timeline,
        },
        viewingListingInsights
      );
    }
  }

  const timelineItems = buildTimeline(messages);

  return (
    <div className="p-4 lg:p-7 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            {contact?.full_name ?? 'Unknown Contact'}
          </h1>
          <p className="text-[13px] text-gray-2 mt-1">
            {contact?.phone} {contact?.email ? `· ${contact.email}` : ''}
          </p>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {lead.verification_score && (
              <span className={`chip ${
                lead.verification_score === 3
                  ? 'text-status-green border-status-green/40 bg-status-green/10'
                  : lead.verification_score === 2
                  ? 'text-status-amber border-status-amber/40 bg-status-amber/10'
                  : 'text-status-red border-status-red/40 bg-status-red/10'
              }`}>
                VERIFIED {lead.verification_score}/3
              </span>
            )}
            {lead.eligibility_risk && (
              <span className="chip text-status-red border-status-red/40 bg-status-red/10">
                ELIG RISK
              </span>
            )}
            {lead.intent_score && (
              <span className="chip text-aqua border-brand/50 bg-brand/[0.12]">
                INTENT {lead.intent_score}/5
              </span>
            )}
            <span className={`chip ${
              lead.urgency === 'hot'
                ? 'text-status-red border-status-red/40 bg-status-red/10'
                : lead.urgency === 'warm'
                ? 'text-status-amber border-status-amber/40 bg-status-amber/10'
                : 'text-aqua border-brand/50 bg-brand/[0.12]'
            }`}>
              {lead.urgency.toUpperCase()}
            </span>
            <span className="chip text-gray-2 border-onyx-line bg-transparent">
              {lead.source.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <LeadStageSelector leadId={lead.id} currentStage={lead.status} />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Action buttons + Timeline (client section) */}
        <LeadClientSection
          leadId={lead.id}
          contactId={contact?.id}
          phone={contact?.phone}
          contactName={contact?.full_name}
          linkedinUrl={contact?.linkedin_url}
          timelineItems={timelineItems}
        />

        {/* Right column: Details */}
        <div className="space-y-4">
          {/* Lead details card */}
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <h3 className="text-sm font-display font-bold text-white mb-3">Lead Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-2">Deal Type</dt>
                <dd className="text-white font-medium">{lead.deal_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Residency</dt>
                <dd className="text-white font-medium">{lead.residency_status ?? '—'}</dd>
              </div>
              {(lead.budget_min || lead.budget_max) && (
                <div className="flex justify-between">
                  <dt className="text-gray-2">Budget</dt>
                  <dd className="text-white font-medium">
                    {lead.budget_min ? `$${(lead.budget_min / 1000).toFixed(0)}K` : '—'}
                    {' – '}
                    {lead.budget_max ? `$${(lead.budget_max / 1000000).toFixed(1)}M` : '—'}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-2">Timeline</dt>
                <dd className="text-white font-medium">
                  {lead.timeline_declared?.replace(/_/g, ' ') ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Created</dt>
                <dd className="text-white">
                  {new Date(lead.created_at).toLocaleDateString('en-SG', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Buyer requirements */}
          {buyerRequirements && (
            <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
              <h3 className="text-sm font-display font-bold text-white mb-3">Buyer Requirements</h3>
              <dl className="space-y-2 text-sm">
                {buyerRequirements.districts?.length > 0 && (
                  <div>
                    <dt className="text-gray-2">Districts</dt>
                    <dd className="text-white mt-0.5">{buyerRequirements.districts.join(', ')}</dd>
                  </div>
                )}
                {buyerRequirements.property_types?.length > 0 && (
                  <div>
                    <dt className="text-gray-2">Property Types</dt>
                    <dd className="text-white mt-0.5">{buyerRequirements.property_types.join(', ')}</dd>
                  </div>
                )}
                {buyerRequirements.bedrooms_min && (
                  <div className="flex justify-between">
                    <dt className="text-gray-2">Min Bedrooms</dt>
                    <dd className="text-white">{buyerRequirements.bedrooms_min}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {lead.pre_viewing_checklist && (
            <QualificationChecklist checklist={lead.pre_viewing_checklist} />
          )}

          {scheduledViewing && (
            <ViewingPrepCard insights={viewingListingInsights} listingAddress={viewingListingAddress} />
          )}

          {(buyerFit.fit_signals.length > 0 || buyerFit.watchouts.length > 0) && (
            <BuyerFitPanel fitSignals={buyerFit.fit_signals} watchouts={buyerFit.watchouts} />
          )}

          {/* Viewings */}
          {viewings.length > 0 && (
            <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
              <h3 className="text-sm font-display font-bold text-white mb-3">Viewings</h3>
              <div className="space-y-2">
                {viewings.map((v: { id: string; scheduled_at: string; status: string }) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-white">
                      {new Date(v.scheduled_at).toLocaleDateString('en-SG', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className={`chip ${
                      v.status === 'scheduled'
                        ? 'text-aqua border-brand/50 bg-brand/[0.12]'
                        : v.status === 'completed'
                        ? 'text-status-green border-status-green/40 bg-status-green/10'
                        : 'text-gray-2 border-onyx-line bg-transparent'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
              <h3 className="text-sm font-display font-bold text-white mb-3">Tasks</h3>
              <div className="space-y-2">
                {tasks.map((t: { id: string; title: string; due_at: string; completed_at: string | null; priority: string }) => (
                  <div key={t.id} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 ${t.completed_at ? 'text-status-green' : 'text-gray-2/40'}`}>
                      {t.completed_at ? '✓' : '○'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${t.completed_at ? 'line-through text-gray-2/60' : 'text-white'}`}>
                        {t.title}
                      </p>
                      <p className="text-[11px] text-gray-2">
                        Due {new Date(t.due_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildTimeline(messages: Array<Record<string, unknown>>) {
  return messages
    .map((msg) => ({
      id: msg.id as string,
      type: msg.channel as string,
      direction: msg.direction as string,
      body: msg.body as string,
      media_url: msg.media_url as string | null,
      timestamp: msg.sent_at as string,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
