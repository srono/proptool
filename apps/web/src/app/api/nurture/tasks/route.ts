import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeConsentBadge } from '@/lib/nurture/consent';
import { z } from 'zod';

/**
 * GET /api/nurture/tasks
 * Fetch nurture tasks with filters (playbook_id, status, assigned_to, consent_status),
 * pagination, and joined contact data.
 *
 * Query params:
 *   playbook_id - filter by playbook
 *   status - filter by task status (pending, done, skipped, snoozed)
 *   assigned_to - filter by assigned agent user_id
 *   consent_status - filter by consent badge (green, yellow, red)
 *   page - page number (default 1)
 *   limit - items per page (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const playbookId = searchParams.get('playbook_id');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const consentStatus = searchParams.get('consent_status');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    // Build query with contact join
    let query = supabase
      .from('nurture_tasks')
      .select(
        `
        id,
        contact_id,
        playbook_id,
        step_id,
        assigned_to,
        due_at,
        status,
        completed_at,
        channel,
        notes,
        created_at,
        contacts!inner (
          id,
          full_name,
          phone,
          owned_property_type,
          owned_property_label,
          owned_property_town,
          owned_property_flat_type,
          mop_date,
          last_contacted_at,
          whatsapp_optin,
          channel_preference,
          data_retention_expiry
        ),
        playbooks!inner (
          id,
          name,
          target_ad_purpose
        ),
        playbook_steps (
          id,
          title
        )
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', profile.tenant_id);

    // Apply filters
    if (playbookId) {
      query = query.eq('playbook_id', playbookId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    // Order by due_at ascending (overdue first)
    query = query.order('due_at', { ascending: true });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('[Nurture Tasks] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // Fetch all playbook steps for the playbooks referenced by these tasks
    const playbookIds = [...new Set((tasks ?? []).map((t: Record<string, unknown>) => t.playbook_id as string))];
    let allPlaybookSteps: Record<string, unknown>[] = [];
    if (playbookIds.length > 0) {
      const { data: stepsData } = await supabase
        .from('playbook_steps')
        .select('id, playbook_id, title, channel, sort_order')
        .in('playbook_id', playbookIds)
        .order('sort_order', { ascending: true });
      allPlaybookSteps = stepsData ?? [];
    }

    // Fetch all nurture tasks for the same contact+playbook combos to determine step statuses
    const contactPlaybookPairs = [...new Set(
      (tasks ?? []).map((t: Record<string, unknown>) => `${t.contact_id}|${t.playbook_id}`)
    )];
    let allRelatedTasks: Record<string, unknown>[] = [];
    if (contactPlaybookPairs.length > 0) {
      const contactIds = [...new Set((tasks ?? []).map((t: Record<string, unknown>) => t.contact_id as string))];
      const { data: relatedData } = await supabase
        .from('nurture_tasks')
        .select('contact_id, playbook_id, step_id, status')
        .eq('tenant_id', profile.tenant_id)
        .in('contact_id', contactIds)
        .in('playbook_id', playbookIds);
      allRelatedTasks = relatedData ?? [];
    }

    // Build a lookup: (contact_id, playbook_id) -> Map<step_id, task_status>
    const taskStatusLookup = new Map<string, Map<string, string>>();
    for (const rt of allRelatedTasks) {
      const key = `${rt.contact_id}|${rt.playbook_id}`;
      if (!taskStatusLookup.has(key)) {
        taskStatusLookup.set(key, new Map());
      }
      if (rt.step_id) {
        taskStatusLookup.get(key)!.set(rt.step_id as string, rt.status as string);
      }
    }

    // Build a lookup: playbook_id -> sorted steps
    const playbookStepsLookup = new Map<string, Record<string, unknown>[]>();
    for (const s of allPlaybookSteps) {
      const pbId = s.playbook_id as string;
      if (!playbookStepsLookup.has(pbId)) {
        playbookStepsLookup.set(pbId, []);
      }
      playbookStepsLookup.get(pbId)!.push(s);
    }

    // Map tasks to response format with consent badge computation
    const mappedTasks = (tasks ?? []).map((task: Record<string, unknown>) => {
      const contact = task.contacts as Record<string, unknown>;
      const playbook = task.playbooks as Record<string, unknown>;
      const step = task.playbook_steps as Record<string, unknown> | null;

      // Compute consent badge from contact fields
      const badge = computeConsentBadge({
        whatsapp_optin: contact.whatsapp_optin as boolean,
        channel_preference: contact.channel_preference as string,
        ad_purpose: null,
        target_ad_purpose: playbook.target_ad_purpose as string | null,
        dnc_registered: false,
        data_retention_expiry: contact.data_retention_expiry as string | null,
        task_channel: task.channel as string,
      });

      // Build owned property summary
      const propParts = [
        contact.owned_property_type !== 'none' ? contact.owned_property_type : null,
        contact.owned_property_label,
        contact.owned_property_town,
      ].filter(Boolean);
      const ownedPropertySummary = propParts.join(', ') || '';

      // Build playbook_steps with statuses
      const pbId = task.playbook_id as string;
      const contactId = task.contact_id as string;
      const pbSteps = playbookStepsLookup.get(pbId) ?? [];
      const statusMap = taskStatusLookup.get(`${contactId}|${pbId}`) ?? new Map();

      const playbookStepsWithStatus = pbSteps.map((s, idx) => {
        const stepId = s.id as string;
        const taskStatus = statusMap.get(stepId);
        let stepStatus: 'done' | 'pending' | 'upcoming';

        if (taskStatus === 'done' || taskStatus === 'skipped') {
          stepStatus = 'done';
        } else if (taskStatus === 'pending' || taskStatus === 'snoozed') {
          stepStatus = 'pending';
        } else {
          stepStatus = 'upcoming';
        }

        return {
          step_number: idx + 1,
          title: s.title as string,
          channel: s.channel as string,
          status: stepStatus,
        };
      });

      return {
        id: task.id,
        contact_id: task.contact_id,
        contact_name: contact.full_name ?? '',
        contact_phone: (contact.phone as string) || null,
        owned_property_summary: ownedPropertySummary,
        owned_property_type: (contact.owned_property_type as string) ?? 'none',
        owned_property_label: (contact.owned_property_label as string) || null,
        owned_property_town: (contact.owned_property_town as string) || null,
        owned_property_flat_type: (contact.owned_property_flat_type as string) || null,
        mop_date: (contact.mop_date as string) || null,
        segment_tags: [],
        next_action_title: (step?.title as string) || (task.notes as string) || '',
        due_at: task.due_at,
        last_activity_date: (contact.last_contacted_at as string) || null,
        consent_badge: badge,
        channel: task.channel,
        playbook_name: playbook.name ?? '',
        playbook_steps: playbookStepsWithStatus.length > 0 ? playbookStepsWithStatus : null,
        status: task.status,
      };
    });

    // Filter by consent_status client-side (computed field)
    const filteredTasks = consentStatus
      ? mappedTasks.filter(
          (t: { consent_badge: string }) => t.consent_badge === consentStatus
        )
      : mappedTasks;

    return NextResponse.json({
      tasks: filteredTasks,
      total: consentStatus ? filteredTasks.length : (count ?? 0),
      page,
    });
  } catch (error) {
    console.error('[Nurture Tasks] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// Zod schema for ad-hoc task creation
const createAdHocTaskSchema = z.object({
  contact_id: z.string().uuid(),
  playbook_id: z.string().uuid(),
  channel: z.enum(['whatsapp', 'email', 'call', 'note']),
  title: z.string().min(1).max(80),
  due_at: z.string(), // ISO date string, validated below
  assigned_to: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/nurture/tasks
 * Create an ad-hoc nurture task (step_id = null).
 * Validates due_at >= today and title max 80 chars.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const parsed = createAdHocTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { contact_id, playbook_id, channel, title, due_at, assigned_to, notes } = parsed.data;

    // Validate due_at >= today
    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid due_at date format' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      return NextResponse.json(
        { error: 'due_at must be today or in the future' },
        { status: 400 }
      );
    }

    // Verify contact exists and belongs to tenant
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify playbook exists and belongs to tenant
    const { data: playbook, error: playbookError } = await supabase
      .from('playbooks')
      .select('id')
      .eq('id', playbook_id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (playbookError || !playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    // Create ad-hoc task with step_id = null
    const { data: task, error: insertError } = await supabase
      .from('nurture_tasks')
      .insert({
        tenant_id: profile.tenant_id,
        contact_id,
        playbook_id,
        step_id: null, // ad-hoc task
        assigned_to: assigned_to ?? user.id,
        due_at: dueDate.toISOString(),
        status: 'pending',
        channel,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Nurture Tasks] POST insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('[Nurture Tasks] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
