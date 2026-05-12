import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTemplateSchema } from '@/lib/nurture/types';
import { validateTemplatePlaceholders } from '@/lib/nurture/template-resolver';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/nurture/templates/:id
 * Fetch a single message template by ID for the authenticated agent's tenant.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    const { data: template, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('[Templates/:id] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * PATCH /api/nurture/templates/:id
 * Update a message template. Validates placeholders and warns if referenced by active step.
 * Requirement 13.6: Allow editing templates not referenced by active playbook steps.
 * Requirement 13.7: Allow editing but warn if referenced by an active playbook step.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    // Verify template exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();

    // Use partial validation — allow updating any subset of fields
    const updateSchema = createTemplateSchema.partial();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Validate placeholders if body is being updated
    if (updates.body) {
      const placeholderValidation = validateTemplatePlaceholders(updates.body);
      if (!placeholderValidation.valid) {
        return NextResponse.json(
          {
            error: 'Unsupported placeholders',
            invalid_placeholders: placeholderValidation.invalid_placeholders,
          },
          { status: 400 }
        );
      }
    }

    // Check if template is referenced by an active playbook step (Requirement 13.7)
    const { data: activeReferences } = await supabase
      .from('playbook_steps')
      .select('id, playbook_id, playbooks!inner(name, active)')
      .eq('template_id', id)
      .eq('playbooks.active', true);

    const referencedByActive = (activeReferences?.length ?? 0) > 0;

    // Perform the update
    const { data: template, error: updateError } = await supabase
      .from('message_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('[Templates/:id] PATCH error:', updateError);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({
      template,
      warning: referencedByActive
        ? 'This template is referenced by active playbook steps. Changes will affect future nurture tasks using this template.'
        : undefined,
    });
  } catch (error) {
    console.error('[Templates/:id] PATCH unexpected error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/**
 * DELETE /api/nurture/templates/:id
 * Delete a message template. Prevents deletion if referenced by an active playbook step (409).
 * Requirement 13.6: Allow deletion of templates not referenced by active playbook steps.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    // Verify template exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('message_templates')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if template is referenced by an active playbook step (Requirement 13.6)
    const { data: activeReferences } = await supabase
      .from('playbook_steps')
      .select('id, playbook_id, playbooks!inner(name, active)')
      .eq('template_id', id)
      .eq('playbooks.active', true);

    if ((activeReferences?.length ?? 0) > 0) {
      const playbookNames = activeReferences!
        .map((ref) => (ref.playbooks as unknown as { name: string }).name)
        .filter(Boolean);

      return NextResponse.json(
        {
          error: 'Cannot delete template referenced by active playbook steps',
          referenced_by: playbookNames,
        },
        { status: 409 }
      );
    }

    // Perform the deletion
    const { error: deleteError } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id);

    if (deleteError) {
      console.error('[Templates/:id] DELETE error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Templates/:id] DELETE unexpected error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
