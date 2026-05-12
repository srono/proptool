import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Lead,
  LeadCategory,
  DealType,
  DuplicateDetectionResult,
} from '@agentos/shared';

// --- Duplicate Detection Engine ---

/**
 * Parameters for the duplicate detection check.
 */
export interface DuplicateDetectParams {
  contactId: string;
  leadCategory: LeadCategory;
  dealType: DealType;
  originListingId?: string | null;
}

/**
 * Detect potential duplicate leads for a contact.
 *
 * This function:
 * 1. Queries all leads for the given contact
 * 2. Builds a context banner with lead history counts (past leads, closed deals, active leads)
 * 3. Determines if a duplicate exists: same lead_category + created within 14 days + is_active=true
 * 4. Returns a DuplicateDetectionResult with context banner and optional potential duplicate lead
 *
 * @param supabase - Supabase client instance
 * @param params - Detection parameters (contactId, leadCategory, dealType, originListingId)
 * @returns DuplicateDetectionResult with isDuplicate flag, context banner, and optional existing lead
 */
export async function detect(
  supabase: SupabaseClient,
  params: DuplicateDetectParams
): Promise<DuplicateDetectionResult> {
  const { contactId, leadCategory, dealType, originListingId } = params;

  // 7.1 Query all leads for this contact to build context and check duplicates
  const { data: allLeads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DuplicateDetection] detect error:', error);
    // Return safe default — no duplicate detected
    return {
      isDuplicate: false,
      contextBanner: {
        pastLeadsCount: 0,
        closedDealsCount: 0,
        activeLeadsCount: 0,
      },
    };
  }

  const leads: Lead[] = (allLeads ?? []) as Lead[];

  // 7.2 Build context banner data
  const contextBanner = buildContextBanner(leads);

  // 7.3 Determine isDuplicate flag
  const potentialDuplicate = findDuplicate(leads, leadCategory);

  // 7.4 Return DuplicateDetectionResult
  if (potentialDuplicate) {
    return {
      isDuplicate: true,
      reason: `Active lead with same category "${leadCategory}" created within the past 14 days`,
      existingLead: potentialDuplicate,
      contextBanner,
    };
  }

  return {
    isDuplicate: false,
    contextBanner,
  };
}

/**
 * Build context banner data from a contact's lead history.
 * Counts past leads, closed deals (closed_won), and currently active leads.
 */
function buildContextBanner(leads: Lead[]): DuplicateDetectionResult['contextBanner'] {
  const pastLeadsCount = leads.length;
  const closedDealsCount = leads.filter(
    (l) => l.status === 'closed_won'
  ).length;
  const activeLeadsCount = leads.filter((l) => l.is_active === true).length;

  return {
    pastLeadsCount,
    closedDealsCount,
    activeLeadsCount,
  };
}

/**
 * Find a potential duplicate lead: an active lead with the same lead_category
 * created within the past 14 days.
 *
 * Returns the matching lead if found, or undefined if no duplicate detected.
 */
function findDuplicate(
  leads: Lead[],
  leadCategory: LeadCategory
): Lead | undefined {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  return leads.find(
    (l) =>
      l.is_active === true &&
      l.lead_category === leadCategory &&
      new Date(l.created_at) >= fourteenDaysAgo
  );
}
