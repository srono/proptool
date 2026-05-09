export type ViewingStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface Viewing {
  id: string;
  tenant_id: string;
  lead_id: string;
  listing_id: string;
  scheduled_at: string;
  duration_mins: number;
  status: ViewingStatus;
  attended: boolean | null;
  feedback_notes: string | null;
  buyer_interest_level: number | null; // 1-5
  objections: string | null;
  seller_updated: boolean;
  next_action: string | null;
  created_at: string;
}
