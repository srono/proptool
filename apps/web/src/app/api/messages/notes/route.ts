import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CreateNoteBody {
  lead_id: string;
  contact_id: string;
  body: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_id, contact_id, body }: CreateNoteBody = await request.json();

    // Validate required fields
    if (!lead_id || !contact_id || !body || !body.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: lead_id, contact_id, body' },
        { status: 400 }
      );
    }

    const trimmedBody = body.trim();

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

    // Insert note into messages table
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        contact_id,
        lead_id,
        direction: 'outbound',
        channel: 'note',
        body: trimmedBody,
        media_url: null,
        wa_message_id: null,
        wa_number_id: null,
        status: 'delivered',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Notes] DB insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    // Update lead.last_activity_at
    await supabase
      .from('leads')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', lead_id);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[Notes] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
