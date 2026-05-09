import { createClient } from '@/lib/supabase/server';

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

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Your property business at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Active Leads" value={activeLeads ?? 0} />
        <KPICard label="New This Week" value={newLeadsThisWeek ?? 0} />
        <KPICard label="Viewings Scheduled" value={viewingsThisWeek ?? 0} />
        <KPICard label="Overdue Tasks" value={overdueTasks ?? 0} alert={!!overdueTasks && overdueTasks > 0} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction href="/leads/new" label="Add Lead" icon="➕" />
          <QuickAction href="/pipeline" label="Pipeline" icon="📊" />
          <QuickAction href="/listings/new" label="Add Listing" icon="🏠" />
          <QuickAction href="/messages" label="Messages" icon="💬" />
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </a>
  );
}
