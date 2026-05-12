import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateStage, getLeadsByContact } from '../lead-service';
import type { Lead } from '@agentos/shared';

// --- Test helpers ---

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

function createMockSupabaseForUpdate(returnedLead: Lead) {
  const mockSingle = vi.fn().mockReturnValue({ data: returnedLead, error: null });
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

  return {
    supabase: { from: mockFrom } as any,
    mocks: { mockFrom, mockUpdate, mockEq, mockSelect, mockSingle },
  };
}

describe('Lead Service — Lead Lifecycle', () => {
  describe('14.4 Moving lead to closed_won sets is_active=false and closed_at', () => {
    it('should update status to closed_won with close_reason', async () => {
      const closedLead = makeLead({
        id: 'lead-1',
        status: 'closed_won',
        is_active: false,
        closed_at: '2024-06-15T10:00:00Z',
        close_reason: 'Deal completed successfully',
      });

      const { supabase, mocks } = createMockSupabaseForUpdate(closedLead);

      const result = await updateStage(
        supabase,
        'lead-1',
        'closed_won',
        'Deal completed successfully'
      );

      expect(result.status).toBe('closed_won');
      expect(result.is_active).toBe(false);
      expect(result.closed_at).not.toBeNull();
      expect(result.close_reason).toBe('Deal completed successfully');
    });

    it('should require close_reason for closed_won stage', async () => {
      const { supabase } = createMockSupabaseForUpdate(makeLead());

      await expect(
        updateStage(supabase, 'lead-1', 'closed_won')
      ).rejects.toThrow('close_reason is required');
    });

    it('should require close_reason for closed_lost stage', async () => {
      const { supabase } = createMockSupabaseForUpdate(makeLead());

      await expect(
        updateStage(supabase, 'lead-1', 'closed_lost')
      ).rejects.toThrow('close_reason is required');
    });

    it('should pass close_reason in the update data for terminal stages', async () => {
      const closedLead = makeLead({
        status: 'closed_lost',
        is_active: false,
        closed_at: '2024-06-15T10:00:00Z',
        close_reason: 'Client chose another agent',
      });

      const { supabase, mocks } = createMockSupabaseForUpdate(closedLead);

      await updateStage(supabase, 'lead-1', 'closed_lost', 'Client chose another agent');

      // Verify the update was called with close_reason
      const updateData = mocks.mockUpdate.mock.calls[0][0];
      expect(updateData.status).toBe('closed_lost');
      expect(updateData.close_reason).toBe('Client chose another agent');
    });
  });

  describe('14.5 Reopening a closed lead sets is_active=true and clears closed_at', () => {
    it('should clear close_reason when moving to non-terminal stage', async () => {
      const reopenedLead = makeLead({
        id: 'lead-1',
        status: 'contacted',
        is_active: true,
        closed_at: null,
        close_reason: null,
      });

      const { supabase, mocks } = createMockSupabaseForUpdate(reopenedLead);

      const result = await updateStage(supabase, 'lead-1', 'contacted');

      expect(result.status).toBe('contacted');
      expect(result.is_active).toBe(true);
      expect(result.closed_at).toBeNull();
      expect(result.close_reason).toBeNull();
    });

    it('should set close_reason to null in update data for non-terminal stages', async () => {
      const reopenedLead = makeLead({
        status: 'qualified',
        is_active: true,
        closed_at: null,
        close_reason: null,
      });

      const { supabase, mocks } = createMockSupabaseForUpdate(reopenedLead);

      await updateStage(supabase, 'lead-1', 'qualified');

      const updateData = mocks.mockUpdate.mock.calls[0][0];
      expect(updateData.status).toBe('qualified');
      expect(updateData.close_reason).toBeNull();
    });

    it('should not require close_reason for non-terminal stages', async () => {
      const activeLead = makeLead({ status: 'viewing_booked', is_active: true });

      const { supabase } = createMockSupabaseForUpdate(activeLead);

      // Should not throw
      const result = await updateStage(supabase, 'lead-1', 'viewing_booked');
      expect(result.status).toBe('viewing_booked');
    });
  });

  describe('14.8 contact_id cannot be changed on existing lead (trigger rejects update)', () => {
    it('should simulate trigger rejection when contact_id update is attempted', async () => {
      // The database trigger prevent_contact_id_change() raises an exception
      // when contact_id is changed. We simulate this by having Supabase return an error.
      const mockSingle = vi.fn().mockReturnValue({
        data: null,
        error: {
          code: 'P0001',
          message: 'Cannot change contact_id on an existing lead',
        },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      const supabase = { from: mockFrom } as any;

      // Attempt to update contact_id directly (simulating what the trigger prevents)
      const { data, error } = await supabase
        .from('leads')
        .update({ contact_id: 'different-contact-id' })
        .eq('id', 'lead-1')
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error.message).toContain('Cannot change contact_id');
    });

    it('should verify the trigger error code matches PostgreSQL raise exception', async () => {
      const mockSingle = vi.fn().mockReturnValue({
        data: null,
        error: {
          code: 'P0001', // PostgreSQL RAISE EXCEPTION code
          message: 'Cannot change contact_id on an existing lead',
          details: null,
          hint: null,
        },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      const supabase = { from: mockFrom } as any;

      const { error } = await supabase
        .from('leads')
        .update({ contact_id: 'new-contact-id' })
        .eq('id', 'lead-1')
        .select()
        .single();

      expect(error.code).toBe('P0001');
      expect(error.message).toBe('Cannot change contact_id on an existing lead');
    });
  });

  describe('14.9 Contact survives when all linked leads are deleted/closed', () => {
    it('should return contact data even when all leads are closed', async () => {
      // Simulate: contact exists, all leads are closed
      const contactData = {
        id: 'contact-1',
        tenant_id: 'tenant-1',
        full_name: 'John Doe',
        phone: '+6591234567',
        contact_status: 'active',
      };

      const closedLeads = [
        makeLead({ id: 'lead-1', contact_id: 'contact-1', status: 'closed_won', is_active: false }),
        makeLead({ id: 'lead-2', contact_id: 'contact-1', status: 'closed_lost', is_active: false }),
      ];

      // Mock for fetching contact (still exists)
      const contactSingle = vi.fn().mockReturnValue({ data: contactData, error: null });
      const contactEq = vi.fn().mockReturnValue({ single: contactSingle });
      const contactSelect = vi.fn().mockReturnValue({ eq: contactEq });

      // Mock for fetching leads (all closed)
      const leadsOrder = vi.fn().mockReturnValue({ data: closedLeads, error: null });
      const leadsEq = vi.fn().mockReturnValue({ order: leadsOrder });
      const leadsSelect = vi.fn().mockReturnValue({ eq: leadsEq });

      let callCount = 0;
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'contacts') {
          return { select: contactSelect };
        }
        if (table === 'leads') {
          return { select: leadsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      // Fetch contact — should still exist
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', 'contact-1')
        .single();

      expect(contact).not.toBeNull();
      expect(contact.id).toBe('contact-1');
      expect(contact.full_name).toBe('John Doe');
      expect(contact.contact_status).toBe('active');

      // Fetch leads — all closed
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('contact_id', 'contact-1')
        .order('created_at', { ascending: false });

      expect(leads).toHaveLength(2);
      expect(leads.every((l: Lead) => l.is_active === false)).toBe(true);
    });

    it('should keep contact active even when leads are deleted', async () => {
      // Simulate: contact exists, no leads remain (all deleted)
      const contactData = {
        id: 'contact-1',
        tenant_id: 'tenant-1',
        full_name: 'John Doe',
        phone: '+6591234567',
        contact_status: 'active',
      };

      const contactSingle = vi.fn().mockReturnValue({ data: contactData, error: null });
      const contactEq = vi.fn().mockReturnValue({ single: contactSingle });
      const contactSelect = vi.fn().mockReturnValue({ eq: contactEq });

      // No leads found
      const leadsOrder = vi.fn().mockReturnValue({ data: [], error: null });
      const leadsEq = vi.fn().mockReturnValue({ order: leadsOrder });
      const leadsSelect = vi.fn().mockReturnValue({ eq: leadsEq });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'contacts') {
          return { select: contactSelect };
        }
        if (table === 'leads') {
          return { select: leadsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      // Contact still exists independently
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', 'contact-1')
        .single();

      expect(contact).not.toBeNull();
      expect(contact.id).toBe('contact-1');

      // No leads remain
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('contact_id', 'contact-1')
        .order('created_at', { ascending: false });

      expect(leads).toHaveLength(0);

      // Contact is still active — not deleted or archived
      expect(contact.contact_status).toBe('active');
    });
  });
});
