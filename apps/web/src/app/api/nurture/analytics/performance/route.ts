import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computePlaybookPerformance } from '@/lib/nurture/analytics';
import type { CompletedTask, CompletedWhatsAppTask, InboundMessage, Deal } from '@/lib/nurture/analytics';

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
 * GET /api/nurture/analytics/performance
 *
 * Returns per-playbook performance metrics:
 * - tasks_completed: count of tasks marked done for the playbook
 * - response_rate: contacts who replied within 7 days / total WhatsApp tasks done
 * - deals_won: deals with status "completed" attributed to the playbook
 * - net_commission: sum of net_commission from won deals
 *
 * Query params:
 *   preset - date range preset (7d, 30d, 90d)
 *   from - custom range start (ISO date)
 *   to - custom range end (ISO date)
 *
 * Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
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

    // Fetch active playbooks for this tenant
    const { data: playbooks } = await supabase
      .from('playbooks')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    const playbookIds = (playbooks ?? []).map((p) => p.id as string);

    if (playbookIds.length === 0) {
      // Requirement 11.6: empty state when no data
      return NextResponse.json({
        performance: [],
        empty: true,
        message: 'No analytics data available for the selected period',
        date_range: { from: fromIso, to: toIso },
      });
    }

    // Fetch all completed tasks in the date range for these playbooks
    const { data: completedTasksData } = await supabase
      .from('nurture_tasks')
      .select('id, contact_id, playbook_id, completed_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'done')
      .in('playbook_id', playbookIds)
      .gte('completed_at', fromIso)
      .lte('completed_at', toIso);

    const completedTasks: CompletedTask[] = (completedTasksData ?? []).map((t) => ({
      id: t.id as string,
      contact_id: t.contact_id as string,
      playbook_id: t.playbook_id as string,
      completed_at: t.completed_at as string,
    }));

    // Fetch completed WhatsApp tasks in the date range (for response rate)
    const { data: whatsappTasksData } = await supabase
      .from('nurture_tasks')
      .select('id, contact_id, playbook_id, completed_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'done')
      .eq('channel', 'whatsapp')
      .in('playbook_id', playbookIds)
      .gte('completed_at', fromIso)
      .lte('completed_at', toIso);

    const completedWhatsAppTasks: CompletedWhatsAppTask[] = (whatsappTasksData ?? []).map((t) => ({
      id: t.id as string,
      contact_id: t.contact_id as string,
      playbook_id: t.playbook_id as string,
      completed_at: t.completed_at as string,
    }));

    // Fetch inbound messages within the response window
    // We need messages received within 7 days after any completed WhatsApp task
    // To be safe, fetch messages from (from - 0 days) to (to + 7 days)
    const messagesTo = new Date(to.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get unique contact IDs from WhatsApp tasks to scope the messages query
    const whatsappContactIds = [...new Set(completedWhatsAppTasks.map((t) => t.contact_id))];

    let inboundMessages: InboundMessage[] = [];

    if (whatsappContactIds.length > 0) {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('contact_id, received_at')
        .eq('tenant_id', tenantId)
        .eq('direction', 'inbound')
        .in('contact_id', whatsappContactIds)
        .gte('received_at', fromIso)
        .lte('received_at', messagesTo);

      inboundMessages = (messagesData ?? []).map((m) => ({
        contact_id: m.contact_id as string,
        received_at: m.received_at as string,
      }));
    }

    // Fetch deals for attribution (deals created in the date range)
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

    // Compute per-playbook performance using pure computation function
    const performance = computePlaybookPerformance({
      playbookIds,
      completedTasks,
      completedWhatsAppTasks,
      inboundMessages,
      deals,
    });

    // Enrich with playbook names
    const playbookNameMap = new Map(
      (playbooks ?? []).map((p) => [p.id as string, p.name as string])
    );

    const enrichedPerformance = performance.map((p) => ({
      ...p,
      playbook_name: playbookNameMap.get(p.playbook_id) ?? '',
    }));

    // Requirement 11.6: empty state check
    const hasData = enrichedPerformance.some(
      (p) => p.tasks_completed > 0 || p.deals_won > 0
    );

    if (!hasData) {
      return NextResponse.json({
        performance: enrichedPerformance,
        empty: true,
        message: 'No analytics data available for the selected period',
        date_range: { from: fromIso, to: toIso },
      });
    }

    return NextResponse.json({
      performance: enrichedPerformance,
      empty: false,
      date_range: { from: fromIso, to: toIso },
    });
  } catch (error) {
    console.error('[Analytics Performance] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
