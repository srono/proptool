'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SINGAPORE_DISTRICTS } from '@propagent/shared';
import type { Listing, PropertyType, HdbType, Tenure, ListingType } from '@propagent/shared';

interface Props {
  initialData?: Partial<Listing>;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'hdb', label: 'HDB' },
  { value: 'condo', label: 'Condo' },
  { value: 'landed', label: 'Landed' },
  { value: 'commercial', label: 'Commercial' },
];

const HDB_TYPES: { value: HdbType; label: string }[] = [
  { value: '2room', label: '2 Room' },
  { value: '3room', label: '3 Room' },
  { value: '4room', label: '4 Room' },
  { value: '5room', label: '5 Room' },
  { value: 'executive', label: 'Executive' },
];

const TENURE_OPTIONS: { value: Tenure; label: string }[] = [
  { value: 'freehold', label: 'Freehold' },
  { value: '99yr', label: '99-year Leasehold' },
  { value: '999yr', label: '999-year Leasehold' },
];

export function ListingForm({ initialData }: Props) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [address, setAddress] = useState(initialData?.address ?? '');
  const [postalCode, setPostalCode] = useState(initialData?.postal_code ?? '');
  const [district, setDistrict] = useState(initialData?.district ?? '');
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(initialData?.property_type ?? '');
  const [hdbType, setHdbType] = useState<HdbType | ''>(initialData?.hdb_type ?? '');
  const [tenure, setTenure] = useState<Tenure | ''>(initialData?.tenure ?? '');
  const [floorAreaSqft, setFloorAreaSqft] = useState(initialData?.floor_area_sqft?.toString() ?? '');
  const [askingPrice, setAskingPrice] = useState(initialData?.asking_price?.toString() ?? '');
  const [askingRental, setAskingRental] = useState(initialData?.asking_rental?.toString() ?? '');
  const [listingType, setListingType] = useState<ListingType>(initialData?.listing_type ?? 'sale');
  const [floor, setFloor] = useState(initialData?.floor ?? '');
  const [unitNumber, setUnitNumber] = useState(initialData?.unit_number ?? '');
  const [completionYear, setCompletionYear] = useState(initialData?.completion_year?.toString() ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [isExclusive, setIsExclusive] = useState(initialData?.is_exclusive ?? false);
  const [exclusivityExpiry, setExclusivityExpiry] = useState(initialData?.exclusivity_expiry ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const psf = useMemo(() => {
    const price = parseFloat(askingPrice);
    const area = parseFloat(floorAreaSqft);
    if (!price || !area || area === 0) return null;
    return Math.round(price / area);
  }, [askingPrice, floorAreaSqft]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    if (!propertyType) newErrors.propertyType = 'Property type is required';
    if (!tenure) newErrors.tenure = 'Tenure is required';
    if (!floorAreaSqft || parseFloat(floorAreaSqft) <= 0) newErrors.floorAreaSqft = 'Floor area is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const area = parseFloat(floorAreaSqft);
      const price = askingPrice ? parseFloat(askingPrice) : null;
      const rental = askingRental ? parseFloat(askingRental) : null;
      const computedPsf = price && area ? Math.round(price / area) : null;

      const payload = {
        address: address.trim(),
        postal_code: postalCode.trim(),
        district: district || null,
        property_type: propertyType,
        hdb_type: propertyType === 'hdb' ? hdbType || null : null,
        tenure,
        floor_area_sqft: area,
        asking_price: listingType === 'sale' ? price : null,
        asking_rental: listingType === 'rental' ? rental : null,
        psf: listingType === 'sale' ? computedPsf : null,
        listing_type: listingType,
        listing_status: initialData?.listing_status ?? 'draft',
        floor: floor.trim() || null,
        unit_number: unitNumber.trim() || null,
        completion_year: completionYear ? parseInt(completionYear) : null,
        description: description.trim() || null,
        is_exclusive: isExclusive,
        exclusivity_expiry: isExclusive && exclusivityExpiry ? exclusivityExpiry : null,
      };

      if (isEdit && initialData?.id) {
        const { error } = await supabase
          .from('listings')
          .update(payload)
          .eq('id', initialData.id);

        if (error) {
          console.error('Failed to update listing:', error);
          alert('Failed to update listing. Please try again.');
          return;
        }
      } else {
        const { error } = await supabase.from('listings').insert(payload);

        if (error) {
          console.error('Failed to create listing:', error);
          alert('Failed to create listing. Please try again.');
          return;
        }
      }

      router.push('/listings');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Listing Type */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Listing Type</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setListingType('sale')}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              listingType === 'sale'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sale
          </button>
          <button
            type="button"
            onClick={() => setListingType('rental')}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              listingType === 'rental'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rental
          </button>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Property Details</h2>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 123 Orchard Road #12-34"
            className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          />
          {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code *
            </label>
            <input
              type="text"
              id="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="e.g. 238858"
              maxLength={6}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
            {errors.postalCode && <p className="text-xs text-red-600 mt-1">{errors.postalCode}</p>}
          </div>

          <div>
            <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <select
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="">Select district...</option>
              {SINGAPORE_DISTRICTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
              Property Type *
            </label>
            <select
              id="propertyType"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="">Select type...</option>
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
            {errors.propertyType && <p className="text-xs text-red-600 mt-1">{errors.propertyType}</p>}
          </div>

          {propertyType === 'hdb' && (
            <div>
              <label htmlFor="hdbType" className="block text-sm font-medium text-gray-700 mb-1">
                HDB Type
              </label>
              <select
                id="hdbType"
                value={hdbType}
                onChange={(e) => setHdbType(e.target.value as HdbType)}
                className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="">Select HDB type...</option>
                {HDB_TYPES.map((ht) => (
                  <option key={ht.value} value={ht.value}>
                    {ht.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tenure" className="block text-sm font-medium text-gray-700 mb-1">
              Tenure *
            </label>
            <select
              id="tenure"
              value={tenure}
              onChange={(e) => setTenure(e.target.value as Tenure)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="">Select tenure...</option>
              {TENURE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.tenure && <p className="text-xs text-red-600 mt-1">{errors.tenure}</p>}
          </div>

          <div>
            <label htmlFor="floorAreaSqft" className="block text-sm font-medium text-gray-700 mb-1">
              Floor Area (sqft) *
            </label>
            <input
              type="number"
              id="floorAreaSqft"
              value={floorAreaSqft}
              onChange={(e) => setFloorAreaSqft(e.target.value)}
              placeholder="e.g. 1200"
              min={0}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
            {errors.floorAreaSqft && <p className="text-xs text-red-600 mt-1">{errors.floorAreaSqft}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-1">
              Floor
            </label>
            <input
              type="text"
              id="floor"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g. 12"
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Unit Number
            </label>
            <input
              type="text"
              id="unitNumber"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g. #12-34"
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div>
            <label htmlFor="completionYear" className="block text-sm font-medium text-gray-700 mb-1">
              Completion Year
            </label>
            <input
              type="number"
              id="completionYear"
              value={completionYear}
              onChange={(e) => setCompletionYear(e.target.value)}
              placeholder="e.g. 2020"
              min={1960}
              max={2035}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>

        {listingType === 'sale' ? (
          <div>
            <label htmlFor="askingPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Asking Price ($)
            </label>
            <input
              type="number"
              id="askingPrice"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              placeholder="e.g. 1500000"
              min={0}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
            {psf && (
              <p className="text-xs text-brand-600 mt-1 font-medium">
                ${psf.toLocaleString('en-SG')} psf
              </p>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="askingRental" className="block text-sm font-medium text-gray-700 mb-1">
              Asking Rental ($/month)
            </label>
            <input
              type="number"
              id="askingRental"
              value={askingRental}
              onChange={(e) => setAskingRental(e.target.value)}
              placeholder="e.g. 3500"
              min={0}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
        )}
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Description</h2>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe the property features, nearby amenities, etc."
          className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
        />
      </div>

      {/* Exclusivity */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Exclusivity</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isExclusive}
            onChange={(e) => setIsExclusive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700">This is an exclusive listing</span>
        </label>

        {isExclusive && (
          <div>
            <label htmlFor="exclusivityExpiry" className="block text-sm font-medium text-gray-700 mb-1">
              Exclusivity Expiry Date
            </label>
            <input
              type="date"
              id="exclusivityExpiry"
              value={exclusivityExpiry}
              onChange={(e) => setExclusivityExpiry(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? isEdit ? 'Saving...' : 'Creating...'
            : isEdit ? 'Save Changes' : 'Create Listing'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
