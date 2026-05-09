import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send';

interface SendMessageBody {
  contact_id: string;
  lead_id?: string;
  body: string;
  tenant_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact_id, lead_id, body, tenant_id }: SendMessageBody = await request.json();

    if (!contact_id || !body || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: contact_id, body, tenant_id' },
        { status: 400 }
      );
    }

    // Fetch contact phone number
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('phone')
      .eq('id', contact_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Send via 360dialog WhatsApp API
    let waMessageId: string | null = null;
    let status: 'sent' | 'failed' = 'sent';

    try {
      const result = await sendWhatsAppMessage(contact.phone, body);
      waMessageId = result.messageId;
    } catch (error) {
      console.error('[Send Message] WhatsApp send failed:', error);
      status = 'failed';
    }

    // Create message record in DB
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        tenant_id,
        contact_id,
        lead_id: lead_id ?? null,
        direction: 'outbound',
        channel: 'whatsapp',
        body,
        media_url: null,
        wa_message_id: waMessageId,
        wa_number_id: null,
        status,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Send Message] DB insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Update lead.last_activity_at if lead_id provided
    if (lead_id) {
      await supabase
        .from('leads')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', lead_id);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[Send Message] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
