import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ViewingForm } from '../../viewing-form';
import type { Metadata } from 'next';

interface EditViewingPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Edit Viewing' };

export default async function EditViewingPage({ params }: EditViewingPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the viewing
  const { data: viewing } = await supabase
    .from('viewings')
    .select('id, lead_id, listing_id, scheduled_at, duration_mins, status')
    .eq('id', id)
    .single();

  if (!viewing) {
    notFound();
  }

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
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Edit Viewing</h1>
        <p className="text-[13px] text-gray-2 mt-0.5">
          Reschedule or update viewing details
        </p>
      </div>

      <ViewingForm
        leads={leads ?? []}
        listings={listings ?? []}
        googleCalendarConnected={googleCalendarConnected}
        initialData={viewing}
      />
    </div>
  );
}
