import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata = { title: 'Lead Inbox' };

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      contact:contacts(full_name, phone, email, linkedin_url)
    `)
    .eq('status', 'new_lead')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-4 lg:p-7 space-y-5">
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Lead Inbox</h1>
          <p className="text-[13px] text-gray-2 mt-1">New leads awaiting action</p>
        </div>
        <Link href="/leads/new" className="btn-primary text-xs">
          + Add lead
        </Link>
      </div>

      <div className="space-y-2.5">
        {leads && leads.length > 0 ? (
          leads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <div className="bg-onyx-card border border-onyx-line rounded-2xl p-4 hover:border-brand/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">
                        {lead.contact?.full_name ?? 'Unknown'}
                      </p>
                      {lead.eligibility_risk && (
                        <span className="chip text-status-red border-status-red/40 bg-status-red/10">
                          ELIG WATCH
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-2 mt-0.5">
                      {lead.contact?.phone} · {lead.source.replace('_', ' ')} · {lead.deal_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-gray-2">
                      {new Date(lead.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                    </span>
                    {lead.intent_score && (
                      <p className="text-[11px] text-aqua mt-0.5">
                        Intent: {lead.intent_score}/5
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
            <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-aqua" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
            </div>
            <p className="text-white font-medium text-sm">No leads yet</p>
            <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
              Connect your Facebook Page or add your first lead manually to get started.
            </p>
            <Link href="/leads/new" className="inline-flex items-center mt-4 btn-primary text-xs">
              + Add first lead
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
