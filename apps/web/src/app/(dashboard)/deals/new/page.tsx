import { createClient } from '@/lib/supabase/server';
import { DealForm } from '@/components/deals/deal-form';

export default async function NewDealPage() {
  const supabase = await createClient();

  // Fetch leads in negotiating+ stages
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id,
      deal_type,
      status,
      contact:contacts(full_name, phone)
    `)
    .in('status', ['negotiating', 'otp_loi_issued', 'viewing_booked', 'qualified'])
    .order('created_at', { ascending: false });

  // Fetch available listings
  const { data: listings } = await supabase
    .from('listings')
    .select('id, address, district, property_type, asking_price, asking_rental')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">New Deal</h1>
        <p className="text-sm text-gray-600">Create a deal to track a transaction</p>
      </div>

      <DealForm leads={leads ?? []} listings={listings ?? []} />
    </div>
  );
}
