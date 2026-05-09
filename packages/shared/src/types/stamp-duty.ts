export type DutyType = 'BSD' | 'ABSD';
export type BuyerProfile = 'citizen' | 'pr' | 'foreigner' | 'entity' | 'trust';
export type PropertyCount = '1st' | '2nd' | '3rd_plus';

export interface StampDutyRate {
  id: string;
  duty_type: DutyType;
  buyer_profile: BuyerProfile;
  property_count: PropertyCount;
  price_band_min: number;
  price_band_max: number | null; // null = no upper limit
  rate_pct: number;
  effective_from: string;
  effective_to: string | null;
}

export interface StampDutyCalculation {
  purchase_price: number;
  buyer_profile: BuyerProfile;
  property_count: PropertyCount;
  bsd_amount: number;
  absd_amount: number;
  total_duty: number;
  bsd_breakdown: StampDutyBand[];
  absd_rate_pct: number;
  disclaimer: string;
}

export interface StampDutyBand {
  band_min: number;
  band_max: number | null;
  rate_pct: number;
  taxable_amount: number;
  duty_amount: number;
}

export interface EligibilityRule {
  id: string;
  buyer_profile: BuyerProfile;
  property_type: string;
  property_count: PropertyCount;
  eligible: boolean;
  restriction_note: string | null;
  absd_rate_pct: number;
  effective_from: string;
}
