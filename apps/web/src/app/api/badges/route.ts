import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const [leadsRes, messagesRes, tasksRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new_lead'),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .neq('status', 'read'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .is('completed_at', null)
      .lt('due_at', new Date().toISOString()),
  ]);

  return NextResponse.json({
    new_leads_count: leadsRes.count ?? 0,
    unread_messages_count: messagesRes.count ?? 0,
    overdue_tasks_count: tasksRes.count ?? 0,
  });
}
