import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getSavedRecords } from '@/lib/ai/saved-records-query';
import { AdCopyClientShell } from '@/components/ad-copy/ad-copy-client-shell';

interface Props {
  params: Promise<{ listingId: string }>;
}

export default async function AdCopyAssistantByListingPage({ params }: Props) {
  const { listingId } = await params;
  const supabase = await createClient();

  // Load listing data with all fields needed for generation
  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id, tenant_id, address, postal_code, district, property_type, listing_type, asking_price, asking_rental, floor_area_sqft, tenure, completion_year, description, listing_status'
    )
    .eq('id', listingId)
    .single();

  if (!listing) {
    notFound();
  }

  // Load user profile (agent info) and tenant config in parallel
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const [{ data: profile }, { data: tenant }, savedRecords] = await Promise.all([
    supabase
      .from('users')
      .select('tenant_id, full_name, phone, cea_licence_number')
      .eq('id', user.id)
      .single(),
    supabase
      .from('tenants')
      .select('id, cea_registration_number, settings_json')
      .eq('id', listing.tenant_id)
      .single(),
    getSavedRecords(supabase, listingId),
  ]);

  // Verify user belongs to the same tenant as the listing
  if (!profile || profile.tenant_id !== listing.tenant_id) {
    notFound();
  }

  return (
    <div className="p-4 lg:p-7">
      <AdCopyClientShell
        listing={listing}
        agentProfile={{
          full_name: profile.full_name,
          phone: profile.phone,
          cea_licence_number: profile.cea_licence_number,
        }}
        tenantConfig={{
          id: tenant?.id ?? listing.tenant_id,
          cea_registration_number: tenant?.cea_registration_number ?? null,
          settings_json: tenant?.settings_json ?? null,
        }}
        savedRecords={savedRecords}
      />
    </div>
  );
}
