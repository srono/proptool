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
          owned_property_type,
          owned_property_label,
          owned_property_town,
          whatsapp_optin,
          channel_preference,
          data_retention_expiry
        ),
        playbooks!inner (
          id,
          name,
          target_ad_purpose
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

    // Map tasks to response format with consent badge computation
    const mappedTasks = (tasks ?? []).map((task: Record<string, unknown>) => {
      const contact = task.contacts as Record<string, unknown>;
      const playbook = task.playbooks as Record<string, unknown>;

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

      return {
        id: task.id,
        contact_id: task.contact_id,
        contact_name: contact.full_name ?? '',
        owned_property_summary: ownedPropertySummary,
        segment_tags: [],
        next_action_title: '', // populated from step title if available
        due_at: task.due_at,
        last_activity_date: null,
        consent_badge: badge,
        channel: task.channel,
        playbook_name: playbook.name ?? '',
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
