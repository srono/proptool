export type DealStatus =
  | 'negotiating'
  | 'otp_issued'
  | 'otp_signed'
  | 'exercised'
  | 'completed'
  | 'fallen_through';

export type CommissionPaymentStatus = 'unpaid' | 'partial' | 'received';

export type ClosedLostReason =
  | 'price'
  | 'location'
  | 'timing'
  | 'co_broke_lost'
  | 'client_changed_mind'
  | 'other';

export interface Deal {
  id: string;
  tenant_id: string;
  lead_id: string;
  listing_id: string | null;
  deal_type: string;
  status: DealStatus;
  offer_price: number | null;
  agreed_price: number | null;
  commission_pct: number | null;
  commission_amount: number | null;
  co_broke_agent_id: string | null;
  co_broke_split_pct: number | null;
  otp_date: string | null;
  exercise_deadline: string | null;
  completion_date: string | null;
  documents: string[]; // URLs
  notes: string | null;
  closed_lost_reason: ClosedLostReason | null;
  commission_payment_status: CommissionPaymentStatus;
  commission_received_date: string | null;
  created_at: string;
  updated_at: string;
}
