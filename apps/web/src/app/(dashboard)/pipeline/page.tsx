import { createClient } from '@/lib/supabase/server';
import { PipelineBoard } from '@/components/pipeline/pipeline-board';
import { PIPELINE_STAGES } from '@propagent/shared';
import Link from 'next/link';

export default async function PipelinePage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      contact:contacts(full_name, phone, email),
      tasks(id, title, due_at, completed_at)
    `)
    .order('last_activity_at', { ascending: false });

  return (
    <div className="h-full flex flex-col">
      {/* Page bar */}
      <div className="p-5 lg:px-8 border-b border-onyx-line flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            Pipeline
          </h1>
          <p className="text-[13px] text-gray-2 mt-1">
            {leads?.length ?? 0} active leads across {PIPELINE_STAGES.length} stages.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost text-xs">Filters</button>
          <button className="btn-ghost text-xs">List view</button>
          <Link href="/leads/new" className="btn-primary text-xs">
            + New lead
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-5 lg:px-8">
        <PipelineBoard leads={leads ?? []} stages={PIPELINE_STAGES} />
      </div>
    </div>
  );
}
