import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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
    <div className="p-4 lg:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lead Inbox</h1>
          <p className="text-sm text-gray-600">New leads awaiting action</p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add Lead
        </Link>
      </div>

      {/* Lead list */}
      <div className="space-y-2">
        {leads && leads.length > 0 ? (
          leads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lead.contact?.full_name ?? 'Unknown'}
                      </p>
                      {lead.eligibility_risk && (
                        <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                          🔴 Eligibility
                        </span>
                      )}
                      {lead.verification_score && (
                        <span className="text-xs">
                          {lead.verification_score === 3 ? '🟢' : lead.verification_score === 2 ? '🟡' : '🔴'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lead.contact?.phone} · {lead.source.replace('_', ' ')} · {lead.deal_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                    </span>
                    {lead.intent_score && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Intent: {lead.intent_score}/5
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium text-sm">No leads yet</p>
            <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
              Connect your Facebook Page or add your first lead manually to get started.
            </p>
            <Link
              href="/leads/new"
              className="inline-flex items-center mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              + Add First Lead
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
