import { createClient } from '@/lib/supabase/server';
import { PipelineBoard } from '@/components/pipeline/pipeline-board';
import { PIPELINE_STAGES } from '@propagent/shared';

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
      <div className="p-4 lg:p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          <div className="flex gap-2">
            <button className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
              List View
            </button>
            <button className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700">
              + Add Lead
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 lg:p-6">
        <PipelineBoard leads={leads ?? []} stages={PIPELINE_STAGES} />
      </div>
    </div>
  );
}
