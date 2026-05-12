import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getContact } from '@/lib/services/contact-service';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from('contacts')
    .select('full_name')
    .eq('id', id)
    .single();
  return { title: contact?.full_name ? `${contact.full_name} – Contact` : 'Contact Profile' };
}

// --- Helper functions ---

const STATUS_COLORS: Record<string, string> = {
  active: 'text-status-green border-status-green/40 bg-status-green/10',
  inactive: 'text-gray-2 border-onyx-line bg-transparent',
  archived: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  do_not_contact: 'text-status-red border-status-red/40 bg-status-red/10',
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  new_lead: 'text-aqua border-brand/50 bg-brand/[0.12]',
  contacted: 'text-aqua border-brand/50 bg-brand/[0.12]',
  qualified: 'text-status-green border-status-green/40 bg-status-green/10',
  viewing_booked: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  viewing_done: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  negotiating: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  otp_loi_issued: 'text-brand border-brand/50 bg-brand/[0.12]',
  closed_won: 'text-status-green border-status-green/40 bg-status-green/10',
  closed_lost: 'text-status-red border-status-red/40 bg-status-red/10',
  nurture: 'text-gray-2 border-onyx-line bg-transparent',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatStatus(status: string | undefined | null) {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return `$${amount.toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;
}

export default async function ContactProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 9.1 Fetch contact with all linked data
  let contact;
  try {
    contact = await getContact(supabase, id);
  } catch {
    notFound();
  }

  // Fetch primary agent name if assigned
  let primaryAgentName: string | null = null;
  if (contact.primary_agent_id) {
    const { data: agent } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', contact.primary_agent_id)
      .single();
    primaryAgentName = agent?.full_name ?? null;
  }

  // Fetch all deals across all leads
  const leadIds = contact.leads.map((l) => l.id);
  let deals: Array<{
    id: string;
    lead_id: string;
    deal_type: string;
    status: string;
    agreed_price: number | null;
    commission_amount: number | null;
    created_at: string;
  }> = [];
  if (leadIds.length > 0) {
    const { data: dealsData } = await supabase
      .from('deals')
      .select('id, lead_id, deal_type, status, agreed_price, commission_amount, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false });
    deals = dealsData ?? [];
  }

  // Fetch all messages for this contact
  const { data: messagesData } = await supabase
    .from('messages')
    .select('id, lead_id, direction, channel, body, media_url, sent_at')
    .eq('contact_id', id)
    .neq('channel', 'note')
    .order('sent_at', { ascending: false });
  const messages = messagesData ?? [];

  return (
    <div className="p-4 lg:p-7 space-y-5 max-w-5xl mx-auto">
      {/* 9.2 Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-onyx-line pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
              {contact.full_name}
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                STATUS_COLORS[contact.contact_status] ?? 'text-gray-2 border-onyx-line bg-transparent'
              }`}
            >
              {formatStatus(contact.contact_status)}
            </span>
          </div>
          <p className="text-[13px] text-gray-2 mt-1">
            {contact.phone}
            {contact.email ? ` · ${contact.email}` : ''}
          </p>
          {primaryAgentName && (
            <p className="text-[13px] text-gray-2 mt-0.5">
              Agent: <span className="text-white">{primaryAgentName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Leads, Deals, Messages */}
        <div className="lg:col-span-2 space-y-5">
          {/* 9.5 Leads List */}
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <h2 className="text-sm font-display font-bold text-white mb-3">
              Leads ({contact.leads.length})
            </h2>
            {contact.leads.length > 0 ? (
              <div className="space-y-2">
                {contact.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-onyx-line hover:border-brand/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">
                        {lead.lead_title ?? `${formatStatus(lead.lead_category)} – ${formatStatus(lead.deal_type)}`}
                      </p>
                      <p className="text-[11px] text-gray-2 mt-0.5">
                        Opened {formatDate(lead.opened_at ?? lead.created_at)}
                        {lead.closed_at ? ` · Closed ${formatDate(lead.closed_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[11px] text-gray-2">
                        {formatStatus(lead.lead_category)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          LEAD_STATUS_COLORS[lead.status] ?? 'text-gray-2 border-onyx-line bg-transparent'
                        }`}
                      >
                        {formatStatus(lead.status)}
                      </span>
                      {!lead.is_active && (
                        <span className="text-[10px] text-gray-2 border border-onyx-line rounded px-1">
                          Closed
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-2">No leads linked to this contact</p>
            )}
          </div>

          {/* 9.6 Deals Summary */}
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <h2 className="text-sm font-display font-bold text-white mb-3">
              Deals ({deals.length})
            </h2>
            {deals.length > 0 ? (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-onyx-line hover:border-brand/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium">
                        {formatStatus(deal.deal_type)}
                      </p>
                      <p className="text-[11px] text-gray-2 mt-0.5">
                        {formatDate(deal.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-sm text-white font-medium">
                        {formatCurrency(deal.agreed_price)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          deal.status === 'completed'
                            ? 'text-status-green border-status-green/40 bg-status-green/10'
                            : deal.status === 'fallen_through'
                            ? 'text-status-red border-status-red/40 bg-status-red/10'
                            : 'text-status-amber border-status-amber/40 bg-status-amber/10'
                        }`}
                      >
                        {formatStatus(deal.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-2">No deals yet</p>
            )}
          </div>

          {/* 9.7 Messages Timeline */}
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-display font-bold text-white">
                Messages ({messages.length})
              </h2>
              {/* Lead filter info — full filtering requires client component, showing all for now */}
              {contact.leads.length > 0 && (
                <span className="text-[11px] text-gray-2">All leads</span>
              )}
            </div>
            {messages.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.slice(0, 50).map((msg) => {
                  const leadLabel = msg.lead_id
                    ? contact.leads.find((l) => l.id === msg.lead_id)?.lead_title ??
                      contact.leads.find((l) => l.id === msg.lead_id)?.lead_category ??
                      'Lead'
                    : null;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 text-sm ${
                        msg.direction === 'inbound' ? '' : 'flex-row-reverse'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 ${
                          msg.direction === 'inbound'
                            ? 'bg-onyx-raised text-white'
                            : 'bg-brand/[0.12] text-white'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.body}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-2">
                            {new Date(msg.sent_at).toLocaleString('en-SG', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] text-gray-2 uppercase">
                            {msg.channel}
                          </span>
                          {leadLabel && (
                            <span className="text-[10px] text-aqua">
                              {formatStatus(leadLabel)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length > 50 && (
                  <p className="text-[11px] text-gray-2 text-center pt-2">
                    Showing 50 of {messages.length} messages
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-2">No messages yet</p>
            )}
          </div>
        </div>

        {/* Right column: Identity, Consent, Relationship */}
        <div className="space-y-4">
          {/* 9.3 Identity Panel */}
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <h3 className="text-sm font-display font-bold text-white mb-3">Identity</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-2">Nationality</dt>
                <dd className="text-white">{contact.nationality ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">PR Status</dt>
                <dd className="text-white">{contact.pr_status ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Channel Preference</dt>
                <dd className="text-white">
                  {contact.channel_preference
                    ? formatStatus(contact.channel_preference)
                    : '—'}
                </dd>
              </div>
              {contact.linkedin_url && (
                <div className="flex justify-between">
                  <dt className="text-gray-2">LinkedIn</dt>
                  <dd>
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-aqua hover:underline text-sm truncate max-w-[140px] inline-block"
                    >
                      Profile ↗
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* 9.4 Consent Panel */}
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <h3 className="text-sm font-display font-bold text-white mb-3">Consent & PDPA</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-2">WhatsApp Opt-in</dt>
                <dd>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                      contact.whatsapp_optin
                        ? 'text-status-green border-status-green/40 bg-status-green/10'
                        : 'text-status-red border-status-red/40 bg-status-red/10'
                    }`}
                  >
                    {contact.whatsapp_optin ? 'Yes' : 'No'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Consent Given</dt>
                <dd className="text-white">{formatDate(contact.consent_given_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Source</dt>
                <dd className="text-white">
                  {contact.consent_source ? formatStatus(contact.consent_source) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Retention Expiry</dt>
                <dd className="text-white">{formatDate(contact.data_retention_expiry)}</dd>
              </div>
            </dl>
          </div>

          {/* 9.8 Relationship Section */}
          <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4">
            <h3 className="text-sm font-display font-bold text-white mb-3">Relationship</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-2 mb-1">Tags</dt>
                <dd>
                  {contact.relationship_tags && contact.relationship_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {contact.relationship_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-brand/[0.12] text-aqua border border-brand/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-2">No tags</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">First Source</dt>
                <dd className="text-white">
                  {contact.source_first ? formatStatus(contact.source_first) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Latest Source</dt>
                <dd className="text-white">
                  {contact.source_latest ? formatStatus(contact.source_latest) : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Last Contacted</dt>
                <dd className="text-white">{formatDate(contact.last_contacted_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Last Inbound</dt>
                <dd className="text-white">{formatDate(contact.last_inbound_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-2">Created</dt>
                <dd className="text-white">{formatDate(contact.created_at)}</dd>
              </div>
            </dl>
            {/* Long-term notes placeholder — notes stored in relationship context */}
            <div className="mt-3 pt-3 border-t border-onyx-line">
              <p className="text-xs text-gray-2 mb-1">Notes</p>
              <p className="text-sm text-gray-2">
                {contact.leads.some((l) => l.notes)
                  ? contact.leads
                      .filter((l) => l.notes)
                      .map((l) => l.notes)
                      .join(' · ')
                  : 'No notes'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
