import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ListingsClientShell } from '@/components/listings/listings-client-shell';
import { PageHeader } from '@/components/ui/page-header';
import type { ListingWithSeller } from '@agentos/shared';

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
    .select('*, seller_contact:contacts!seller_contact_id(id, full_name, phone)')
    .order('created_at', { ascending: false });

  if (activeTab === 'sale') {
    query = query.eq('listing_type', 'sale');
  } else if (activeTab === 'rental') {
    query = query.eq('listing_type', 'rental');
  } else if (activeTab === 'draft') {
    query = query.eq('listing_status', 'draft');
  }

  const { data: listings, error } = await query;

  // Fallback: if the seller_contact join fails (e.g. migration not yet applied),
  // retry without the join so listings still display.
  if (error) {
    console.error('[ListingsPage] Query error (likely missing seller_contact_id column):', error.message);

    let fallbackQuery = supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeTab === 'sale') {
      fallbackQuery = fallbackQuery.eq('listing_type', 'sale');
    } else if (activeTab === 'rental') {
      fallbackQuery = fallbackQuery.eq('listing_type', 'rental');
    } else if (activeTab === 'draft') {
      fallbackQuery = fallbackQuery.eq('listing_status', 'draft');
    }

    const { data: fallbackListings } = await fallbackQuery;
    const withSeller = (fallbackListings ?? []).map((l) => ({ ...l, seller_contact: null }));

    return (
      <div className="p-4 lg:p-7 space-y-5">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Listings' },
          ]}
          title="Listings"
        />
        <div className="flex items-end justify-between border-b border-onyx-line pb-5">
          <div>
            <p className="text-[13px] text-gray-2 mt-1">Manage your properties</p>
          </div>
          <Link href="/listings/new" className="btn-primary text-xs">
            + New listing
          </Link>
        </div>
        <ListingsClientShell listings={withSeller as ListingWithSeller[]} activeTab={activeTab} />
      </div>
    );
  }

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
      <ListingsClientShell listings={(listings ?? []) as ListingWithSeller[]} activeTab={activeTab} />
    </div>
  );
}
