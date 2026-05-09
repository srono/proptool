import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ViewingsPage() {
  const supabase = await createClient();

  const { data: viewings } = await supabase
    .from('viewings')
    .select(`
      *,
      lead:leads(
        id,
        status,
        pre_viewing_checklist,
        contact:contacts(full_name, phone)
      ),
      listing:listings(address, district, property_type)
    `)
    .in('status', ['scheduled', 'rescheduled'])
    .order('scheduled_at', { ascending: true });

  return (
    <div className="p-4 lg:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Viewings</h1>
          <p className="text-sm text-gray-600">Upcoming property viewings</p>
        </div>
        <Link
          href="/viewings/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Schedule Viewing
        </Link>
      </div>

      {/* Viewings list */}
      <div className="space-y-3">
        {viewings && viewings.length > 0 ? (
          viewings.map((viewing) => {
            const checklist = viewing.lead?.pre_viewing_checklist;
            const checklistComplete = checklist
              ? Object.values(checklist).every(Boolean)
              : false;
            const checklistCount = checklist
              ? Object.values(checklist).filter(Boolean).length
              : 0;
            const checklistTotal = 7;

            return (
              <div
                key={viewing.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Lead & listing info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {viewing.lead?.contact?.full_name ?? 'Unknown'}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        viewing.status === 'scheduled'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {viewing.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {viewing.listing?.address ?? 'No address'}
                      {viewing.listing?.district ? ` · ${viewing.listing.district}` : ''}
                    </p>
                  </div>

                  {/* Center: Date/time */}
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">
                      {new Date(viewing.scheduled_at).toLocaleDateString('en-SG', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(viewing.scheduled_at).toLocaleTimeString('en-SG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {viewing.duration_mins} min
                    </p>
                  </div>

                  {/* Right: Checklist status */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      checklistComplete
                        ? 'bg-green-50 text-green-700'
                        : checklist
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {checklistComplete
                        ? '✓ Qualified'
                        : checklist
                        ? `${checklistCount}/${checklistTotal}`
                        : 'No checklist'}
                    </span>
                    <Link
                      href={`/leads/${viewing.lead_id}`}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      View Lead →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-sm">No upcoming viewings</p>
            <p className="text-gray-400 text-xs mt-1">
              Schedule a viewing from a lead&apos;s detail page or click the button above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
