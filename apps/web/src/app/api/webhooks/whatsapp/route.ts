import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  resolveContact,
  updateLatestSource,
  updateLastInbound,
} from '@/lib/services/contact-service';
import type { ContactCreateData } from '@/lib/services/contact-service';
import { checkDuplicates } from '@/lib/services/lead-service';

/**
 * POST — Receives inbound WhatsApp messages from 360dialog.
 * 360dialog webhook payload structure:
 * { messages: [{ from, id, timestamp, type, text?: { body }, image?: { ... } }], contacts: [...] }
 *
 * Uses Contact Service for resolution and Lead Service for duplicate detection.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // 360dialog sends messages array
    const messages = body.messages ?? [];
    const waContacts = body.contacts ?? [];

    for (const msg of messages) {
      const senderPhone = msg.from;
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

      // --- Step 13.2: Use Contact Service resolveContact() ---
      const contactData: ContactCreateData = {
        tenant_id: tenantId,
        full_name: senderName,
        phone: senderPhone,
        email: null,
        source: 'whatsapp',
        whatsapp_optin: true,
        consent_source: 'whatsapp',
        consent_given_at: new Date().toISOString(),
      };

      const contact = await resolveContact(supabase, tenantId, senderPhone, contactData);

      // --- Step 13.3: Update latest source after contact resolution ---
      await updateLatestSource(supabase, contact.id, 'whatsapp');

      // --- Step 13.4: Update last inbound (WhatsApp is an inbound channel) ---
      await updateLastInbound(supabase, contact.id);

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

      // --- Step 13.5: If no lead exists, create one with duplicate detection ---
      if (!activeLead) {
        const leadCategory = 'buyer'; // Default category for WhatsApp-initiated leads
        const dealType = 'sale'; // Default deal type for WhatsApp-initiated leads

        // Check for duplicates before creating
        const duplicateDetection = await checkDuplicates(
          supabase,
          contact.id,
          leadCategory,
          dealType
        );

        const now = new Date().toISOString();

        // Auto-create new lead by default for webhooks, store duplicate_of_lead_id if detected
        await supabase.from('leads').insert({
          tenant_id: tenantId,
          contact_id: contact.id,
          status: 'new_lead',
          source: 'whatsapp',
          deal_type: dealType,
          lead_category: leadCategory,
          urgency: 'warm',
          is_active: true,
          opened_at: now,
          // Store duplicate_of_lead_id if a duplicate was detected
          duplicate_of_lead_id: duplicateDetection.existingLead?.id ?? null,
          eligibility_risk: false,
          last_activity_at: now,
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
