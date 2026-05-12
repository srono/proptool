export type ContactStatus = 'active' | 'inactive' | 'archived' | 'do_not_contact';

export interface ContactListItem {
  id: string;
  full_name: string;
  phone: string;
  contact_status: ContactStatus;
  last_contacted_at: string | null;
  last_inbound_at: string | null;
  updated_at: string;
}
