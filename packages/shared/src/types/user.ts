export type UserRole = 'owner' | 'admin' | 'agent';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  phone: string | null;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  cea_licence_number: string | null;
  cea_licence_expiry: string | null;
  agency_name: string | null;
  created_at: string;
}
