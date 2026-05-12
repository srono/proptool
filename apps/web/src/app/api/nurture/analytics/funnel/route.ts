import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeFunnelMetrics } from '@/lib/nurture/analytics';
import type { CompletedTask, Deal } from '@/lib/nurture/analytics';

/**
 * Date range presets in days.
 */
const PRESETS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/** Maximum custom date range span in days */
const MAX_RANGE_DAYS = 365;

/**
 * Parses and validates date range query params.
 * Supports preset (7d, 30d, 90d) or custom from/to ISO dates.
 * Defaults to last 30 days if no params provided.
 */
function parseDateRange(searchParams: URLSearchParams): {
  from: Date;
  to: Date;
  error?: string;
} {
  const preset = searchParams.get('preset');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  const now = new Date();
  let from: Date;
  let to: Date = now;

  if (preset && PRESETS[preset]) {
    from = new Date(now.getTime() - PRESETS[preset] * 24 * 60 * 60 * 1000);
  } else if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return { from: now, to: now, error: 'Invalid date format for from/to parameters' };
    }

    if (from > to) {
      return { from: now, to: now, error: '"from" date must be before "to" date' };
    }

    const spanMs = to.getTime() - from.getTime();
    const spanDays = spanMs / (24 * 60 * 60 * 1000);
    if (spanDays > MAX_RANGE_DAYS) {
      return {
        from: now,
        to: now,
        error: `Date range must not exceed ${MAX_RANGE_DAYS} days`,
      };
    }
  } else {
    // Default: last 30 days
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { from, to };
}

/**
 * GET /api/nurture/analytics/funnel
 *
 * Returns funnel metrics for nurture playbooks:
 * - total_contacts: unique contacts enrolled in active playbooks
 * - tasks_created: total nurture tasks created in the date range
 * - tasks_completed: tasks marked done in the date range
 * - deals_from_nurtured: deals attributed to nurtured contacts
 *
 * Query params:
 *   preset - date range preset (7d, 30d, 90d)
 *   from - custom range start (ISO date)
 *   to - custom range end (ISO date)
 *
 * Requirements: 11.1, 11.5, 11.6, 11.7
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve tenant_id from user profile
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = profile.tenant_id;

    // Parse date range
    const { searchParams } = new URL(request.url);
    const { from, to, error: dateError } = parseDateRange(searchParams);

    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    // Fetch total unique contacts in active playbooks (within date range tasks)
    const { count: totalContacts } = await supabase
      .from('nurture_tasks')
      .select('contact_id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    // Fetch tasks created in the date range
    const { count: tasksCreated } = await supabase
      .from('nurture_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    // Fetch completed tasks in the date range
    const { data: completedTasksData } = await supabase
      .from('nurture_tasks')
      .select('id, contact_id, playbook_id, completed_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'done')
      .gte('completed_at', fromIso)
      .lte('completed_at', toIso);

    const completedTasks: CompletedTask[] = (completedTasksData ?? []).map((t) => ({
      id: t.id as string,
      contact_id: t.contact_id as string,
      playbook_id: t.playbook_id as string,
      completed_at: t.completed_at as string,
    }));

    // Fetch deals created in the date range for this tenant
    const { data: dealsData } = await supabase
      .from('deals')
      .select('id, contact_id, created_at, status, net_commission')
      .eq('tenant_id', tenantId)
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    const deals: Deal[] = (dealsData ?? []).map((d) => ({
      id: d.id as string,
      contact_id: d.contact_id as string,
      created_at: d.created_at as string,
      status: d.status as string,
      net_commission: (d.net_commission as number) ?? undefined,
    }));

    // Compute funnel metrics using pure computation function
    const metrics = computeFunnelMetrics({
      totalContacts: totalContacts ?? 0,
      tasksCreated: tasksCreated ?? 0,
      completedTasks,
      deals,
    });

    // Requirement 11.6: empty state when no data
    if (metrics.total_contacts === 0 && metrics.tasks_created === 0) {
      return NextResponse.json({
        metrics,
        empty: true,
        message: 'No analytics data available for the selected period',
        date_range: { from: fromIso, to: toIso },
      });
    }

    return NextResponse.json({
      metrics,
      empty: false,
      date_range: { from: fromIso, to: toIso },
    });
  } catch (error) {
    console.error('[Analytics Funnel] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
