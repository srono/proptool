import { ListingForm } from '@/components/listings/listing-form';

export default function NewListingPage() {
  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Listing</h1>
        <p className="text-sm text-gray-600">Create a new property listing</p>
      </div>

      <ListingForm />
    </div>
  );
}
