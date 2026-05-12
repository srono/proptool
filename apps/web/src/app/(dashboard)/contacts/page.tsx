import { createClient } from '@/lib/supabase/server';
import { ContactsClientShell } from '@/components/contacts/contacts-client-shell';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Contacts' };

export default async function ContactsPage() {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, full_name, phone, contact_status, last_contacted_at, last_inbound_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-4 lg:p-7 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Contacts' },
        ]}
        title="Contacts"
      />
      <ContactsClientShell contacts={contacts ?? []} />
    </div>
  );
}
