import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ListingForm } from '@/components/listings/listing-form';

interface EditListingPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: EditListingPageProps) {
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

  return (
    <div className="p-4 lg:p-7 space-y-5">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Edit Listing</h1>
        <p className="text-[13px] text-gray-2 mt-1">{listing.address}</p>
      </div>

      <ListingForm initialData={listing} />
    </div>
  );
}
