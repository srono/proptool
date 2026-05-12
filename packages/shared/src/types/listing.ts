export type PropertyType = 'hdb' | 'condo' | 'landed' | 'commercial';
export type HdbType = '2room' | '3room' | '4room' | '5room' | 'executive';
export type Tenure = 'freehold' | '99yr' | '999yr';
export type ListingStatus = 'draft' | 'live' | 'under_offer' | 'sold' | 'rented' | 'withdrawn';
export type ListingType = 'sale' | 'rental';

export interface Listing {
  id: string;
  tenant_id: string;
  agent_id: string;
  address: string;
  postal_code: string;
  district: string; // D01-D28
  property_type: PropertyType;
  hdb_type: HdbType | null;
  tenure: Tenure;
  floor_area_sqft: number;
  asking_price: number | null;
  psf: number | null; // computed
  asking_rental: number | null;
  listing_status: ListingStatus;
  listing_type: ListingType;
  floor: string | null;
  unit_number: string | null;
  completion_year: number | null;
  media_urls: string[];
  description: string | null;
  is_exclusive: boolean;
  exclusivity_expiry: string | null;
  seller_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

// Extended type for list views with joined seller data
export interface ListingWithSeller extends Listing {
  seller_contact: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
}
