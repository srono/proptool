import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  attachSeller,
  removeSeller,
  changeSeller,
  searchContacts,
  markViewingSellerUpdated,
  getPendingSellerUpdateCount,
} from '../seller-service';
import type { Lead } from '@agentos/shared';

// --- Test helpers ---

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    tenant_id: 'tenant-1',
    contact_id: 'contact-1',
    assigned_to: null,
    status: 'new_lead',
    source: 'manual',
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
    lead_category: 'seller',
    is_active: true,
    opened_at: '2024-01-01T00:00:00Z',
    closed_at: null,
    close_reason: null,
    origin_listing_id: 'listing-1',
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

describe('Seller Service', () => {
  describe('attachSeller', () => {
    it('creates a new lead when none exists', async () => {
      const newLead = makeLead({ id: 'new-lead-1', contact_id: 'contact-1', origin_listing_id: 'listing-1' });

      // Mock for: supabase.from('listings').update(...).eq(...)
      const listingsUpdateEq = vi.fn().mockReturnValue({ error: null });
      const listingsUpdate = vi.fn().mockReturnValue({ eq: listingsUpdateEq });

      // Mock for: supabase.from('leads').select(...).eq(...).eq(...).eq(...).eq(...).maybeSingle()
      const leadsMaybeSingle = vi.fn().mockReturnValue({ data: null, error: null });
      const leadsEq4 = vi.fn().mockReturnValue({ maybeSingle: leadsMaybeSingle });
      const leadsEq3 = vi.fn().mockReturnValue({ eq: leadsEq4 });
      const leadsEq2 = vi.fn().mockReturnValue({ eq: leadsEq3 });
      const leadsEq1 = vi.fn().mockReturnValue({ eq: leadsEq2 });
      const leadsSelect = vi.fn().mockReturnValue({ eq: leadsEq1 });

      // Mock for: supabase.from('leads').insert(...).select().single()
      const leadsInsertSingle = vi.fn().mockReturnValue({ data: newLead, error: null });
      const leadsInsertSelect = vi.fn().mockReturnValue({ single: leadsInsertSingle });
      const leadsInsert = vi.fn().mockReturnValue({ select: leadsInsertSelect });

      let leadsCallCount = 0;
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'listings') {
          return { update: listingsUpdate };
        }
        if (table === 'leads') {
          leadsCallCount++;
          if (leadsCallCount === 1) {
            return { select: leadsSelect };
          }
          return { insert: leadsInsert };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await attachSeller(supabase, 'listing-1', 'contact-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.sellerLead).toEqual(newLead);
      expect(result.leadCreationError).toBeNull();

      // Verify listing was updated
      expect(listingsUpdate).toHaveBeenCalledWith({ seller_contact_id: 'contact-1' });
      expect(listingsUpdateEq).toHaveBeenCalledWith('id', 'listing-1');

      // Verify lead was inserted with correct fields
      const insertData = leadsInsert.mock.calls[0][0];
      expect(insertData.tenant_id).toBe('tenant-1');
      expect(insertData.contact_id).toBe('contact-1');
      expect(insertData.lead_category).toBe('seller');
      expect(insertData.status).toBe('new_lead');
      expect(insertData.is_active).toBe(true);
      expect(insertData.origin_listing_id).toBe('listing-1');
    });

    it('reuses existing active lead for same listing', async () => {
      const existingLead = makeLead({
        id: 'existing-lead-1',
        contact_id: 'contact-1',
        origin_listing_id: 'listing-1',
        lead_category: 'seller',
        is_active: true,
      });

      // Mock for: supabase.from('listings').update(...).eq(...)
      const listingsUpdateEq = vi.fn().mockReturnValue({ error: null });
      const listingsUpdate = vi.fn().mockReturnValue({ eq: listingsUpdateEq });

      // Mock for: supabase.from('leads').select(...).eq(...).eq(...).eq(...).eq(...).maybeSingle()
      const leadsMaybeSingle = vi.fn().mockReturnValue({ data: existingLead, error: null });
      const leadsEq4 = vi.fn().mockReturnValue({ maybeSingle: leadsMaybeSingle });
      const leadsEq3 = vi.fn().mockReturnValue({ eq: leadsEq4 });
      const leadsEq2 = vi.fn().mockReturnValue({ eq: leadsEq3 });
      const leadsEq1 = vi.fn().mockReturnValue({ eq: leadsEq2 });
      const leadsSelect = vi.fn().mockReturnValue({ eq: leadsEq1 });

      // Insert should NOT be called
      const leadsInsert = vi.fn();

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'listings') {
          return { update: listingsUpdate };
        }
        if (table === 'leads') {
          return { select: leadsSelect, insert: leadsInsert };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await attachSeller(supabase, 'listing-1', 'contact-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.sellerLead).toEqual(existingLead);
      expect(result.leadCreationError).toBeNull();

      // Verify insert was NOT called — existing lead was reused
      expect(leadsInsert).not.toHaveBeenCalled();
    });
  });

  describe('removeSeller', () => {
    it('clears seller_contact_id without modifying leads', async () => {
      // Mock for: supabase.from('listings').update(...).eq(...)
      const listingsUpdateEq = vi.fn().mockReturnValue({ error: null });
      const listingsUpdate = vi.fn().mockReturnValue({ eq: listingsUpdateEq });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'listings') {
          return { update: listingsUpdate };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      await removeSeller(supabase, 'listing-1');

      // Verify listing was updated with null seller_contact_id
      expect(listingsUpdate).toHaveBeenCalledWith({ seller_contact_id: null });
      expect(listingsUpdateEq).toHaveBeenCalledWith('id', 'listing-1');

      // Verify no calls to 'leads' table — leads are not modified
      const fromCalls = mockFrom.mock.calls.map((call) => call[0]);
      expect(fromCalls).not.toContain('leads');
    });
  });

  describe('changeSeller', () => {
    it('retains old lead and creates new one for new contact', async () => {
      const newLead = makeLead({
        id: 'new-lead-2',
        contact_id: 'contact-2',
        origin_listing_id: 'listing-1',
      });

      // removeSeller: supabase.from('listings').update({ seller_contact_id: null }).eq('id', listingId)
      // attachSeller: supabase.from('listings').update({ seller_contact_id: contactId }).eq('id', listingId)
      const listingsUpdateEq = vi.fn().mockReturnValue({ error: null });
      const listingsUpdate = vi.fn().mockReturnValue({ eq: listingsUpdateEq });

      // attachSeller lead lookup: no existing lead for new contact
      const leadsMaybeSingle = vi.fn().mockReturnValue({ data: null, error: null });
      const leadsEq4 = vi.fn().mockReturnValue({ maybeSingle: leadsMaybeSingle });
      const leadsEq3 = vi.fn().mockReturnValue({ eq: leadsEq4 });
      const leadsEq2 = vi.fn().mockReturnValue({ eq: leadsEq3 });
      const leadsEq1 = vi.fn().mockReturnValue({ eq: leadsEq2 });
      const leadsSelect = vi.fn().mockReturnValue({ eq: leadsEq1 });

      // attachSeller lead insert
      const leadsInsertSingle = vi.fn().mockReturnValue({ data: newLead, error: null });
      const leadsInsertSelect = vi.fn().mockReturnValue({ single: leadsInsertSingle });
      const leadsInsert = vi.fn().mockReturnValue({ select: leadsInsertSelect });

      let leadsCallCount = 0;
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'listings') {
          return { update: listingsUpdate };
        }
        if (table === 'leads') {
          leadsCallCount++;
          if (leadsCallCount === 1) {
            return { select: leadsSelect };
          }
          return { insert: leadsInsert };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await changeSeller(supabase, 'listing-1', 'contact-2', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.sellerLead).toEqual(newLead);
      expect(result.leadCreationError).toBeNull();

      // Verify removeSeller was called first (sets seller_contact_id to null)
      expect(listingsUpdate.mock.calls[0][0]).toEqual({ seller_contact_id: null });

      // Verify attachSeller was called second (sets seller_contact_id to new contact)
      expect(listingsUpdate.mock.calls[1][0]).toEqual({ seller_contact_id: 'contact-2' });

      // Verify new lead was created for the new contact
      const insertData = leadsInsert.mock.calls[0][0];
      expect(insertData.contact_id).toBe('contact-2');
      expect(insertData.lead_category).toBe('seller');
      expect(insertData.origin_listing_id).toBe('listing-1');
    });
  });

  describe('searchContacts', () => {
    it('returns max 20 results matching name or phone', async () => {
      const contacts = [
        { id: 'c1', full_name: 'Alice Smith', phone: '+6591111111', email: 'alice@test.com' },
        { id: 'c2', full_name: 'Bob Jones', phone: '+6592222222', email: null },
      ];

      // Mock for: supabase.from('contacts').select(...).or(...).limit(20)
      const contactsLimit = vi.fn().mockReturnValue({ data: contacts, error: null });
      const contactsOr = vi.fn().mockReturnValue({ limit: contactsLimit });
      const contactsSelect = vi.fn().mockReturnValue({ or: contactsOr });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'contacts') {
          return { select: contactsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await searchContacts(supabase, 'Ali');

      expect(result).toEqual(contacts);

      // Verify correct query structure
      expect(contactsSelect).toHaveBeenCalledWith('id, full_name, phone, email');
      expect(contactsOr).toHaveBeenCalledWith('full_name.ilike.%Ali%,phone.ilike.%Ali%');
      expect(contactsLimit).toHaveBeenCalledWith(20);
    });

    it('returns empty array when no contacts match', async () => {
      const contactsLimit = vi.fn().mockReturnValue({ data: [], error: null });
      const contactsOr = vi.fn().mockReturnValue({ limit: contactsLimit });
      const contactsSelect = vi.fn().mockReturnValue({ or: contactsOr });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'contacts') {
          return { select: contactsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await searchContacts(supabase, 'zzz');

      expect(result).toEqual([]);
    });

    it('throws when query fails', async () => {
      const contactsLimit = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Network error' },
      });
      const contactsOr = vi.fn().mockReturnValue({ limit: contactsLimit });
      const contactsSelect = vi.fn().mockReturnValue({ or: contactsOr });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'contacts') {
          return { select: contactsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      await expect(searchContacts(supabase, 'test')).rejects.toThrow(
        'Failed to search contacts: Network error'
      );
    });
  });

  describe('markViewingSellerUpdated', () => {
    it('sets seller_updated=true and seller_updated_at to current timestamp', async () => {
      // Mock for: supabase.from('viewings').update(...).eq(...)
      const viewingsUpdateEq = vi.fn().mockReturnValue({ error: null });
      const viewingsUpdate = vi.fn().mockReturnValue({ eq: viewingsUpdateEq });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'viewings') {
          return { update: viewingsUpdate };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      await markViewingSellerUpdated(supabase, 'viewing-1');

      // Verify correct table and id
      expect(mockFrom).toHaveBeenCalledWith('viewings');
      expect(viewingsUpdateEq).toHaveBeenCalledWith('id', 'viewing-1');

      // Verify update payload
      const updateData = viewingsUpdate.mock.calls[0][0];
      expect(updateData.seller_updated).toBe(true);
      expect(updateData.seller_updated_at).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(new Date(updateData.seller_updated_at).toISOString()).toBe(updateData.seller_updated_at);
    });

    it('throws when update fails', async () => {
      const viewingsUpdateEq = vi.fn().mockReturnValue({
        error: { message: 'Update failed' },
      });
      const viewingsUpdate = vi.fn().mockReturnValue({ eq: viewingsUpdateEq });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'viewings') {
          return { update: viewingsUpdate };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      await expect(markViewingSellerUpdated(supabase, 'viewing-1')).rejects.toThrow(
        'Failed to mark viewing as seller-updated: Update failed'
      );
    });
  });

  describe('getPendingSellerUpdateCount', () => {
    it('returns correct count of pending viewings', async () => {
      // Mock for: supabase.from('viewings').select('*', { count: 'exact', head: true }).eq(...).eq(...).eq(...)
      const viewingsEq3 = vi.fn().mockReturnValue({ count: 3, error: null });
      const viewingsEq2 = vi.fn().mockReturnValue({ eq: viewingsEq3 });
      const viewingsEq1 = vi.fn().mockReturnValue({ eq: viewingsEq2 });
      const viewingsSelect = vi.fn().mockReturnValue({ eq: viewingsEq1 });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'viewings') {
          return { select: viewingsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await getPendingSellerUpdateCount(supabase, 'listing-1');

      expect(result).toBe(3);

      // Verify correct query parameters
      expect(viewingsSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(viewingsEq1).toHaveBeenCalledWith('listing_id', 'listing-1');
      expect(viewingsEq2).toHaveBeenCalledWith('status', 'completed');
      expect(viewingsEq3).toHaveBeenCalledWith('seller_updated', false);
    });

    it('returns 0 when no pending viewings exist', async () => {
      const viewingsEq3 = vi.fn().mockReturnValue({ count: 0, error: null });
      const viewingsEq2 = vi.fn().mockReturnValue({ eq: viewingsEq3 });
      const viewingsEq1 = vi.fn().mockReturnValue({ eq: viewingsEq2 });
      const viewingsSelect = vi.fn().mockReturnValue({ eq: viewingsEq1 });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'viewings') {
          return { select: viewingsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await getPendingSellerUpdateCount(supabase, 'listing-1');

      expect(result).toBe(0);
    });

    it('returns 0 when count is null', async () => {
      const viewingsEq3 = vi.fn().mockReturnValue({ count: null, error: null });
      const viewingsEq2 = vi.fn().mockReturnValue({ eq: viewingsEq3 });
      const viewingsEq1 = vi.fn().mockReturnValue({ eq: viewingsEq2 });
      const viewingsSelect = vi.fn().mockReturnValue({ eq: viewingsEq1 });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'viewings') {
          return { select: viewingsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      const result = await getPendingSellerUpdateCount(supabase, 'listing-1');

      expect(result).toBe(0);
    });

    it('throws when query fails', async () => {
      const viewingsEq3 = vi.fn().mockReturnValue({
        count: null,
        error: { message: 'Query failed' },
      });
      const viewingsEq2 = vi.fn().mockReturnValue({ eq: viewingsEq3 });
      const viewingsEq1 = vi.fn().mockReturnValue({ eq: viewingsEq2 });
      const viewingsSelect = vi.fn().mockReturnValue({ eq: viewingsEq1 });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'viewings') {
          return { select: viewingsSelect };
        }
        return {};
      });

      const supabase = { from: mockFrom } as any;

      await expect(getPendingSellerUpdateCount(supabase, 'listing-1')).rejects.toThrow(
        'Failed to get pending seller update count: Query failed'
      );
    });
  });
});
