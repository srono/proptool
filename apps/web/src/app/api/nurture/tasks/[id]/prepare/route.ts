import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveTemplate } from '@/lib/nurture/template-resolver';
import { computeConsentBadge } from '@/lib/nurture/consent';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/nurture/tasks/:id/prepare
 *
 * Prepares a nurture task for execution by:
 * 1. Fetching the task, associated step, template, and contact data
 * 2. Resolving template placeholders using contact-specific data
 * 3. Re-checking consent at execution time (Requirement 10.6)
 * 4. Returning the resolved message, consent status, and missing fields
 *
 * Requirements: 8.1, 8.2, 8.3, 8.6, 10.6
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
      .select('tenant_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the task with contact and playbook data
    const { data: task, error: taskError } = await supabase
      .from('nurture_tasks')
      .select(
        `
        id,
        contact_id,
        playbook_id,
        step_id,
        channel,
        status,
        contacts!inner (
          id,
          full_name,
          phone,
          owned_property_type,
          owned_property_label,
          owned_property_town,
          mop_date,
          whatsapp_optin,
          channel_preference,
          dnc_registered,
          data_retention_expiry
        ),
        playbooks!inner (
          id,
          trigger_field,
          target_ad_purpose
        )
      `
      )
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const contact = task.contacts as unknown as Record<string, unknown>;
    const playbook = task.playbooks as unknown as Record<string, unknown>;

    // Fetch the step and template if step_id exists
    let templateBody: string | null = null;
    let templateUnavailable = false;

    if (task.step_id) {
      const { data: step } = await supabase
        .from('playbook_steps')
        .select('id, template_id')
        .eq('id', task.step_id)
        .single();

      if (step?.template_id) {
        const { data: template } = await supabase
          .from('message_templates')
          .select('body')
          .eq('id', step.template_id)
          .single();

        if (template) {
          templateBody = template.body as string;
        } else {
          // Template no longer exists (Requirement 8.6)
          templateUnavailable = true;
        }
      }
    }

    // Resolve template placeholders (Requirement 8.1)
    let resolvedMessage: string | null = null;
    let missingFields: string[] = [];

    if (templateBody) {
      const resolveCtx = {
        contact: {
          full_name: contact.full_name as string | null,
          owned_property_label: contact.owned_property_label as string | null,
          owned_property_town: contact.owned_property_town as string | null,
          mop_date: contact.mop_date as string | null,
        },
        agent: { full_name: profile.full_name ?? '' },
        trigger_field: playbook.trigger_field as string,
      };

      const result = resolveTemplate(templateBody, resolveCtx);
      resolvedMessage = result.text;
      missingFields = result.missing_fields;
    }

    // Re-check consent at execution time (Requirement 10.6)
    const consentStatus = computeConsentBadge({
      whatsapp_optin: contact.whatsapp_optin as boolean,
      channel_preference: contact.channel_preference as string,
      ad_purpose: null, // ad_purpose comes from lead context
      target_ad_purpose: playbook.target_ad_purpose as string | null,
      dnc_registered: contact.dnc_registered as boolean,
      data_retention_expiry: contact.data_retention_expiry as string | null,
      task_channel: task.channel as string,
    });

    // Determine consent gap reason for non-green statuses
    let consentGapReason: string | null = null;
    if (consentStatus === 'red') {
      if (!(contact.whatsapp_optin as boolean) && task.channel === 'whatsapp') {
        consentGapReason = 'Contact has not opted in to WhatsApp messages';
      } else if ((contact.channel_preference as string) === 'none') {
        consentGapReason = 'Contact has opted out of all communication channels';
      } else if (
        contact.data_retention_expiry &&
        new Date(contact.data_retention_expiry as string) < new Date()
      ) {
        consentGapReason = 'Data retention period has expired for this contact';
      } else if (task.channel === 'call' && (contact.dnc_registered as boolean)) {
        consentGapReason = 'Contact is registered on the Do Not Call registry';
      }
    } else if (consentStatus === 'yellow') {
      consentGapReason =
        'Contact consent ad purpose does not match the playbook target ad purpose';
    }

    // Build response matching PrepareTaskResponse interface from design
    const response = {
      task_id: task.id as string,
      channel: task.channel as string,
      contact_phone: (contact.phone as string) ?? '',
      contact_name: (contact.full_name as string) ?? '',
      resolved_message: resolvedMessage,
      template_unavailable: templateUnavailable,
      consent_status: consentStatus,
      consent_gap_reason: consentGapReason,
      missing_fields: missingFields,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Nurture Tasks/:id/prepare] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare task' },
      { status: 500 }
    );
  }
}
