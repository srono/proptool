import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN!;

/**
 * GET — Meta webhook verification challenge.
 * Meta sends hub.mode, hub.verify_token, hub.challenge as query params.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST — Receives leadgen webhook events from Meta (Facebook Lead Ads).
 * Payload structure: { entry: [{ changes: [{ field: 'leadgen', value: { ... } }] }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Process each entry (page subscription)
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;

        const leadgenValue = change.value;
        const leadgenId = leadgenValue.leadgen_id;
        const adId = leadgenValue.ad_id ?? null;
        const adsetId = leadgenValue.adgroup_id ?? null;
        const campaignId = leadgenValue.campaign_id ?? null;
        const formId = leadgenValue.form_id ?? null;

        // Fetch the actual lead data from Meta Graph API
        const leadData = await fetchMetaLeadData(leadgenId);
        if (!leadData) continue;

        const { name, phone, email, formAnswers } = parseLeadFields(leadData);
        if (!phone) continue; // Phone is required

        // Determine tenant_id from the page mapping or default
        const tenantId = await resolveTenantId(supabase, entry.id);
        if (!tenantId) continue;

        // Find or create contact by phone
        const contact = await findOrCreateContact(supabase, {
          tenantId,
          phone,
          name: name ?? 'Facebook Lead',
          email,
        });

        // Compute intent score from form answers
        const intentScore = computeIntentScore(formAnswers);

        // Determine eligibility risk
        const residencyStatus = formAnswers?.residency_status ?? null;
        const dealType = formAnswers?.deal_type ?? 'sale';
        const eligibilityRisk = checkEligibilityRisk(residencyStatus, dealType);

        // Create the lead
        const { data: newLead, error: leadError } = await supabase.from('leads').insert({
          tenant_id: tenantId,
          contact_id: contact.id,
          status: 'new_lead',
          source: 'facebook_ad',
          ad_campaign_id: campaignId,
          ad_set_id: adsetId,
          ad_creative_id: adId,
          ad_purpose: formAnswers?.ad_purpose ?? null,
          deal_type: dealType,
          urgency: intentScore >= 4 ? 'hot' : intentScore >= 2 ? 'warm' : 'cold',
          budget_min: formAnswers?.budget_min ? Number(formAnswers.budget_min) : null,
          budget_max: formAnswers?.budget_max ? Number(formAnswers.budget_max) : null,
          residency_status: residencyStatus,
          eligibility_risk: eligibilityRisk,
          eligibility_flag_reason: eligibilityRisk
            ? `Residency: ${residencyStatus ?? 'unknown'} on ${dealType} deal`
            : null,
          intent_score: intentScore,
          timeline_declared: formAnswers?.timeline ?? null,
          last_activity_at: new Date().toISOString(),
        }).select('assigned_to').single();

        if (leadError) {
          console.error('[Meta Webhook] Lead insert error:', leadError);
        }

        // Send push notification to assigned agent (non-blocking)
        if (newLead?.assigned_to) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: newLead.assigned_to,
                title: 'New Lead from Facebook',
                body: `${name ?? 'Someone'} is interested in your property`,
                url: '/leads',
              }),
            });
          } catch (pushError) {
            // Non-blocking — don't fail the webhook if push fails
            console.warn('[Meta Webhook] Push notification failed:', pushError);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Meta Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// --- Helper functions ---

async function fetchMetaLeadData(leadgenId: string) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[Meta Webhook] META_PAGE_ACCESS_TOKEN not configured');
    return null;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseLeadFields(leadData: Record<string, unknown>) {
  const fieldData = (leadData.field_data as Array<{ name: string; values: string[] }>) ?? [];

  let name: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;
  const formAnswers: Record<string, string> = {};

  for (const field of fieldData) {
    const value = field.values?.[0] ?? '';
    const key = field.name.toLowerCase();

    if (key === 'full_name' || key === 'name') {
      name = value;
    } else if (key === 'phone_number' || key === 'phone') {
      phone = normalizePhone(value);
    } else if (key === 'email') {
      email = value;
    } else {
      formAnswers[key] = value;
    }
  }

  return { name, phone, email, formAnswers };
}

function normalizePhone(raw: string): string {
  // Strip non-digits, ensure +65 prefix for SG numbers
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

function computeIntentScore(formAnswers: Record<string, string> | null): number {
  if (!formAnswers) return 2; // Default warm

  let score = 2;

  // Timeline urgency
  const timeline = formAnswers.timeline ?? formAnswers.timeline_declared;
  if (timeline === '0_3mo') score += 2;
  else if (timeline === '3_6mo') score += 1;

  // Budget provided
  if (formAnswers.budget_min || formAnswers.budget_max) score += 1;

  // Specific property type mentioned
  if (formAnswers.property_type || formAnswers.district) score += 1;

  return Math.min(score, 5);
}

function checkEligibilityRisk(
  residencyStatus: string | null,
  dealType: string
): boolean {
  // Flag if foreigner or 'other' residency on landed property deals
  if (!residencyStatus) return false;
  const riskyStatuses = ['foreigner', 'other'];
  const landedDealTypes = ['sale', 'resale']; // landed property purchases
  return riskyStatuses.includes(residencyStatus) && landedDealTypes.includes(dealType);
}

async function resolveTenantId(
  supabase: ReturnType<typeof createAdminClient>,
  pageId: string
): Promise<string | null> {
  // Look up tenant by Facebook page ID mapping
  const { data } = await supabase
    .from('meta_page_connections')
    .select('tenant_id')
    .eq('page_id', pageId)
    .single();

  if (data?.tenant_id) return data.tenant_id;

  // Fallback: use first tenant (single-tenant mode)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single();

  return tenant?.id ?? null;
}

async function findOrCreateContact(
  supabase: ReturnType<typeof createAdminClient>,
  params: { tenantId: string; phone: string; name: string; email: string | null }
) {
  // Try to find existing contact by phone
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .eq('phone', params.phone)
    .single();

  if (existing) return existing;

  // Create new contact
  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id: params.tenantId,
      full_name: params.name,
      phone: params.phone,
      email: params.email,
      source: 'facebook_ad',
      lead_type: 'buyer',
      whatsapp_optin: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[Meta Webhook] Contact creation error:', error);
    throw error;
  }

  return newContact!;
}
