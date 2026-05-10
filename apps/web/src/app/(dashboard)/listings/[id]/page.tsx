import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ListingStatus } from '@agentos/shared';
import type { Metadata } from 'next';
import { AreaInsightHero } from '@/components/insights/area-insight-hero';
import { MatchedBuyersCard } from '@/components/insights/matched-buyers-card';
import { PerformanceCard } from '@/components/insights/performance-card';
import { MarketingSection } from '@/components/listings/marketing-section';
import { MapNavigationLinks } from '@/components/listings/map-navigation-links';

interface ListingDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from('listings')
    .select('title')
    .eq('id', id)
    .single();
  return { title: listing?.title ? `${listing.title} – Listing` : 'Listing Detail' };
}

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

  const [{ count: enquiryCount }, { count: viewingCount }, { count: matchedBuyersCount }, { count: marketingAssetsCount }] = await Promise.all([
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
    supabase
      .from('listing_marketing_assets')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', id),
  ]);

  const price = listing.listing_type === 'sale' ? listing.asking_price : listing.asking_rental;
  const psf = listing.asking_price && listing.floor_area_sqft
    ? Math.round(listing.asking_price / listing.floor_area_sqft)
    : null;
  const daysOnMarket = Math.floor(
    (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Page bar */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
              {listing.address}
            </h1>
            <MapNavigationLinks
              address={listing.address}
              postalCode={listing.postal_code}
            />
          </div>
          <p className="text-[13px] text-gray-2 mt-1">
            {listing.district} · {listing.property_type.toUpperCase()} ·{' '}
            {listing.tenure} · {listing.floor_area_sqft} sqft
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost text-xs">Share</button>
          <Link href={`/listings/${id}/edit`} className="btn-ghost text-xs">
            Edit
          </Link>
          <button className="btn-primary text-xs">Send to buyers</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Photo + price hero */}
          <div className="relative rounded-2xl overflow-hidden h-[280px] bg-gradient-to-br from-[#2a3850] to-[#0e1a2c]">
            {listing.media_urls && listing.media_urls.length > 0 ? (
              <img
                src={listing.media_urls[0]}
                alt={listing.address}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 opacity-30">
                  <rect width="100" height="60" fill="#1a2540" />
                  {Array.from({ length: 7 }).map((_, i) => (
                    <rect key={i} x={5 + i * 13} y={20 + (i % 3) * 4} width="9" height="40" fill="#1a2540" stroke="#2a3a5a" strokeWidth="0.2" />
                  ))}
                </svg>
              </div>
            )}
            {/* Status chips */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`chip ${STATUS_STYLES[listing.listing_status as ListingStatus]}`}>
                {listing.listing_status.replace('_', ' ')}
              </span>
              <span className="chip text-gray-2 border-onyx-line bg-onyx-card/80">
                {listing.listing_type}
              </span>
            </div>
            {/* Price overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <div className="font-display font-bold text-4xl text-white tracking-tight">
                  {formatPrice(price)}
                </div>
                <div className="text-[13px] text-white/70">
                  {psf ? `S$${psf.toLocaleString('en-SG')} psf` : ''} · {listing.floor_area_sqft} sqft
                </div>
              </div>
              {listing.media_urls && listing.media_urls.length > 1 && (
                <button className="btn-primary text-xs">
                  +{listing.media_urls.length} photos
                </button>
              )}
            </div>
          </div>

          {/* Area Insight — hero, not buried (distinctive moment #2) */}
          <AreaInsightHero
            listingId={listing.id}
            insights={listing.area_insights}
            district={listing.district}
            askingPsf={psf}
          />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <MarketingSection
            listingId={listing.id}
            listingStatus={listing.listing_status}
            savedAssetsCount={marketingAssetsCount ?? 0}
          />
          <MatchedBuyersCard count={matchedBuyersCount ?? 0} />
          <PerformanceCard
            daysOnMarket={daysOnMarket}
            enquiries={enquiryCount ?? 0}
            viewings={viewingCount ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
