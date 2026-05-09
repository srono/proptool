import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { TheBrief } from '@/components/dashboard/the-brief';
import { KPIStrip } from '@/components/dashboard/kpi-strip';
import { PipelineFunnel } from '@/components/dashboard/pipeline-funnel';
import { ScheduleCard } from '@/components/dashboard/schedule-card';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch KPIs
  const { count: activeLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("closed_won","closed_lost")');

  const { count: viewingsThisWeek } = await supabase
    .from('viewings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString());

  const { count: overdueTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .is('completed_at', null)
    .lt('due_at', new Date().toISOString());

  const { count: newLeadsThisWeek } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const today = new Date().toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="p-4 lg:p-7 space-y-5">
      {/* Page header */}
      <div className="flex items-end justify-between border-b border-onyx-line pb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
            Today, {today}
          </h1>
          <p className="text-[13px] text-gray-2 mt-1">
            Good morning. {overdueTasks ?? 0} leads need follow-up.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tools/stamp-duty" className="btn-ghost text-xs">
            Stamp duty
          </Link>
          <Link href="/leads/new" className="btn-primary text-xs">
            + New lead
          </Link>
        </div>
      </div>

      {/* The Brief — distinctive moment */}
      <TheBrief />

      {/* KPI strip */}
      <KPIStrip
        activeLeads={activeLeads ?? 0}
        viewingsBooked={viewingsThisWeek ?? 0}
        overdueTasks={overdueTasks ?? 0}
        newLeadsThisWeek={newLeadsThisWeek ?? 0}
      />

      {/* Two-up: Pipeline funnel + Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        <PipelineFunnel />
        <ScheduleCard />
      </div>
    </div>
  );
}
