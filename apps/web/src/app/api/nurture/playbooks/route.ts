import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPlaybookSchema } from '@/lib/nurture/types';

/**
 * Allowed trigger_field values — date-type fields on the contacts table.
 * Requirement 15.6: trigger_field must be a valid date-type field name.
 */
const ALLOWED_TRIGGER_FIELDS = [
  'mop_date',
  'owned_property_key_collection_date',
  'consent_given_at',
  'data_retention_expiry',
] as const;

// GET /api/nurture/playbooks — list playbooks for tenant with pagination
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

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    // Fetch playbooks with count
    const { data: playbooks, error, count } = await supabase
      .from('playbooks')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Playbooks GET] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch playbooks' }, { status: 500 });
    }

    return NextResponse.json({
      playbooks: playbooks ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[Playbooks GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/nurture/playbooks — create a new playbook
export async function POST(request: NextRequest) {
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

    // Parse and validate request body with Zod
    const body = await request.json();
    const parsed = createPlaybookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, segment_definition_json, trigger_field, steps_json, target_ad_purpose } =
      parsed.data;

    // Validate trigger_field against allowed date fields (Requirement 15.6)
    if (!ALLOWED_TRIGGER_FIELDS.includes(trigger_field as (typeof ALLOWED_TRIGGER_FIELDS)[number])) {
      return NextResponse.json(
        {
          error: `Invalid trigger_field: "${trigger_field}". Accepted values: ${ALLOWED_TRIGGER_FIELDS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create the playbook
    const { data: playbook, error: insertError } = await supabase
      .from('playbooks')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        segment_definition_json,
        trigger_field,
        steps_json,
        target_ad_purpose: target_ad_purpose ?? null,
        created_by: user.id,
        active: false,
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation (duplicate name per tenant)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: `A playbook with the name "${name}" already exists` },
          { status: 409 }
        );
      }
      console.error('[Playbooks POST] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create playbook' }, { status: 500 });
    }

    // Synchronise playbook_steps from steps_json (Requirement 15.3)
    const stepRows = steps_json.map((step, index) => ({
      id: step.id,
      playbook_id: playbook.id,
      offset_days: step.offset_days,
      channel: step.channel,
      template_id: step.template_id,
      create_task: step.create_task,
      title: step.title,
      sort_order: index,
    }));

    const { error: stepsError } = await supabase.from('playbook_steps').insert(stepRows);

    if (stepsError) {
      // Requirement 15.4: If sync fails, roll back the playbook creation
      console.error('[Playbooks POST] Steps sync error:', stepsError);
      await supabase.from('playbooks').delete().eq('id', playbook.id);
      return NextResponse.json(
        { error: 'Failed to synchronise playbook steps' },
        { status: 500 }
      );
    }

    return NextResponse.json({ playbook }, { status: 201 });
  } catch (error) {
    console.error('[Playbooks POST] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
