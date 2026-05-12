import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { segmentDefinitionSchema } from '@/lib/nurture/types';

/**
 * POST /api/nurture/segments/preview
 *
 * Accepts a segment_definition_json, calls the evaluate_segment RPC,
 * and returns the matching contact count and a sample (first 10) of matching contacts.
 *
 * Requirements: 12.1, 12.9
 */
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

    // Parse and validate request body
    const body = await request.json();
    const parsed = segmentDefinitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { conditions } = parsed.data;

    // Call the evaluate_segment RPC function
    const { data: contacts, error: rpcError } = await supabase.rpc('evaluate_segment', {
      p_tenant_id: tenantId,
      p_conditions: conditions,
    });

    if (rpcError) {
      console.error('[Segments Preview] RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Failed to evaluate segment' },
        { status: 500 }
      );
    }

    const matchingContacts = contacts ?? [];
    const count = matchingContacts.length;
    const sample = matchingContacts.slice(0, 10).map((contact: Record<string, unknown>) => ({
      id: contact.id,
      full_name: contact.full_name,
      phone: contact.phone,
      email: contact.email,
      owned_property_type: contact.owned_property_type,
      owned_property_label: contact.owned_property_label,
      owned_property_town: contact.owned_property_town,
    }));

    return NextResponse.json({ count, sample });
  } catch (error) {
    console.error('[Segments Preview] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
