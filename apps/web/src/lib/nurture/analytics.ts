// Feature: nurture-playbooks
// Analytics computation logic for nurture playbooks

// ─── Constants ───────────────────────────────────────────────────────────────

/** Number of days after task completion to count an inbound reply */
export const RESPONSE_WINDOW_DAYS = 7;

/** Number of days before deal creation to attribute a completed task */
export const ATTRIBUTION_WINDOW_DAYS = 180;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompletedWhatsAppTask {
  id: string;
  contact_id: string;
  playbook_id: string;
  completed_at: string; // ISO datetime
}

export interface InboundMessage {
  contact_id: string;
  received_at: string; // ISO datetime
}

export interface Deal {
  id: string;
  contact_id: string;
  created_at: string; // ISO datetime
  status: string;
  net_commission?: number;
}

export interface CompletedTask {
  id: string;
  contact_id: string;
  playbook_id: string;
  completed_at: string; // ISO datetime
}

export interface FunnelMetrics {
  total_contacts: number;
  tasks_created: number;
  tasks_completed: number;
  deals_from_nurtured: number;
}

export interface PlaybookPerformance {
  playbook_id: string;
  tasks_completed: number;
  response_rate: number;
  deals_won: number;
  net_commission: number;
}

// ─── Response Rate Calculation ───────────────────────────────────────────────

/**
 * Calculates the response rate for WhatsApp nurture tasks.
 *
 * Response rate = (unique contacts who sent an inbound WhatsApp message
 * within 7 days of their task being marked done) / (total WhatsApp tasks
 * marked done in the period).
 *
 * When the denominator is zero, the rate is zero.
 *
 * Property 14: Response Rate Calculation
 * Validates: Requirements 11.3
 */
export function computeResponseRate(
  completedTasks: CompletedWhatsAppTask[],
  inboundMessages: InboundMessage[]
): number {
  if (completedTasks.length === 0) {
    return 0;
  }

  const respondedContacts = new Set<string>();

  for (const task of completedTasks) {
    const taskCompletedAt = new Date(task.completed_at).getTime();
    const windowEnd = taskCompletedAt + RESPONSE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    for (const message of inboundMessages) {
      if (message.contact_id !== task.contact_id) continue;

      const receivedAt = new Date(message.received_at).getTime();
      if (receivedAt >= taskCompletedAt && receivedAt <= windowEnd) {
        respondedContacts.add(task.contact_id);
        break;
      }
    }
  }

  return respondedContacts.size / completedTasks.length;
}

// ─── Deal Attribution ────────────────────────────────────────────────────────

/**
 * Determines which deals are attributed to nurture playbooks.
 *
 * A deal is attributed to a playbook if the deal's contact_id matches a
 * contact who has at least one nurture_task from that playbook with status
 * "done" AND that task's completed_at is within 180 days before the deal's
 * created_at.
 *
 * Property 15: Deal Attribution
 * Validates: Requirements 11.4
 */
export function computeDealAttribution(
  deals: Deal[],
  completedTasks: CompletedTask[]
): Map<string, string[]> {
  // Map: deal_id -> list of attributed playbook_ids
  const attributions = new Map<string, string[]>();

  for (const deal of deals) {
    const dealCreatedAt = new Date(deal.created_at).getTime();
    const windowStart = dealCreatedAt - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const attributedPlaybooks = new Set<string>();

    for (const task of completedTasks) {
      if (task.contact_id !== deal.contact_id) continue;

      const taskCompletedAt = new Date(task.completed_at).getTime();
      if (taskCompletedAt >= windowStart && taskCompletedAt <= dealCreatedAt) {
        attributedPlaybooks.add(task.playbook_id);
      }
    }

    if (attributedPlaybooks.size > 0) {
      attributions.set(deal.id, [...attributedPlaybooks]);
    }
  }

  return attributions;
}

/**
 * Checks whether a single deal is attributed to a specific playbook.
 * Convenience helper for property testing.
 */
export function isDealAttributedToPlaybook(
  deal: Deal,
  playbookId: string,
  completedTasks: CompletedTask[]
): boolean {
  const dealCreatedAt = new Date(deal.created_at).getTime();
  const windowStart = dealCreatedAt - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return completedTasks.some(
    (task) =>
      task.contact_id === deal.contact_id &&
      task.playbook_id === playbookId &&
      new Date(task.completed_at).getTime() >= windowStart &&
      new Date(task.completed_at).getTime() <= dealCreatedAt
  );
}

// ─── Funnel Metrics ──────────────────────────────────────────────────────────

/**
 * Computes funnel metrics for a set of nurture data.
 * Pure computation — takes pre-fetched data and returns metrics.
 */
export function computeFunnelMetrics(params: {
  totalContacts: number;
  tasksCreated: number;
  completedTasks: CompletedTask[];
  deals: Deal[];
}): FunnelMetrics {
  const { totalContacts, tasksCreated, completedTasks, deals } = params;

  const attributions = computeDealAttribution(deals, completedTasks);

  return {
    total_contacts: totalContacts,
    tasks_created: tasksCreated,
    tasks_completed: completedTasks.length,
    deals_from_nurtured: attributions.size,
  };
}

// ─── Playbook Performance ────────────────────────────────────────────────────

/**
 * Computes per-playbook performance metrics.
 * Pure computation — takes pre-fetched data and returns metrics per playbook.
 */
export function computePlaybookPerformance(params: {
  playbookIds: string[];
  completedTasks: CompletedTask[];
  completedWhatsAppTasks: CompletedWhatsAppTask[];
  inboundMessages: InboundMessage[];
  deals: Deal[];
}): PlaybookPerformance[] {
  const { playbookIds, completedTasks, completedWhatsAppTasks, inboundMessages, deals } = params;

  const attributions = computeDealAttribution(deals, completedTasks);

  return playbookIds.map((playbookId) => {
    // Tasks completed for this playbook
    const playbookCompletedTasks = completedTasks.filter(
      (t) => t.playbook_id === playbookId
    );

    // WhatsApp tasks for this playbook (for response rate)
    const playbookWhatsAppTasks = completedWhatsAppTasks.filter(
      (t) => t.playbook_id === playbookId
    );

    // Response rate for this playbook
    const responseRate = computeResponseRate(playbookWhatsAppTasks, inboundMessages);

    // Deals attributed to this playbook
    const attributedDeals = deals.filter((deal) => {
      const playbookList = attributions.get(deal.id);
      return playbookList?.includes(playbookId);
    });

    // Only count deals with status "completed" as won
    const dealsWon = attributedDeals.filter((d) => d.status === 'completed');

    // Sum net commission from won deals
    const netCommission = dealsWon.reduce(
      (sum, deal) => sum + (deal.net_commission ?? 0),
      0
    );

    return {
      playbook_id: playbookId,
      tasks_completed: playbookCompletedTasks.length,
      response_rate: responseRate,
      deals_won: dealsWon.length,
      net_commission: netCommission,
    };
  });
}
