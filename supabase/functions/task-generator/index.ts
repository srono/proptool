// supabase/functions/task-generator/index.ts
// Edge Function triggered by pg_cron every 60 minutes.
// Evaluates active playbooks, computes eligible contacts via segment RPC,
// generates nurture tasks within the scheduling horizon, and applies PDPA exclusions.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SCHEDULING_HORIZON_DAYS = 7;

interface PlaybookStep {
  id: string;
  playbook_id: string;
  offset_days: number;
  channel: "whatsapp" | "email" | "call" | "task_only";
  template_id: string | null;
  create_task: boolean;
  title: string;
  sort_order: number;
}

interface Playbook {
  id: string;
  tenant_id: string;
  name: string;
  active: boolean;
  segment_definition_json: { conditions: unknown[] };
  trigger_field: string;
  created_by: string;
  playbook_steps: PlaybookStep[];
}

interface Contact {
  id: string;
  tenant_id: string;
  whatsapp_optin: boolean;
  channel_preference: string;
  data_retention_expiry: string | null;
  [key: string]: unknown;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function evaluateSegment(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  segmentDefinition: { conditions: unknown[] }
): Promise<Contact[]> {
  const { data, error } = await supabase.rpc("evaluate_segment", {
    p_tenant_id: tenantId,
    p_conditions: segmentDefinition.conditions,
  });

  if (error) {
    throw new Error(`Segment evaluation failed: ${error.message}`);
  }

  return (data as Contact[]) ?? [];
}

async function getLeadAssignment(
  supabase: ReturnType<typeof createClient>,
  contactId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("leads")
    .select("assigned_to")
    .eq("contact_id", contactId)
    .not("assigned_to", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.assigned_to ?? null;
}

async function generateTasksForTenant(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<{ tasksCreated: number; errors: number }> {
  let tasksCreated = 0;
  let errors = 0;

  const today = startOfDay(new Date());
  const horizonDate = addDays(today, SCHEDULING_HORIZON_DAYS);

  // Fetch all active playbooks with their steps for this tenant
  const { data: playbooks, error: playbooksError } = await supabase
    .from("playbooks")
    .select("*, playbook_steps(*)")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  if (playbooksError) {
    console.error(
      `Error fetching playbooks for tenant ${tenantId}:`,
      playbooksError
    );
    return { tasksCreated, errors: 1 };
  }

  for (const playbook of (playbooks as Playbook[]) ?? []) {
    try {
      // Evaluate segment to get eligible contacts
      const contacts = await evaluateSegment(
        supabase,
        tenantId,
        playbook.segment_definition_json
      );

      for (const contact of contacts) {
        try {
          // Get the trigger field value for this contact
          const triggerValue = contact[playbook.trigger_field];
          if (!triggerValue) continue;

          // Get lead assignment for this contact (cached per contact)
          const leadAssignedTo = await getLeadAssignment(supabase, contact.id);

          for (const step of playbook.playbook_steps) {
            // Skip steps that don't create tasks
            if (!step.create_task) continue;

            // Compute touch date: trigger field value + offset_days
            const touchDate = addDays(
              new Date(triggerValue as string),
              step.offset_days
            );

            // Only generate tasks within the scheduling horizon [today, today + 7 days]
            if (touchDate > horizonDate || touchDate < today) continue;

            // PDPA exclusions
            if (step.channel === "whatsapp" && !contact.whatsapp_optin) {
              continue;
            }
            if (contact.channel_preference === "none") {
              continue;
            }
            if (
              contact.data_retention_expiry &&
              new Date(contact.data_retention_expiry) < today
            ) {
              continue;
            }

            // Determine channel: task_only maps to "note"
            const taskChannel =
              step.channel === "task_only" ? "note" : step.channel;

            // Determine assignment: lead's assigned_to or playbook's created_by
            const assignedTo = leadAssignedTo ?? playbook.created_by;

            // Upsert with deduplication via unique index (ON CONFLICT DO NOTHING)
            const { error: upsertError } = await supabase
              .from("nurture_tasks")
              .upsert(
                {
                  tenant_id: tenantId,
                  contact_id: contact.id,
                  playbook_id: playbook.id,
                  step_id: step.id,
                  assigned_to: assignedTo,
                  due_at: touchDate.toISOString(),
                  status: "pending",
                  channel: taskChannel,
                },
                {
                  onConflict: "contact_id,playbook_id,step_id",
                  ignoreDuplicates: true,
                }
              );

            if (upsertError) {
              console.error(
                `Error upserting task for contact ${contact.id}, playbook ${playbook.id}, step ${step.id}:`,
                upsertError
              );
              errors++;
            } else {
              tasksCreated++;
            }
          }
        } catch (err) {
          console.error(`Error processing contact ${contact.id}:`, err);
          errors++;
        }
      }
    } catch (err) {
      console.error(`Error processing playbook ${playbook.id}:`, err);
      errors++;
    }
  }

  return { tasksCreated, errors };
}

serve(async (req: Request) => {
  try {
    // Verify the request is authorized (pg_cron or admin invocation)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();

    // Fetch all distinct tenant IDs that have active playbooks
    const { data: tenants, error: tenantsError } = await supabase
      .from("playbooks")
      .select("tenant_id")
      .eq("active", true);

    if (tenantsError) {
      console.error("Error fetching tenants with active playbooks:", tenantsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tenants" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Deduplicate tenant IDs
    const uniqueTenantIds = [
      ...new Set((tenants ?? []).map((t: { tenant_id: string }) => t.tenant_id)),
    ];

    let totalTasksCreated = 0;
    let totalErrors = 0;

    for (const tenantId of uniqueTenantIds) {
      try {
        const result = await generateTasksForTenant(supabase, tenantId);
        totalTasksCreated += result.tasksCreated;
        totalErrors += result.errors;
      } catch (err) {
        console.error(`Error processing tenant ${tenantId}:`, err);
        totalErrors++;
      }
    }

    const summary = {
      success: true,
      tenants_processed: uniqueTenantIds.length,
      tasks_created: totalTasksCreated,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    };

    console.log("Task generator completed:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Task generator fatal error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
