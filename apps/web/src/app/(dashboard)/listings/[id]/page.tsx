import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ListingStatus } from '@propagent/shared';
import { AreaInsightCard } from '@/components/insights/area-insight-card';
import { SellerPitchCard } from '@/components/insights/seller-pitch-card';

const STATUS_STYLES: Record<ListingStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  live: 'bg-green-50 text-green-700',
  under_offer: 'bg-yellow-50 text-yellow-700',
  sold: 'bg-blue-50 text-blue-700',
  rented: 'bg-blue-50 text-blue-700',
  withdrawn: 'bg-red-50 text-red-700',
};

function formatPrice(price: number | null): string {
  if (!price) return '—';
  return `$${price.toLocaleString('en-SG')}`;
}

function daysOnMarket(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

interface ListingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();

  if (!listing) {
    notFound();
  }

  // Fetch performance metrics
  const [{ count: enquiryCount }, { count: viewingCount }, { count: matchedBuyersCount }] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id),
    supabase
      .from('viewings')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id)
      .eq('status', 'scheduled'),
    supabase
      .from('buyer_requirements')
      .select('*', { count: 'exact', head: true })
      .contains('districts', [listing.district])
      .contains('property_types', [listing.property_type])
      .or(
        listing.listing_type === 'sale'
          ? `budget_min.lte.${listing.asking_price},budget_max.gte.${listing.asking_price}`
          : `budget_min.lte.${listing.asking_rental},budget_max.gte.${listing.asking_rental}`
      ),
  ]);

  const price = listing.listing_type === 'sale' ? listing.asking_price : listing.asking_rental;
  const psf = listing.asking_price && listing.floor_area_sqft
    ? Math.round(listing.asking_price / listing.floor_area_sqft)
    : null;
  const days = daysOnMarket(listing.created_at);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{listing.address}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[listing.listing_status as ListingStatus]}`}>
              {listing.listing_status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">
            {listing.district} · {listing.property_type.toUpperCase()}
            {listing.hdb_type ? ` · ${listing.hdb_type}` : ''}
            {' · '}
            {listing.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
          </p>
        </div>
        <Link
          href={`/listings/${id}/edit`}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Edit
        </Link>
      </div>

      {/* Photo Gallery */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {listing.media_urls && listing.media_urls.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
            {listing.media_urls.map((url: string, idx: number) => (
              <div key={idx} className={`aspect-[4/3] ${idx === 0 ? 'col-span-2 row-span-2' : ''}`}>
                <img
                  src={url}
                  alt={`${listing.address} photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <p className="text-sm mt-2">No photos uploaded</p>
            </div>
          </div>
        )}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">
            {listing.listing_type === 'sale' ? 'Asking Price' : 'Asking Rental'}
          </p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {formatPrice(price)}
            {listing.listing_type === 'rental' && price ? '/mo' : ''}
          </p>
        </div>
        {listing.listing_type === 'sale' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500">PSF</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {psf ? `$${psf.toLocaleString('en-SG')}` : '—'}
            </p>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Floor Area</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {listing.floor_area_sqft.toLocaleString('en-SG')} sqft
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Tenure</p>
          <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
            {listing.tenure}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">District</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {listing.district}
          </p>
        </div>
      </div>

      {/* Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Performance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{enquiryCount ?? 0}</p>
            <p className="text-xs text-gray-500">Total Enquiries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{viewingCount ?? 0}</p>
            <p className="text-xs text-gray-500">Viewings Scheduled</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{days}</p>
            <p className="text-xs text-gray-500">Days on Market</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-600">{matchedBuyersCount ?? 0}</p>
            <p className="text-xs text-gray-500">Matched Buyers</p>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Property Details</h2>
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Postal Code</dt>
            <dd className="font-medium text-gray-900">{listing.postal_code}</dd>
          </div>
          {listing.floor && (
            <div>
              <dt className="text-gray-500">Floor</dt>
              <dd className="font-medium text-gray-900">{listing.floor}</dd>
            </div>
          )}
          {listing.unit_number && (
            <div>
              <dt className="text-gray-500">Unit</dt>
              <dd className="font-medium text-gray-900">{listing.unit_number}</dd>
            </div>
          )}
          {listing.completion_year && (
            <div>
              <dt className="text-gray-500">Completion Year</dt>
              <dd className="font-medium text-gray-900">{listing.completion_year}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Exclusive</dt>
            <dd className="font-medium text-gray-900">
              {listing.is_exclusive ? 'Yes' : 'No'}
              {listing.is_exclusive && listing.exclusivity_expiry && (
                <span className="text-gray-500 ml-1">
                  (until {new Date(listing.exclusivity_expiry).toLocaleDateString('en-SG')})
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Description</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{listing.description}</p>
        </div>
      )}

      {/* Area Insight */}
      <AreaInsightCard listingId={listing.id} insights={listing.area_insights} />

      {/* Seller Pitch */}
      <SellerPitchCard insights={listing.area_insights} />
    </div>
  );
}
