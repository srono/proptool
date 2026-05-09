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
    <div className="p-4 lg:p-7 max-w-2xl mx-auto space-y-4">
      <div className="border-b border-onyx-line pb-5">
        <h1 className="font-display font-bold text-[26px] text-white tracking-tight">New Deal</h1>
        <p className="text-[13px] text-gray-2">Create a deal to track a transaction</p>
      </div>

      <DealForm leads={leads ?? []} listings={listings ?? []} />
    </div>
  );
}
