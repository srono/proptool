import { ListingForm } from '@/components/listings/listing-form';

export default function NewListingPage() {
  return (
    <div className="p-4 lg:p-7 space-y-5">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">New Listing</h1>
        <p className="text-[13px] text-gray-2 mt-1">Create a new property listing</p>
      </div>

      <ListingForm />
    </div>
  );
}
