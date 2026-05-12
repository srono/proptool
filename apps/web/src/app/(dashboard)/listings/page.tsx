import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ListingsClientShell } from '@/components/listings/listings-client-shell';
import { PageHeader } from '@/components/ui/page-header';

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

  return (
    <div className="p-4 lg:p-7 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Listings' },
        ]}
        title="Listings"
      />

      {/* Header */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <p className="text-[13px] text-gray-2 mt-1">Manage your properties</p>
        </div>
        <Link href="/listings/new" className="btn-primary text-xs">
          + New listing
        </Link>
      </div>

      {/* Client shell with tab switcher, view toggle, filters, table/card grid */}
      <ListingsClientShell listings={listings ?? []} activeTab={activeTab} />
    </div>
  );
}
