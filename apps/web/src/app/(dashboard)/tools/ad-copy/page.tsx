import { createClient } from '@/lib/supabase/server';
import { ListingPicker } from '@/components/ad-copy/listing-picker';
import type { PickerListing } from '@/lib/ai/listing-picker-filter';

export const metadata = { title: 'Ad Copy Assistant' };

export default async function AdCopyAssistantPage() {
  const supabase = await createClient();

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, address, listing_status, created_at')
    .order('created_at', { ascending: false });

  const pickerListings: PickerListing[] = listings ?? [];
  const loadError = error
    ? 'Failed to load listings. Please try again.'
    : null;

  return (
    <div className="p-4 lg:p-7 space-y-5">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
          Ad Copy Assistant
        </h1>
        <p className="text-[13px] text-gray-2 mt-1">
          Generate compliance-aware ad copy for your listings
        </p>
      </div>

      <ListingPicker listings={pickerListings} error={loadError} />
    </div>
  );
}
