import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidTransition, validateSnoozeDate } from '@/lib/nurture/task-transitions';
import { taskStatusUpdateSchema } from '@/lib/nurture/types';
import { type TaskStatus } from '@/lib/nurture/types';

/**
 * PATCH /api/nurture/tasks/:id
 * Update a nurture task's status with transition validation.
 *
 * Valid transitions:
 *   pending → done | skipped | snoozed
 *   snoozed → pending
 *
 * Body:
 *   status - target status (done, skipped, snoozed)
 *   due_at - required when status = snoozed (ISO date string)
 *   notes  - optional outcome notes (max 2000 chars)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Parse and validate request body
    const body = await request.json();
    const parsed = taskStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status: targetStatus, due_at, notes } = parsed.data;

    // Fetch the existing task (scoped to tenant via RLS)
    const { data: task, error: fetchError } = await supabase
      .from('nurture_tasks')
      .select('id, status, tenant_id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentStatus = task.status as TaskStatus;

    // Validate state transition
    if (!isValidTransition(currentStatus, targetStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${currentStatus}" to "${targetStatus}"`,
        },
        { status: 400 }
      );
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    };

    // Handle notes (optional for all transitions)
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Handle done: set completed_at
    if (targetStatus === 'done') {
      updateData.completed_at = new Date().toISOString();
    }

    // Handle skipped: set completed_at
    if (targetStatus === 'skipped') {
      updateData.completed_at = new Date().toISOString();
    }

    // Handle snoozed: validate snooze date, update due_at
    if (targetStatus === 'snoozed') {
      if (!due_at) {
        return NextResponse.json(
          { error: 'due_at is required when snoozing a task' },
          { status: 400 }
        );
      }

      const snoozeDate = new Date(due_at);
      if (isNaN(snoozeDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due_at date format' },
          { status: 400 }
        );
      }

      const snoozeValidation = validateSnoozeDate(snoozeDate);
      if (!snoozeValidation.valid) {
        return NextResponse.json(
          { error: snoozeValidation.error },
          { status: 400 }
        );
      }

      updateData.due_at = snoozeDate.toISOString();
    }

    // Perform the update
    const { data: updatedTask, error: updateError } = await supabase
      .from('nurture_tasks')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single();

    if (updateError) {
      console.error('[Nurture Tasks] PATCH update error:', updateError);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('[Nurture Tasks] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
