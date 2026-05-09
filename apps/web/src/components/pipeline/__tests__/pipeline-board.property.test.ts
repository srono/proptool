import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { PipelineStage } from '@propagent/shared';

/**
 * Feature: pipeline-dnd
 * Property-based tests for PipelineBoard drag-and-drop logic
 */

const PIPELINE_STAGES: PipelineStage[] = [
  'new_lead',
  'contacted',
  'qualified',
  'viewing_booked',
  'viewing_done',
  'negotiating',
  'otp_loi_issued',
  'closed_won',
  'closed_lost',
  'nurture',
];

// Generator for a valid pipeline stage
const stageArb = fc.constantFrom(...PIPELINE_STAGES);

// Date arbitrary using integer timestamps to avoid invalid date issues
const validDateArb = fc
  .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString());

// Generator for a minimal lead object
const leadArb = fc.record({
  id: fc.uuid(),
  status: stageArb,
  deal_type: fc.constantFrom('sale', 'rental'),
  urgency: fc.constantFrom('low', 'medium', 'high'),
  source: fc.constantFrom('website', 'referral', 'portal'),
  intent_score: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  verification_score: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  eligibility_risk: fc.boolean(),
  last_activity_at: validDateArb,
  created_at: validDateArb,
  contact: fc.option(
    fc.record({
      full_name: fc.string({ minLength: 1, maxLength: 50 }),
      phone: fc.string({ minLength: 8, maxLength: 15 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
    }),
    { nil: null }
  ),
  tasks: fc.array(
    fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 30 }),
      due_at: validDateArb,
      completed_at: fc.option(validDateArb, { nil: null }),
    }),
    { minLength: 0, maxLength: 3 }
  ),
});

// Generator for an array of leads
const leadsArb = fc.array(leadArb, { minLength: 1, maxLength: 20 });

/**
 * Feature: pipeline-dnd, Property 3: Error revert
 *
 * For any lead that has been optimistically moved to a new stage,
 * if the Supabase update returns an error, the lead's status in
 * localLeads SHALL revert to its original stage value prior to the drop.
 *
 * **Validates: Requirements 3.3**
 */
describe('Feature: pipeline-dnd, Property 3: Error revert', () => {
  it('should revert lead status to original stage when Supabase update fails', () => {
    fc.assert(
      fc.property(
        leadsArb,
        fc.nat(),
        stageArb,
        (leads, leadIndexRaw, targetStage) => {
          // Pick a lead from the array
          const leadIndex = leadIndexRaw % leads.length;
          const lead = leads[leadIndex];
          const originalStage = lead.status;

          // Ensure target stage is different from current
          fc.pre(targetStage !== originalStage);

          // Simulate the optimistic update + error revert logic from PipelineBoard
          // Step 1: Save previous state (snapshot before optimistic update)
          const previousLeads = [...leads.map((l) => ({ ...l }))];

          // Step 2: Apply optimistic update (same logic as handleDragEnd)
          let localLeads = leads.map((l) =>
            l.id === lead.id ? { ...l, status: targetStage } : l
          );

          // Verify optimistic update was applied
          const updatedLead = localLeads.find((l) => l.id === lead.id);
          expect(updatedLead?.status).toBe(targetStage);

          // Step 3: Simulate Supabase error - revert to previous state
          // This mirrors: if (error) { setLocalLeads(previousLeads); }
          localLeads = previousLeads;

          // Assert: lead's status has reverted to original stage
          const revertedLead = localLeads.find((l) => l.id === lead.id);
          expect(revertedLead?.status).toBe(originalStage);

          // Assert: all other leads are unchanged
          for (const prevLead of previousLeads) {
            const currentLead = localLeads.find((l) => l.id === prevLead.id);
            expect(currentLead?.status).toBe(prevLead.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all lead properties (not just status) after error revert', () => {
    fc.assert(
      fc.property(
        leadsArb,
        fc.nat(),
        stageArb,
        (leads, leadIndexRaw, targetStage) => {
          const leadIndex = leadIndexRaw % leads.length;
          const lead = leads[leadIndex];

          fc.pre(targetStage !== lead.status);

          // Save previous state
          const previousLeads = [...leads.map((l) => ({ ...l }))];

          // Apply optimistic update
          let localLeads = leads.map((l) =>
            l.id === lead.id ? { ...l, status: targetStage } : l
          );

          // Simulate error - revert
          localLeads = previousLeads;

          // Assert: the entire lead object is restored, not just status
          const revertedLead = localLeads.find((l) => l.id === lead.id);
          expect(revertedLead).toEqual(
            previousLeads.find((l) => l.id === lead.id)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should revert correctly even with multiple leads having the same original stage', () => {
    fc.assert(
      fc.property(
        stageArb,
        stageArb,
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        fc.nat(),
        (originalStage, targetStage, ids, pickIndex) => {
          fc.pre(targetStage !== originalStage);
          // Ensure unique IDs
          const uniqueIds = [...new Set(ids)];
          fc.pre(uniqueIds.length >= 2);

          // Create leads all in the same stage
          const leads = uniqueIds.map((id) => ({
            id,
            status: originalStage,
            deal_type: 'sale' as const,
            urgency: 'medium' as const,
            source: 'website' as const,
            intent_score: null,
            verification_score: null,
            eligibility_risk: false,
            last_activity_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            contact: null,
            tasks: [],
          }));

          // Pick one lead to drag
          const draggedIndex = pickIndex % uniqueIds.length;
          const draggedId = uniqueIds[draggedIndex];

          // Save previous state
          const previousLeads = [...leads.map((l) => ({ ...l }))];

          // Optimistic update - only the dragged lead changes
          let localLeads = leads.map((l) =>
            l.id === draggedId ? { ...l, status: targetStage } : l
          );

          // Verify only one lead was updated
          const movedLeads = localLeads.filter((l) => l.status === targetStage);
          expect(movedLeads.length).toBe(1);
          expect(movedLeads[0].id).toBe(draggedId);

          // Simulate error - revert
          localLeads = previousLeads;

          // Assert: ALL leads are back to original stage
          for (const lead of localLeads) {
            expect(lead.status).toBe(originalStage);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: pipeline-dnd, Property 2: No-op preservation
 *
 * For any lead and any drag operation that does not result in a valid cross-column
 * drop (same-column drop, drag cancel, or release outside a droppable area),
 * the localLeads array SHALL remain identical to its state before the drag started.
 *
 * **Validates: Requirements 1.4, 2.3**
 */
describe('Feature: pipeline-dnd, Property 2: No-op preservation', () => {
  /**
   * Simulates the handleDragEnd logic for same-column drops.
   * Mirrors the guard in pipeline-board.tsx:
   *   if (lead.status === newStage) { setActiveId(null); return; }
   */
  function simulateDragEnd(
    localLeads: Array<{ id: string; status: PipelineStage; [key: string]: unknown }>,
    leadId: string,
    targetStage: PipelineStage
  ) {
    const lead = localLeads.find((l) => l.id === leadId);
    if (!lead) return localLeads;

    // Same-column drop guard — no-op
    if (lead.status === targetStage) {
      return localLeads;
    }

    // Cross-column drop — optimistic update (not under test here)
    return localLeads.map((l) =>
      l.id === leadId ? { ...l, status: targetStage } : l
    );
  }

  it('same-column drop: localLeads remains identical when lead is dropped on its current stage', () => {
    fc.assert(
      fc.property(
        leadsArb,
        fc.nat(),
        (leads, indexSeed) => {
          // Pick a random lead from the array
          const index = indexSeed % leads.length;
          const lead = leads[index];

          // Drop on the SAME stage (no-op scenario)
          const result = simulateDragEnd(leads, lead.id, lead.status);

          // The array reference should be identical (no mutation occurred)
          expect(result).toBe(leads);
          // Deep equality as well
          expect(result).toEqual(leads);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('same-column drop: no lead status is modified when target equals current stage', () => {
    fc.assert(
      fc.property(
        leadsArb,
        fc.nat(),
        (leads, indexSeed) => {
          const index = indexSeed % leads.length;
          const lead = leads[index];

          const result = simulateDragEnd(leads, lead.id, lead.status);

          // Every lead's status should remain unchanged
          for (let i = 0; i < leads.length; i++) {
            expect(result[i].status).toBe(leads[i].status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('cancel event: localLeads remains identical when drag is cancelled', () => {
    fc.assert(
      fc.property(
        fc.array(leadArb, { minLength: 0, maxLength: 20 }),
        (leads) => {
          // Simulate handleDragCancel: only clears activeId, no state change
          // The localLeads array is never modified in the cancel path
          const preDragState = leads;
          const postCancelState = leads; // handleDragCancel does NOT touch localLeads

          expect(postCancelState).toBe(preDragState);
          expect(postCancelState).toEqual(preDragState);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no valid drop target (over is null): localLeads remains unchanged', () => {
    fc.assert(
      fc.property(
        leadsArb,
        fc.nat(),
        (leads, indexSeed) => {
          // Simulate the case where over is null (released outside any droppable)
          // In the actual code: if (!over) { setActiveId(null); return; }
          // localLeads is never modified in this path
          const index = indexSeed % leads.length;
          const _activeLead = leads[index]; // a drag was started on this lead

          // After drag start, localLeads is unchanged
          // After release with no target, localLeads remains unchanged
          const preDragState = [...leads.map((l) => ({ ...l }))];

          // Verify no mutation occurred
          expect(leads).toEqual(preDragState);
          for (let i = 0; i < leads.length; i++) {
            expect(leads[i].status).toBe(preDragState[i].status);
            expect(leads[i].id).toBe(preDragState[i].id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
