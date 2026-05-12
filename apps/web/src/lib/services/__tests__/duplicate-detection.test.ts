import { describe, it, expect, vi } from 'vitest';
import { detect } from '../duplicate-detection';
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
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockSupabaseForLeadsQuery(leads: Lead[]) {
  const mockOrder = vi.fn().mockReturnValue({ data: leads, error: null });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return { from: mockFrom } as any;
}

describe('Duplicate Detection Engine', () => {
  describe('14.6 Duplicate detection triggers for same category within 14 days', () => {
    it('should detect duplicate when active lead with same category exists within 14 days', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago

      const existingLead = makeLead({
        id: 'existing-lead-1',
        lead_category: 'buyer',
        is_active: true,
        status: 'contacted',
        created_at: recentDate.toISOString(),
      });

      const supabase = createMockSupabaseForLeadsQuery([existingLead]);

      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'buyer',
        dealType: 'sale',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingLead).toBeDefined();
      expect(result.existingLead!.id).toBe('existing-lead-1');
      expect(result.reason).toContain('buyer');
      expect(result.reason).toContain('14 days');
    });

    it('should detect duplicate when lead was created exactly at the 14-day boundary', async () => {
      // Lead created exactly 13 days ago (within 14 days)
      const thirteenDaysAgo = new Date();
      thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13);

      const existingLead = makeLead({
        id: 'boundary-lead',
        lead_category: 'seller',
        is_active: true,
        created_at: thirteenDaysAgo.toISOString(),
      });

      const supabase = createMockSupabaseForLeadsQuery([existingLead]);

      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'seller',
        dealType: 'sale',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingLead!.id).toBe('boundary-lead');
    });

    it('should NOT detect duplicate when lead is older than 14 days', async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const oldLead = makeLead({
        id: 'old-lead',
        lead_category: 'buyer',
        is_active: true,
        created_at: twentyDaysAgo.toISOString(),
      });

      const supabase = createMockSupabaseForLeadsQuery([oldLead]);

      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'buyer',
        dealType: 'sale',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.existingLead).toBeUndefined();
    });

    it('should NOT detect duplicate when lead with same category is inactive', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);

      const inactiveLead = makeLead({
        id: 'inactive-lead',
        lead_category: 'buyer',
        is_active: false,
        status: 'closed_won',
        created_at: recentDate.toISOString(),
      });

      const supabase = createMockSupabaseForLeadsQuery([inactiveLead]);

      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'buyer',
        dealType: 'sale',
      });

      expect(result.isDuplicate).toBe(false);
    });

    it('should include context banner with lead history counts', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const leads = [
        makeLead({ id: 'lead-1', is_active: true, lead_category: 'buyer', created_at: recentDate.toISOString() }),
        makeLead({ id: 'lead-2', is_active: false, status: 'closed_won', lead_category: 'seller', created_at: '2023-06-01T00:00:00Z' }),
        makeLead({ id: 'lead-3', is_active: false, status: 'closed_lost', lead_category: 'tenant', created_at: '2023-03-01T00:00:00Z' }),
      ];

      const supabase = createMockSupabaseForLeadsQuery(leads);

      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'buyer',
        dealType: 'sale',
      });

      expect(result.contextBanner.pastLeadsCount).toBe(3);
      expect(result.contextBanner.closedDealsCount).toBe(1); // only closed_won
      expect(result.contextBanner.activeLeadsCount).toBe(1);
    });
  });

  describe('14.7 Duplicate detection does NOT trigger for different categories', () => {
    it('should NOT detect duplicate when existing lead has different category', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);

      const existingLead = makeLead({
        id: 'seller-lead',
        lead_category: 'seller',
        is_active: true,
        created_at: recentDate.toISOString(),
      });

      const supabase = createMockSupabaseForLeadsQuery([existingLead]);

      // Creating a buyer lead when only a seller lead exists
      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'buyer',
        dealType: 'sale',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.existingLead).toBeUndefined();
    });

    it('should allow multiple active leads with different categories simultaneously', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const leads = [
        makeLead({ id: 'buyer-lead', lead_category: 'buyer', is_active: true, created_at: recentDate.toISOString() }),
        makeLead({ id: 'seller-lead', lead_category: 'seller', is_active: true, created_at: recentDate.toISOString() }),
        makeLead({ id: 'landlord-lead', lead_category: 'landlord', is_active: true, created_at: recentDate.toISOString() }),
      ];

      const supabase = createMockSupabaseForLeadsQuery(leads);

      // Creating a tenant lead — no duplicate since no existing tenant lead
      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'tenant',
        dealType: 'rental',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.contextBanner.activeLeadsCount).toBe(3);
    });

    it('should detect duplicate only for matching category among multiple leads', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const leads = [
        makeLead({ id: 'buyer-lead', lead_category: 'buyer', is_active: true, created_at: recentDate.toISOString() }),
        makeLead({ id: 'seller-lead', lead_category: 'seller', is_active: true, created_at: recentDate.toISOString() }),
      ];

      const supabase = createMockSupabaseForLeadsQuery(leads);

      // Creating another buyer lead — should trigger duplicate
      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'buyer',
        dealType: 'sale',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.existingLead!.id).toBe('buyer-lead');
      expect(result.existingLead!.lead_category).toBe('buyer');
    });

    it('should not trigger for nurture category when buyer exists', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      const existingLead = makeLead({
        id: 'buyer-lead',
        lead_category: 'buyer',
        is_active: true,
        created_at: recentDate.toISOString(),
      });

      const supabase = createMockSupabaseForLeadsQuery([existingLead]);

      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'nurture',
        dealType: 'sale',
      });

      expect(result.isDuplicate).toBe(false);
    });

    it('should return correct context banner even when no duplicate detected', async () => {
      const leads = [
        makeLead({ id: 'lead-1', lead_category: 'buyer', is_active: true, created_at: '2024-01-01T00:00:00Z' }),
        makeLead({ id: 'lead-2', lead_category: 'seller', is_active: false, status: 'closed_won', created_at: '2023-06-01T00:00:00Z' }),
      ];

      const supabase = createMockSupabaseForLeadsQuery(leads);

      const result = await detect(supabase, {
        contactId: 'contact-1',
        leadCategory: 'landlord',
        dealType: 'landlord_rep',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.contextBanner.pastLeadsCount).toBe(2);
      expect(result.contextBanner.closedDealsCount).toBe(1);
      expect(result.contextBanner.activeLeadsCount).toBe(1);
    });
  });
});
