import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PIPELINE_STAGES } from '@propagent/shared';
import { LeadStageSelector } from './lead-stage-selector';
import { ActionButtons } from './action-buttons';
import { Timeline } from './timeline';
import { QualificationChecklist } from './qualification-checklist';
import { ViewingPrepCard } from '@/components/insights/viewing-prep-card';
import { BuyerFitPanel } from '@/components/insights/buyer-fit-panel';
import { generateBuyerFitSignals } from '@/lib/insights/generate';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch lead with related data
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

  // Fetch listing insights for viewing prep (if there's a scheduled viewing)
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

  // Compute buyer fit signals if buyer requirements exist
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

  // Build timeline items from messages and notes
  const timelineItems = buildTimeline(messages);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {contact?.full_name ?? 'Unknown Contact'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contact?.phone} {contact?.email ? `· ${contact.email}` : ''}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Verification score badge */}
            {lead.verification_score && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                lead.verification_score === 3
                  ? 'bg-green-50 text-green-700'
                  : lead.verification_score === 2
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {lead.verification_score === 3 ? '🟢' : lead.verification_score === 2 ? '🟡' : '🔴'}{' '}
                Verified ({lead.verification_score}/3)
              </span>
            )}

            {/* Eligibility risk badge */}
            {lead.eligibility_risk && (
              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                🔴 Eligibility
              </span>
            )}

            {/* Intent score */}
            {lead.intent_score && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Intent: {lead.intent_score}/5
              </span>
            )}

            {/* Urgency */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              lead.urgency === 'hot'
                ? 'bg-red-50 text-red-700'
                : lead.urgency === 'warm'
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {lead.urgency === 'hot' ? '🔴' : lead.urgency === 'warm' ? '🟡' : '🔵'}{' '}
              {lead.urgency.charAt(0).toUpperCase() + lead.urgency.slice(1)}
            </span>

            {/* Source */}
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {lead.source.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Stage selector */}
        <LeadStageSelector leadId={lead.id} currentStage={lead.status} />
      </div>

      {/* Action buttons */}
      <ActionButtons
        phone={contact?.phone}
        contactName={contact?.full_name}
        leadId={lead.id}
        linkedinUrl={contact?.linkedin_url}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Timeline items={timelineItems} />
        </div>

        {/* Right column: Details */}
        <div className="space-y-4">
          {/* Lead details card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Lead Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Deal Type</dt>
                <dd className="text-gray-900 font-medium">{lead.deal_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Residency</dt>
                <dd className="text-gray-900 font-medium">{lead.residency_status ?? '—'}</dd>
              </div>
              {(lead.budget_min || lead.budget_max) && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Budget</dt>
                  <dd className="text-gray-900 font-medium">
                    {lead.budget_min ? `$${(lead.budget_min / 1000).toFixed(0)}K` : '—'}
                    {' – '}
                    {lead.budget_max ? `$${(lead.budget_max / 1000000).toFixed(1)}M` : '—'}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Timeline</dt>
                <dd className="text-gray-900 font-medium">
                  {lead.timeline_declared?.replace(/_/g, ' ') ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">
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
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Buyer Requirements</h3>
              <dl className="space-y-2 text-sm">
                {buyerRequirements.districts?.length > 0 && (
                  <div>
                    <dt className="text-gray-500">Districts</dt>
                    <dd className="text-gray-900 mt-0.5">
                      {buyerRequirements.districts.join(', ')}
                    </dd>
                  </div>
                )}
                {buyerRequirements.property_types?.length > 0 && (
                  <div>
                    <dt className="text-gray-500">Property Types</dt>
                    <dd className="text-gray-900 mt-0.5">
                      {buyerRequirements.property_types.join(', ')}
                    </dd>
                  </div>
                )}
                {buyerRequirements.bedrooms_min && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Min Bedrooms</dt>
                    <dd className="text-gray-900">{buyerRequirements.bedrooms_min}</dd>
                  </div>
                )}
                {buyerRequirements.min_sqft && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Min Size</dt>
                    <dd className="text-gray-900">{buyerRequirements.min_sqft} sqft</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Pre-viewing qualification checklist */}
          {lead.pre_viewing_checklist && (
            <QualificationChecklist checklist={lead.pre_viewing_checklist} />
          )}

          {/* Viewing Prep (from listing insights) */}
          {scheduledViewing && (
            <ViewingPrepCard insights={viewingListingInsights} listingAddress={viewingListingAddress} />
          )}

          {/* Buyer Fit */}
          {(buyerFit.fit_signals.length > 0 || buyerFit.watchouts.length > 0) && (
            <BuyerFitPanel fitSignals={buyerFit.fit_signals} watchouts={buyerFit.watchouts} />
          )}

          {/* Upcoming viewings */}
          {viewings.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Viewings</h3>
              <div className="space-y-2">
                {viewings.map((v: { id: string; scheduled_at: string; status: string }) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {new Date(v.scheduled_at).toLocaleDateString('en-SG', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      v.status === 'scheduled'
                        ? 'bg-blue-50 text-blue-700'
                        : v.status === 'completed'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-600'
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
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tasks</h3>
              <div className="space-y-2">
                {tasks.map((t: { id: string; title: string; due_at: string; completed_at: string | null; priority: string }) => (
                  <div key={t.id} className="flex items-start gap-2 text-sm">
                    <span className={`mt-0.5 ${t.completed_at ? 'text-green-500' : 'text-gray-300'}`}>
                      {t.completed_at ? '✓' : '○'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${t.completed_at ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-400">
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

// --- Helper ---

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
