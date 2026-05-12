import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updatePlaybookSchema } from '@/lib/nurture/types';

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

// GET /api/nurture/playbooks/[id] — fetch single playbook with steps
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Fetch playbook scoped to tenant
    const { data: playbook, error } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !playbook) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    // Fetch associated playbook_steps ordered by sort_order
    const { data: steps } = await supabase
      .from('playbook_steps')
      .select('*')
      .eq('playbook_id', id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ playbook, steps: steps ?? [] });
  } catch (error) {
    console.error('[Playbook GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/nurture/playbooks/[id] — update playbook fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify playbook exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('playbooks')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = updatePlaybookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, segment_definition_json, trigger_field, steps_json, target_ad_purpose, active } =
      parsed.data;

    // Validate trigger_field if provided (Requirement 15.6)
    if (trigger_field && !ALLOWED_TRIGGER_FIELDS.includes(trigger_field as (typeof ALLOWED_TRIGGER_FIELDS)[number])) {
      return NextResponse.json(
        {
          error: `Invalid trigger_field: "${trigger_field}". Accepted values: ${ALLOWED_TRIGGER_FIELDS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Build update payload (only include provided fields)
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (segment_definition_json !== undefined) updatePayload.segment_definition_json = segment_definition_json;
    if (trigger_field !== undefined) updatePayload.trigger_field = trigger_field;
    if (steps_json !== undefined) updatePayload.steps_json = steps_json;
    if (target_ad_purpose !== undefined) updatePayload.target_ad_purpose = target_ad_purpose;
    if (active !== undefined) updatePayload.active = active;

    // Update the playbook
    const { data: playbook, error: updateError } = await supabase
      .from('playbooks')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      // Handle unique constraint violation (duplicate name per tenant)
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: `A playbook with the name "${name}" already exists` },
          { status: 409 }
        );
      }
      console.error('[Playbook PATCH] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update playbook' }, { status: 500 });
    }

    // Re-sync playbook_steps if steps_json was updated (Requirement 15.3)
    if (steps_json !== undefined) {
      // Delete existing steps
      const { error: deleteError } = await supabase
        .from('playbook_steps')
        .delete()
        .eq('playbook_id', id);

      if (deleteError) {
        // Requirement 15.4: If sync fails, reject the change
        console.error('[Playbook PATCH] Steps delete error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to synchronise playbook steps' },
          { status: 500 }
        );
      }

      // Insert new steps
      const stepRows = steps_json.map((step, index) => ({
        id: step.id,
        playbook_id: id,
        offset_days: step.offset_days,
        channel: step.channel,
        template_id: step.template_id,
        create_task: step.create_task,
        title: step.title,
        sort_order: index,
      }));

      const { error: insertError } = await supabase.from('playbook_steps').insert(stepRows);

      if (insertError) {
        // Requirement 15.4: If sync fails, return error
        console.error('[Playbook PATCH] Steps insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to synchronise playbook steps' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ playbook });
  } catch (error) {
    console.error('[Playbook PATCH] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/nurture/playbooks/[id] — delete playbook with guard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify playbook exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('playbooks')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
    }

    // Requirement 2.11: Guard against deletion when pending/snoozed tasks exist
    const { count: activeTaskCount, error: countError } = await supabase
      .from('nurture_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('playbook_id', id)
      .in('status', ['pending', 'snoozed']);

    if (countError) {
      console.error('[Playbook DELETE] Task count error:', countError);
      return NextResponse.json({ error: 'Failed to check active tasks' }, { status: 500 });
    }

    if (activeTaskCount && activeTaskCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete playbook while it has active tasks. Please complete or skip all pending and snoozed tasks first.',
          active_task_count: activeTaskCount,
        },
        { status: 409 }
      );
    }

    // Delete the playbook (playbook_steps cascade via ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from('playbooks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('[Playbook DELETE] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete playbook' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Playbook DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
