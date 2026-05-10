import { createClient } from '@/lib/supabase/server';
import { NewViewingForm } from './new-viewing-form';

export const metadata = { title: 'Schedule Viewing' };

interface Props {
  searchParams: Promise<{ lead_id?: string }>;
}

export default async function NewViewingPage({ searchParams }: Props) {
  const { lead_id } = await searchParams;
  const supabase = await createClient();

  // Check if current user has Google Calendar connected
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let googleCalendarConnected = false;
  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('google_refresh_token')
      .eq('id', user.id)
      .single();
    googleCalendarConnected = !!userProfile?.google_refresh_token;
  }

  // Fetch leads for the dropdown
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id,
      status,
      deal_type,
      pre_viewing_checklist,
      contact:contacts(full_name, phone)
    `)
    .not('status', 'in', '(closed_won,closed_lost)')
    .order('last_activity_at', { ascending: false })
    .limit(100);

  // Fetch listings for the dropdown
  const { data: listings } = await supabase
    .from('listings')
    .select('id, address, district, property_type, asking_price, asking_rental')
    .in('listing_status', ['live', 'under_offer'])
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-4 lg:p-7 max-w-2xl mx-auto">
      <div className="mb-6 border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Schedule Viewing</h1>
        <p className="text-[13px] text-gray-2 mt-0.5">
          Book a property viewing for a lead
        </p>
      </div>

      <NewViewingForm
        leads={leads ?? []}
        listings={listings ?? []}
        preselectedLeadId={lead_id}
        googleCalendarConnected={googleCalendarConnected}
      />
    </div>
  );
}
