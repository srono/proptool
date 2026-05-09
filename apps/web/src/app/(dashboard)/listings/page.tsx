import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { ListingStatus } from '@propagent/shared';

const STATUS_STYLES: Record<ListingStatus, string> = {
  draft: 'text-gray-2 border-onyx-line bg-transparent',
  live: 'text-status-green border-status-green/40 bg-status-green/10',
  under_offer: 'text-status-amber border-status-amber/40 bg-status-amber/10',
  sold: 'text-aqua border-brand/50 bg-brand/[0.12]',
  rented: 'text-aqua border-brand/50 bg-brand/[0.12]',
  withdrawn: 'text-status-red border-status-red/40 bg-status-red/10',
};

function formatPrice(price: number | null): string {
  if (!price) return '—';
  return `S$${price.toLocaleString('en-SG')}`;
}

function formatPsf(price: number | null, area: number | null): string {
  if (!price || !area || area === 0) return '';
  const psf = Math.round(price / area);
  return `$${psf.toLocaleString('en-SG')} psf`;
}

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

      {/* Listings grid */}
      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((listing) => {
            const firstPhoto = listing.media_urls?.[0];
            const price = listing.listing_type === 'sale' ? listing.asking_price : listing.asking_rental;

            return (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <div className="bg-onyx-card border border-onyx-line rounded-2xl overflow-hidden hover:border-brand/50 transition-colors">
                  {/* Photo */}
                  <div className="aspect-[4/3] bg-onyx-raised relative border-b border-onyx-line">
                    {firstPhoto ? (
                      <img
                        src={firstPhoto}
                        alt={listing.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-2/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}
                    {/* Status badge */}
                    <span className={`absolute top-2 left-2 chip ${STATUS_STYLES[listing.listing_status as ListingStatus]}`}>
                      {listing.listing_status.replace('_', ' ')}
                    </span>
                    {/* Listing type badge */}
                    <span className="absolute top-2 right-2 chip text-gray-2 border-onyx-line bg-onyx-card/80">
                      {listing.listing_type === 'sale' ? 'Sale' : 'Rent'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-3">
                    <p className="text-[11px] font-semibold text-white truncate">
                      {listing.address}
                    </p>
                    <p className="text-[9px] text-gray-2 mt-0.5">
                      {listing.district} · {listing.property_type.toUpperCase()}
                    </p>
                    <div className="mt-2">
                      <span className="text-xs font-bold text-white">
                        {formatPrice(price)}
                        {listing.listing_type === 'rental' && price ? '/mo' : ''}
                      </span>
                      {listing.listing_type === 'sale' && (
                        <span className="text-[9px] text-gray-2 block mt-0.5">
                          {formatPsf(listing.asking_price, listing.floor_area_sqft)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-onyx-card rounded-2xl border border-onyx-line">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-aqua" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <p className="text-white font-medium text-sm">No listings yet</p>
          <p className="text-gray-2 text-xs mt-1 max-w-xs mx-auto">
            Create your first property listing to start matching with buyers and tenants.
          </p>
          <Link
            href="/listings/new"
            className="inline-flex items-center mt-4 btn-primary text-xs"
          >
            + New listing
          </Link>
        </div>
      )}
    </div>
  );
}
