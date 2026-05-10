import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ListingsClientShell } from '@/components/listings/listings-client-shell';

export const metadata = { title: 'Listings' };

interface ListingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const { tab } = await searchParams;
  const activeTab = tab ?? 'all';
  const supabase = await createClient();

  let query = supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeTab === 'sale') {
    query = query.eq('listing_type', 'sale');
  } else if (activeTab === 'rental') {
    query = query.eq('listing_type', 'rental');
  } else if (activeTab === 'draft') {
    query = query.eq('listing_status', 'draft');
  }

  const { data: listings } = await query;

  const tabs: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sale', label: 'Sale' },
    { key: 'rental', label: 'Rental' },
    { key: 'draft', label: 'Draft' },
  ];

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            Listings
          </h1>
          <p className="text-[13px] text-gray-2 mt-1">Manage your properties</p>
        </div>
        <Link href="/listings/new" className="btn-primary text-xs">
          + New listing
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-onyx-card border border-onyx-line rounded-pill p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'all' ? '/listings' : `/listings?tab=${t.key}`}
            className={`flex-1 text-center rounded-pill px-3 py-1.5 text-[11px] font-display font-bold tracking-wider transition-colors ${
              activeTab === t.key
                ? 'bg-aqua text-onyx'
                : 'text-gray-2 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Client shell with view toggle, filters, table/card grid */}
      <ListingsClientShell listings={listings ?? []} activeTab={activeTab} />
    </div>
  );
}
