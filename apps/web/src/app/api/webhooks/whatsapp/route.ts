import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST — Receives inbound WhatsApp messages from 360dialog.
 * 360dialog webhook payload structure:
 * { messages: [{ from, id, timestamp, type, text?: { body }, image?: { ... } }], contacts: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // 360dialog sends messages array
    const messages = body.messages ?? [];
    const waContacts = body.contacts ?? [];

    for (const msg of messages) {
      const senderPhone = normalizePhone(msg.from);
      const messageId = msg.id;
      const messageBody = msg.text?.body ?? msg.caption ?? '';
      const mediaUrl = msg.image?.link ?? msg.document?.link ?? msg.video?.link ?? null;

      if (!senderPhone) continue;

      // Get sender name from 360dialog contacts payload
      const waContact = waContacts.find(
        (c: { wa_id: string }) => c.wa_id === msg.from
      );
      const senderName = waContact?.profile?.name ?? 'WhatsApp User';

      // Resolve tenant (single-tenant mode or by WA number ID)
      const tenantId = await resolveTenantId(supabase, body.metadata?.phone_number_id);
      if (!tenantId) continue;

      // Find or create contact by phone
      const contact = await findOrCreateContact(supabase, {
        tenantId,
        phone: senderPhone,
        name: senderName,
      });

      // Find active lead for this contact (most recent non-closed lead)
      const activeLead = await findActiveLead(supabase, contact.id, tenantId);

      // Create message record
      const { error: msgError } = await supabase.from('messages').insert({
        tenant_id: tenantId,
        contact_id: contact.id,
        lead_id: activeLead?.id ?? null,
        direction: 'inbound',
        channel: 'whatsapp',
        body: messageBody,
        media_url: mediaUrl,
        wa_message_id: messageId,
        wa_number_id: body.metadata?.phone_number_id ?? null,
        status: 'delivered',
        sent_at: new Date(Number(msg.timestamp) * 1000).toISOString(),
      });

      if (msgError) {
        console.error('[WhatsApp Webhook] Message insert error:', msgError);
      }

      // Update lead last_activity_at if linked
      if (activeLead) {
        await supabase
          .from('leads')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', activeLead.id);
      }

      // If no lead exists and this is a new contact, create a lead from WhatsApp
      if (!activeLead) {
        await supabase.from('leads').insert({
          tenant_id: tenantId,
          contact_id: contact.id,
          status: 'new_lead',
          source: 'whatsapp',
          deal_type: 'sale',
          urgency: 'warm',
          eligibility_risk: false,
          last_activity_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// --- Helper functions ---

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('65') && digits.length === 10) {
    digits = '+' + digits;
  } else if (digits.length === 8) {
    digits = '+65' + digits;
  } else if (!digits.startsWith('+')) {
    digits = '+' + digits;
  }
  return digits;
}

async function resolveTenantId(
  supabase: ReturnType<typeof createAdminClient>,
  phoneNumberId?: string
): Promise<string | null> {
  if (phoneNumberId) {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('tenant_id')
      .eq('phone_number_id', phoneNumberId)
      .single();

    if (data?.tenant_id) return data.tenant_id;
  }

  // Fallback: single-tenant mode
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single();

  return tenant?.id ?? null;
}

async function findOrCreateContact(
  supabase: ReturnType<typeof createAdminClient>,
  params: { tenantId: string; phone: string; name: string }
) {
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .eq('phone', params.phone)
    .single();

  if (existing) return existing;

  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id: params.tenantId,
      full_name: params.name,
      phone: params.phone,
      email: null,
      source: 'whatsapp',
      lead_type: 'buyer',
      whatsapp_optin: true,
      consent_source: 'whatsapp',
      consent_given_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[WhatsApp Webhook] Contact creation error:', error);
    throw error;
  }

  return newContact!;
}

async function findActiveLead(
  supabase: ReturnType<typeof createAdminClient>,
  contactId: string,
  tenantId: string
) {
  const closedStatuses = ['closed_won', 'closed_lost'];

  const { data } = await supabase
    .from('leads')
    .select('id, status')
    .eq('contact_id', contactId)
    .eq('tenant_id', tenantId)
    .not('status', 'in', `(${closedStatuses.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}
