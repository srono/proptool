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
    <div className="p-4 lg:p-7 space-y-5">
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">Viewings</h1>
          <p className="text-[13px] text-gray-2">Upcoming property viewings</p>
        </div>
        <Link
          href="/viewings/new"
          className="btn-primary"
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
                className="bg-onyx-card rounded-2xl border border-onyx-line p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Lead & listing info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {viewing.lead?.contact?.full_name ?? 'Unknown'}
                      </p>
                      <span className={`chip ${
                        viewing.status === 'scheduled'
                          ? 'text-aqua border-brand/50 bg-brand/[0.12]'
                          : 'text-status-amber border-status-amber/40 bg-status-amber/10'
                      }`}>
                        {viewing.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-2 mt-0.5 truncate">
                      {viewing.listing?.address ?? 'No address'}
                      {viewing.listing?.district ? ` · ${viewing.listing.district}` : ''}
                    </p>
                  </div>

                  {/* Center: Date/time */}
                  <div className="text-sm text-gray-2">
                    <p className="font-medium text-white">
                      {new Date(viewing.scheduled_at).toLocaleDateString('en-SG', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="text-xs text-gray-2">
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
                    <span className={`chip ${
                      checklistComplete
                        ? 'text-status-green border-status-green/40 bg-status-green/10'
                        : checklist
                        ? 'text-status-amber border-status-amber/40 bg-status-amber/10'
                        : 'text-gray-2 border-onyx-line bg-onyx-card'
                    }`}>
                      {checklistComplete
                        ? 'Qualified'
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
          <div className="text-center py-12 bg-onyx-card rounded-2xl border border-onyx-line">
            <p className="text-gray-2 text-sm">No upcoming viewings</p>
            <p className="text-gray-2 text-xs mt-1">
              Schedule a viewing from a lead&apos;s detail page or click the button above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
