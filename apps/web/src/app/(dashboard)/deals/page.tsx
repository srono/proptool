import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Deals' };

const STATUS_COLORS: Record<string, string> = {
  negotiating: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  otp_issued: 'text-aqua border-brand/50 bg-brand/[0.12]',
  otp_signed: 'text-aqua border-brand/50 bg-brand/[0.12]',
  exercised: 'text-aqua border-brand/50 bg-brand/[0.12]',
  completed: 'text-status-green border-status-green/40 bg-status-green/10',
  fallen_through: 'text-status-red border-status-red/40 bg-status-red/10',
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
    <div className="p-4 lg:p-7 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Deals' },
        ]}
        title="Deals"
      />

      {/* Header */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <p className="text-[13px] text-gray-2">Track your transactions and commissions</p>
        </div>
        <Link
          href="/deals/new"
          className="btn-primary"
        >
          + New Deal
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-onyx-card border border-onyx-line rounded-pill p-1">
        {[
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
          { key: 'fallen', label: 'Fallen Through' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/deals?filter=${tab.key}`}
            className={`flex-1 text-center rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-aqua text-onyx'
                : 'text-gray-2 hover:text-white'
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
                <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {contact?.full_name ?? 'Unknown'}
                        </p>
                        <span
                          className={`chip ${
                            STATUS_COLORS[deal.status] ?? 'text-gray-2 border-onyx-line bg-onyx-card'
                          }`}
                        >
                          {formatStatus(deal.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-2 mt-1">
                        {deal.deal_type?.replace(/_/g, ' ')} ·{' '}
                        {deal.listing?.address ?? 'No listing linked'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(deal.agreed_price)}
                      </p>
                      {deal.commission_amount && (
                        <p className="text-xs text-status-green mt-0.5">
                          Comm: {formatCurrency(deal.commission_amount)}
                        </p>
                      )}
                    </div>
                  </div>
                  {deal.completion_date && (
                    <p className="text-xs text-gray-2 mt-2">
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
          <div className="text-center py-12 bg-onyx-card rounded-2xl border border-onyx-line">
            <p className="text-gray-2 text-sm">No deals found</p>
            <p className="text-gray-2 text-xs mt-1">
              Create a deal when a lead reaches the negotiation stage
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
