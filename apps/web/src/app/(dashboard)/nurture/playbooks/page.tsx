import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata = { title: 'Playbooks' };

export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = 'active' } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('playbooks')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filter === 'inactive') {
    query = query.eq('active', false);
  } else {
    query = query.eq('active', true);
  }

  const { data: playbooks, count } = await query.limit(50);

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            Playbooks
          </h1>
          <p className="text-[13px] text-gray-2">
            Manage your nurture outreach sequences
          </p>
        </div>
        <Link href="/nurture/playbooks/new" className="btn-primary">
          + New Playbook
        </Link>
      </div>

      {/* Active / Inactive toggle */}
      <div className="flex gap-1 bg-onyx-card border border-onyx-line rounded-pill p-1">
        {[
          { key: 'active', label: 'Active' },
          { key: 'inactive', label: 'Inactive' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/nurture/playbooks?filter=${tab.key}`}
            className={`flex-1 text-center rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-aqua text-onyx'
                : 'text-gray-2 hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Playbook count */}
      <p className="text-xs text-gray-2">
        {count ?? 0} {filter === 'active' ? 'active' : 'inactive'}{' '}
        {(count ?? 0) === 1 ? 'playbook' : 'playbooks'}
      </p>

      {/* Playbook cards */}
      <div className="space-y-3">
        {playbooks && playbooks.length > 0 ? (
          playbooks.map((playbook) => {
            const stepsCount = Array.isArray(playbook.steps_json)
              ? playbook.steps_json.length
              : 0;

            return (
              <Link key={playbook.id} href={`/nurture/playbooks/${playbook.id}`}>
                <div className="bg-onyx-card rounded-2xl border border-onyx-line p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {playbook.name}
                        </p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            playbook.active
                              ? 'text-status-green border-status-green/40 bg-status-green/10'
                              : 'text-gray-2 border-onyx-line bg-onyx-card'
                          }`}
                        >
                          {playbook.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {playbook.description && (
                        <p className="text-xs text-gray-2 mt-1 line-clamp-2">
                          {playbook.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-2">
                        {stepsCount} {stepsCount === 1 ? 'step' : 'steps'}
                      </p>
                      <p className="text-[11px] text-gray-2 mt-0.5">
                        Trigger: {playbook.trigger_field?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-2 mt-2">
                    Created{' '}
                    {new Date(playbook.created_at).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-12 bg-onyx-card rounded-2xl border border-onyx-line">
            <p className="text-gray-2 text-sm">
              {filter === 'active'
                ? 'No active playbooks'
                : 'No inactive playbooks'}
            </p>
            <p className="text-gray-2 text-xs mt-1">
              {filter === 'active'
                ? 'Create a playbook to start nurturing contacts automatically.'
                : 'Deactivated playbooks will appear here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
