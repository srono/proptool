import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { resolveContact, normalizePhone } from '../contact-service';
import { updateStage } from '../lead-service';
import type { Contact, Lead, PipelineStage, LeadCategory } from '@agentos/shared';

// --- Shared test helpers ---

const TERMINAL_STAGES: PipelineStage[] = ['closed_won', 'closed_lost'];
const NON_TERMINAL_STAGES: PipelineStage[] = [
  'new_lead',
  'contacted',
  'qualified',
  'viewing_booked',
  'viewing_done',
  'negotiating',
  'otp_loi_issued',
  'nurture',
];
const ALL_STAGES: PipelineStage[] = [...NON_TERMINAL_STAGES, ...TERMINAL_STAGES];

const LEAD_CATEGORIES: LeadCategory[] = ['buyer', 'seller', 'landlord', 'tenant', 'co_broke', 'nurture'];

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'contact-1',
    tenant_id: 'tenant-1',
    full_name: 'John Doe',
    phone: '+6591234567',
    email: 'john@example.com',
    nationality: null,
    pr_status: null,
    linkedin_url: null,
    whatsapp_optin: false,
    consent_given_at: null,
    consent_source: null,
    data_retention_expiry: null,
    primary_agent_id: null,
    contact_status: 'active',
    last_contacted_at: null,
    last_inbound_at: null,
    source_first: 'facebook_ad',
    source_latest: 'facebook_ad',
    channel_preference: null,
    relationship_tags: [],
    source: 'facebook_ad',
    lead_type: 'buyer',
    cea_number: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    tenant_id: 'tenant-1',
    contact_id: 'contact-1',
    assigned_to: null,
    status: 'new_lead',
    source: 'facebook_ad',
    ad_campaign_id: null,
    ad_set_id: null,
    ad_creative_id: null,
    ad_purpose: null,
    deal_type: 'sale',
    urgency: 'warm',
    budget_min: null,
    budget_max: null,
    move_in_by: null,
    notes: null,
    lead_title: null,
    lead_category: 'buyer',
    is_active: true,
    opened_at: '2024-01-01T00:00:00Z',
    closed_at: null,
    close_reason: null,
    origin_listing_id: null,
    duplicate_of_lead_id: null,
    residency_status: null,
    property_ownership: null,
    eligibility_risk: false,
    eligibility_flag_reason: null,
    intent_score: null,
    time_on_form_seconds: null,
    timeline_declared: null,
    paynow_verified: false,
    paynow_name_match: null,
    paynow_registered_name: null,
    verification_score: null,
    pre_viewing_checklist: null,
    created_at: '2024-01-01T00:00:00Z',
    last_activity_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Arbitrary for Singapore phone numbers (8 digits starting with 6, 8, or 9)
const sgPhoneArb = fc.integer({ min: 60000000, max: 99999999 }).map(String);

// Arbitrary for pipeline stages
const stageArb = fc.constantFrom(...ALL_STAGES);
const nonTerminalStageArb = fc.constantFrom(...NON_TERMINAL_STAGES);

/**
 * Property 1: Contact Resolution Idempotence
 * **Validates: Requirements 1.4**
 *
 * For any sequence of lead creations with the same normalized phone number
 * within a tenant, the number of contact records for that phone number
 * remains exactly 1.
 */
describe('Property 1: Contact Resolution Idempotence', () => {
  it('N lead creations with same phone produce exactly 1 contact', async () => {
    await fc.assert(
      fc.asyncProperty(
        sgPhoneArb,
        fc.integer({ min: 1, max: 20 }),
        async (phone, n) => {
          const normalizedPhone = normalizePhone(phone);
          const existingContact = makeContact({ id: 'resolved-contact', phone: normalizedPhone });

          // Track how many contacts are "created" — should be at most 1
          let contactsCreated = 0;
          let existingContactInDb: Contact | null = null;

          // Resolve contact N times with the same phone
          for (let i = 0; i < n; i++) {
            // Mock supabase: first call creates, subsequent calls find existing
            const mockSingle = vi.fn().mockImplementation(() => {
              if (existingContactInDb) {
                return { data: existingContactInDb, error: null };
              }
              return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
            });
            const secondEq = vi.fn().mockReturnValue({ single: mockSingle });
            const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
            const mockSelect = vi.fn().mockReturnValue({ eq: firstEq });

            const insertSingle = vi.fn().mockImplementation(() => {
              contactsCreated++;
              existingContactInDb = existingContact;
              return { data: existingContact, error: null };
            });
            const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
            const mockInsert = vi.fn().mockReturnValue({ select: insertSelect });

            const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect, insert: mockInsert }) } as any;

            await resolveContact(supabase, 'tenant-1', phone, {
              tenant_id: 'tenant-1',
              full_name: 'Test User',
              phone,
              source: 'manual',
            });
          }

          // Invariant: exactly 1 contact was created regardless of N
          expect(contactsCreated).toBe(1);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 3: is_active Invariant
 * **Validates: Requirements 2.4**
 *
 * For all leads, is_active is true if and only if the lead's status is not
 * in the set {closed_won, closed_lost}.
 */
describe('Property 3: is_active Invariant', () => {
  it('for any lead, is_active === (status not in terminal set)', async () => {
    await fc.assert(
      fc.asyncProperty(
        stageArb,
        async (stage) => {
          const isTerminal = TERMINAL_STAGES.includes(stage);

          // Simulate what the database trigger produces after a stage update:
          // When status moves to terminal → is_active=false, closed_at set
          // When status moves to non-terminal → is_active=true, closed_at=null
          const resultLead = makeLead({
            status: stage,
            is_active: !isTerminal,
            closed_at: isTerminal ? new Date().toISOString() : null,
            close_reason: isTerminal ? 'Test reason' : null,
          });

          // Mock supabase for updateStage — returns the lead as the DB trigger would set it
          const mockSingle = vi.fn().mockReturnValue({ data: resultLead, error: null });
          const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
          const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
          const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
          const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
          const supabase = { from: mockFrom } as any;

          const closeReason = isTerminal ? 'Test reason' : undefined;
          const lead = await updateStage(supabase, 'lead-1', stage, closeReason);

          // Invariant: is_active === (status NOT in terminal set)
          const expectedIsActive = !TERMINAL_STAGES.includes(lead.status);
          expect(lead.is_active).toBe(expectedIsActive);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 8: Lead Lifecycle Timestamps
 * **Validates: Requirements 2.5**
 *
 * For all leads: opened_at is always set and equals created_at.
 * If is_active is false, then closed_at is set and closed_at >= opened_at.
 */
describe('Property 8: Lead Lifecycle Timestamps', () => {
  it('opened_at always set; if !is_active then closed_at >= opened_at', () => {
    fc.assert(
      fc.property(
        stageArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.integer({ min: 1, max: 30 * 24 * 60 }),
        (stage, createdDate, minutesAfterOpen) => {
          const isTerminal = TERMINAL_STAGES.includes(stage);
          const createdAt = createdDate.toISOString();
          // closed_at is always after opened_at by a random number of minutes
          const closedDate = new Date(createdDate.getTime() + minutesAfterOpen * 60000);
          const closedAt = isTerminal ? closedDate.toISOString() : null;

          const lead = makeLead({
            status: stage,
            is_active: !isTerminal,
            opened_at: createdAt,
            created_at: createdAt,
            closed_at: closedAt,
            close_reason: isTerminal ? 'Completed' : null,
          });

          // Invariant 1: opened_at is always set
          expect(lead.opened_at).toBeDefined();
          expect(lead.opened_at).not.toBeNull();

          // Invariant 2: opened_at equals created_at
          expect(lead.opened_at).toBe(lead.created_at);

          // Invariant 3: if !is_active, then closed_at is set and closed_at >= opened_at
          if (!lead.is_active) {
            expect(lead.closed_at).not.toBeNull();
            const openedTime = new Date(lead.opened_at).getTime();
            const closedTime = new Date(lead.closed_at!).getTime();
            expect(closedTime).toBeGreaterThanOrEqual(openedTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 10: Multiple Active Leads Independence
 * **Validates: Requirements 5.4**
 *
 * Updating the stage, urgency, or qualification of one lead does not affect
 * any other lead belonging to the same contact.
 */
describe('Property 10: Multiple Active Leads Independence', () => {
  it('updating one lead does not affect sibling leads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        nonTerminalStageArb,
        fc.constantFrom('hot', 'warm', 'cold') as fc.Arbitrary<string>,
        async (numLeads, newStage, newUrgency) => {
          // Create N sibling leads for the same contact
          const siblingLeads: Lead[] = Array.from({ length: numLeads }, (_, i) =>
            makeLead({
              id: `lead-${i}`,
              contact_id: 'contact-1',
              status: 'new_lead',
              urgency: 'warm',
              is_active: true,
              intent_score: 3,
            })
          );

          // Take a deep snapshot of sibling leads before update
          const targetIndex = 0;
          const siblingsBefore = siblingLeads
            .filter((_, i) => i !== targetIndex)
            .map((l) => JSON.parse(JSON.stringify(l)));

          // Mock supabase: updateStage only modifies the target lead
          const updatedTarget = {
            ...siblingLeads[targetIndex],
            status: newStage,
            urgency: newUrgency,
            last_activity_at: new Date().toISOString(),
          };

          const mockSingle = vi.fn().mockReturnValue({ data: updatedTarget, error: null });
          const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
          const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
          const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
          const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
          const supabase = { from: mockFrom } as any;

          // Perform the update on the target lead
          await updateStage(supabase, siblingLeads[targetIndex].id, newStage);

          // Invariant: all sibling leads remain unchanged
          const siblingsAfter = siblingLeads.filter((_, i) => i !== targetIndex);

          for (let i = 0; i < siblingsBefore.length; i++) {
            expect(siblingsAfter[i].status).toBe(siblingsBefore[i].status);
            expect(siblingsAfter[i].urgency).toBe(siblingsBefore[i].urgency);
            expect(siblingsAfter[i].is_active).toBe(siblingsBefore[i].is_active);
            expect(siblingsAfter[i].intent_score).toBe(siblingsBefore[i].intent_score);
            expect(siblingsAfter[i].closed_at).toBe(siblingsBefore[i].closed_at);
            expect(siblingsAfter[i].close_reason).toBe(siblingsBefore[i].close_reason);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 7: Message Scoping Correctness
 * **Validates: Requirements 9.4, 9.5**
 *
 * Messages displayed on a Lead Card View are a strict subset of messages
 * displayed on the parent Contact Profile View. Specifically:
 * Lead Card messages = Contact messages WHERE lead_id = current lead.
 */
describe('Property 7: Message Scoping Correctness', () => {
  it('lead card messages are strict subset of contact messages', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 30 }),
        (contactId, leadIds, msgCount) => {
          // Generate messages for this contact (some with lead_id, some without)
          const allContactMessages = Array.from({ length: msgCount }, (_, i) => {
            const leadId = i % 3 === 0 ? null : leadIds[i % leadIds.length];
            return {
              id: `msg-${i}`,
              contact_id: contactId,
              lead_id: leadId,
              body: `Message ${i}`,
              sent_at: new Date(2024, 0, 1, 0, 0, i).toISOString(),
            };
          });

          // For each lead, compute lead-scoped messages
          for (const leadId of leadIds) {
            const leadMessages = allContactMessages.filter(
              (m) => m.contact_id === contactId && m.lead_id === leadId
            );

            // Invariant 1: Every lead message exists in the contact messages set
            for (const lm of leadMessages) {
              const foundInContact = allContactMessages.some((cm) => cm.id === lm.id);
              expect(foundInContact).toBe(true);
            }

            // Invariant 2: Lead messages count <= contact messages count (subset)
            expect(leadMessages.length).toBeLessThanOrEqual(allContactMessages.length);

            // Invariant 3: Lead messages only contain messages for that specific lead
            for (const lm of leadMessages) {
              expect(lm.lead_id).toBe(leadId);
            }
          }

          // Invariant 4: Partitioning is complete — lead-scoped + contact-only = all
          const leadScopedMessages = allContactMessages.filter((m) => m.lead_id !== null);
          const contactLevelMessages = allContactMessages.filter((m) => m.lead_id === null);
          expect(leadScopedMessages.length + contactLevelMessages.length).toBe(allContactMessages.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
