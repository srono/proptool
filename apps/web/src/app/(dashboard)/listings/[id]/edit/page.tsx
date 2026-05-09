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
    <div className="p-4 lg:p-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Edit Listing</h1>
        <p className="text-sm text-gray-600">{listing.address}</p>
      </div>

      <ListingForm initialData={listing} />
    </div>
  );
}
