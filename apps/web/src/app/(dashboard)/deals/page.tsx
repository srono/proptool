import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  negotiating: 'bg-yellow-50 text-yellow-700',
  otp_issued: 'bg-blue-50 text-blue-700',
  otp_signed: 'bg-blue-50 text-blue-700',
  exercised: 'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
  fallen_through: 'bg-red-50 text-red-700',
};

function formatCurrency(amount: number | null) {
  if (!amount) return '—';
  return `$${amount.toLocaleString('en-SG')}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = 'active' } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('deals')
    .select(`
      *,
      lead:leads(
        id,
        deal_type,
        contact:contacts(full_name, phone, email)
      ),
      listing:listings(id, address, district)
    `)
    .order('created_at', { ascending: false });

  if (filter === 'completed') {
    query = query.eq('status', 'completed');
  } else if (filter === 'fallen') {
    query = query.eq('status', 'fallen_through');
  } else {
    query = query.not('status', 'in', '("completed","fallen_through")');
  }

  const { data: deals } = await query.limit(50);

  return (
    <div className="p-4 lg:p-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-600">Track your transactions and commissions</p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Deal
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
          { key: 'fallen', label: 'Fallen Through' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/deals?filter=${tab.key}`}
            className={`flex-1 text-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Deal cards */}
      <div className="space-y-3">
        {deals && deals.length > 0 ? (
          deals.map((deal) => {
            const contact = Array.isArray(deal.lead?.contact)
              ? deal.lead.contact[0]
              : deal.lead?.contact;
            return (
              <Link key={deal.id} href={`/deals/${deal.id}`}>
                <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contact?.full_name ?? 'Unknown'}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            STATUS_COLORS[deal.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {formatStatus(deal.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {deal.deal_type?.replace(/_/g, ' ')} ·{' '}
                        {deal.listing?.address ?? 'No listing linked'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(deal.agreed_price)}
                      </p>
                      {deal.commission_amount && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Comm: {formatCurrency(deal.commission_amount)}
                        </p>
                      )}
                    </div>
                  </div>
                  {deal.completion_date && (
                    <p className="text-xs text-gray-400 mt-2">
                      Completion:{' '}
                      {new Date(deal.completion_date).toLocaleDateString('en-SG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-sm">No deals found</p>
            <p className="text-gray-400 text-xs mt-1">
              Create a deal when a lead reaches the negotiation stage
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
