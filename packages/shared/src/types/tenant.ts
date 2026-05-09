export type SubscriptionPlan = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled';

export interface Tenant {
  id: string;
  name: string;
  cea_registration_number: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  settings_json: TenantSettings;
  created_at: string;
}

export interface TenantSettings {
  data_retention_years: number; // default 5
  daily_digest_time: string; // default "08:30"
  email_inbound_address: string; // leads+{tenant_id}@cinvea.com
  default_currency: string; // SGD
}
