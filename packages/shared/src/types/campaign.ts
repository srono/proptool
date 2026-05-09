export type CampaignPlatform = 'facebook' | 'instagram';
export type CampaignStatus = 'active' | 'paused' | 'completed';

export interface Campaign {
  id: string;
  tenant_id: string;
  platform: CampaignPlatform;
  page_id: string;
  ad_account_id: string | null;
  campaign_name: string;
  status: CampaignStatus;
  leads_count: number;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}
