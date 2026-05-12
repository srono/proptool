import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTemplateSchema } from '@/lib/nurture/types';
import { validateTemplatePlaceholders } from '@/lib/nurture/template-resolver';

/**
 * GET /api/nurture/templates
 * Fetch message templates for the authenticated agent's tenant.
 */
export async function GET() {
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

    const { data: templates, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Templates] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[Templates] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * POST /api/nurture/templates
 * Create a new message template. Validates Zod schema and rejects unsupported placeholders.
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
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, channel, body: templateBody } = parsed.data;

    // Validate placeholders — reject unsupported ones
    const placeholderValidation = validateTemplatePlaceholders(templateBody);
    if (!placeholderValidation.valid) {
      return NextResponse.json(
        {
          error: 'Unsupported placeholders',
          invalid_placeholders: placeholderValidation.invalid_placeholders,
        },
        { status: 400 }
      );
    }

    const { data: template, error: insertError } = await supabase
      .from('message_templates')
      .insert({
        tenant_id: profile.tenant_id,
        name,
        channel,
        body: templateBody,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Templates] POST insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('[Templates] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
