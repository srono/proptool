import type { Lead, PipelineStage } from '@propagent/shared';

const EXCLUDED_STATUSES: PipelineStage[] = ['closed_won', 'closed_lost', 'nurture'];

/**
 * Selects the most recently active lead from a list, excluding leads
 * with status closed_won, closed_lost, or nurture.
 *
 * Returns the lead with the most recent last_activity_at timestamp,
 * or null if no active leads exist.
 */
export function selectActiveLead(leads: Lead[]): Lead | null {
  const activeLeads = leads.filter(
    (lead) => !EXCLUDED_STATUSES.includes(lead.status)
  );

  if (activeLeads.length === 0) {
    return null;
  }

  return activeLeads.reduce((mostRecent, current) => {
    const currentTime = new Date(current.last_activity_at).getTime();
    const mostRecentTime = new Date(mostRecent.last_activity_at).getTime();
    return currentTime > mostRecentTime ? current : mostRecent;
  });
}
