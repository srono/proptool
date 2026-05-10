import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveMarketingAsset, markAsUsed } from '../marketing-asset-mutations';
import type { SaveMarketingAssetParams } from '../marketing-asset-mutations';
import type { MarketingAssetRecord } from '../ad-copy-types';

// --- Mock Supabase Client ---

function createMockSupabase(overrides?: {
  insertResult?: { data: unknown; error: unknown };
  updateResult?: { error: unknown };
}) {
  const mockSingle = vi.fn(() =>
    Promise.resolve(
      overrides?.insertResult ?? {
        data: { id: 'record-1', ...validSaveParams, published_at: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        error: null,
      }
    )
  );

  const mockSelect = vi.fn(() => ({ single: mockSingle }));

  const mockInsert = vi.fn((_payload: Record<string, unknown>) => ({ select: mockSelect }));

  const mockUpdateEq = vi.fn((_column: string, _value: string) =>
    Promise.resolve(overrides?.updateResult ?? { error: null })
  );

  const mockUpdate = vi.fn((_payload: Record<string, unknown>) => ({ eq: mockUpdateEq }));

  const mockFrom = vi.fn((_table: string) => ({
    insert: mockInsert,
    update: mockUpdate,
  }));

  return {
    client: { from: mockFrom } as unknown as Parameters<typeof saveMarketingAsset>[0],
    mocks: { mockFrom, mockInsert, mockSelect, mockSingle, mockUpdate, mockUpdateEq },
  };
}

// --- Test Data ---

const validSaveParams: SaveMarketingAssetParams = {
  tenant_id: 'tenant-abc-123',
  listing_id: 'listing-xyz-456',
  asset_type: 'ad_copy',
  platform: 'facebook',
  tone: 'professional',
  target_angle: 'investor',
  content_text: 'Beautiful 3-bedroom condo in prime District 9. Freehold tenure with stunning city views. Enquire now!',
  compliance_flags: [
    { phrase: 'prime', category: 'unsupported_superlative', message: 'Avoid unsupported superlatives' },
  ],
  generated_by: 'ai',
  saved_by: 'user-001',
};

// --- Integration Tests ---

describe('Save and Mark-as-Used Integration Tests', () => {
  describe('Save Marketing Asset', () => {
    it('calls supabase.from("listing_marketing_assets").insert() with correct fields', async () => {
      const { client, mocks } = createMockSupabase();

      await saveMarketingAsset(client, validSaveParams);

      // Verify correct table is targeted
      expect(mocks.mockFrom).toHaveBeenCalledWith('listing_marketing_assets');

      // Verify insert is called with all required fields
      expect(mocks.mockInsert).toHaveBeenCalledWith({
        tenant_id: validSaveParams.tenant_id,
        listing_id: validSaveParams.listing_id,
        asset_type: validSaveParams.asset_type,
        platform: validSaveParams.platform,
        tone: validSaveParams.tone,
        target_angle: validSaveParams.target_angle,
        content_text: validSaveParams.content_text,
        compliance_flags: validSaveParams.compliance_flags,
        generated_by: validSaveParams.generated_by,
        saved_by: validSaveParams.saved_by,
      });
    });

    it('includes tenant_id in every insert for RLS enforcement', async () => {
      const { client, mocks } = createMockSupabase();

      await saveMarketingAsset(client, validSaveParams);

      const insertArg = mocks.mockInsert.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(insertArg).toHaveProperty('tenant_id', validSaveParams.tenant_id);
    });

    it('tenant_id is always present regardless of other field values', async () => {
      const { client, mocks } = createMockSupabase();

      const paramsWithNullAngle: SaveMarketingAssetParams = {
        ...validSaveParams,
        target_angle: null,
        compliance_flags: [],
      };

      await saveMarketingAsset(client, paramsWithNullAngle);

      const insertArg = mocks.mockInsert.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(insertArg!.tenant_id).toBe(paramsWithNullAngle.tenant_id);
      expect(insertArg!.tenant_id).toBeTruthy();
    });

    it('calls .select().single() after insert to return the created record', async () => {
      const { client, mocks } = createMockSupabase();

      await saveMarketingAsset(client, validSaveParams);

      expect(mocks.mockSelect).toHaveBeenCalled();
      expect(mocks.mockSingle).toHaveBeenCalled();
    });

    it('returns success with the created record on successful insert', async () => {
      const mockRecord: MarketingAssetRecord = {
        id: 'record-new-1',
        tenant_id: validSaveParams.tenant_id,
        listing_id: validSaveParams.listing_id,
        asset_type: validSaveParams.asset_type,
        platform: validSaveParams.platform,
        tone: validSaveParams.tone,
        target_angle: validSaveParams.target_angle,
        content_text: validSaveParams.content_text,
        compliance_flags: validSaveParams.compliance_flags,
        generated_by: validSaveParams.generated_by,
        saved_by: validSaveParams.saved_by,
        published_at: null,
        created_at: '2024-06-15T10:00:00Z',
        updated_at: '2024-06-15T10:00:00Z',
      };

      const { client } = createMockSupabase({
        insertResult: { data: mockRecord, error: null },
      });

      const result = await saveMarketingAsset(client, validSaveParams);

      expect(result.success).toBe(true);
      expect(result.record).toEqual(mockRecord);
      expect(result.error).toBeUndefined();
    });

    it('returns failure with error message when insert fails', async () => {
      const { client } = createMockSupabase({
        insertResult: { data: null, error: { message: 'RLS policy violation' } },
      });

      const result = await saveMarketingAsset(client, validSaveParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RLS policy violation');
      expect(result.record).toBeUndefined();
    });

    it('preserves all field types correctly in the insert payload', async () => {
      const { client, mocks } = createMockSupabase();

      const params: SaveMarketingAssetParams = {
        tenant_id: 'tenant-uuid-here',
        listing_id: 'listing-uuid-here',
        asset_type: 'whatsapp_text',
        platform: 'whatsapp',
        tone: 'friendly',
        target_angle: 'family',
        content_text: 'Check out this amazing family home! 🏠',
        compliance_flags: [],
        generated_by: 'ai',
        saved_by: 'user-uuid-here',
      };

      await saveMarketingAsset(client, params);

      const insertArg = mocks.mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(insertArg.asset_type).toBe('whatsapp_text');
      expect(insertArg.platform).toBe('whatsapp');
      expect(insertArg.tone).toBe('friendly');
      expect(insertArg.target_angle).toBe('family');
      expect(insertArg.generated_by).toBe('ai');
      expect(insertArg.compliance_flags).toEqual([]);
    });
  });

  describe('Mark as Used', () => {
    it('calls supabase.from("listing_marketing_assets").update() with published_at timestamp', async () => {
      const { client, mocks } = createMockSupabase();
      const recordId = 'record-abc-123';

      await markAsUsed(client, recordId);

      // Verify correct table is targeted
      expect(mocks.mockFrom).toHaveBeenCalledWith('listing_marketing_assets');

      // Verify update is called with published_at as an ISO timestamp
      const updateArg = mocks.mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(updateArg).toHaveProperty('published_at');
      expect(typeof updateArg.published_at).toBe('string');

      // Verify it's a valid ISO date string
      const parsedDate = new Date(updateArg.published_at as string);
      expect(parsedDate.toISOString()).toBe(updateArg.published_at);
    });

    it('filters by record id using .eq("id", recordId)', async () => {
      const { client, mocks } = createMockSupabase();
      const recordId = 'record-specific-id';

      await markAsUsed(client, recordId);

      expect(mocks.mockUpdateEq).toHaveBeenCalledWith('id', recordId);
    });

    it('sets published_at to a recent timestamp (within last few seconds)', async () => {
      const { client, mocks } = createMockSupabase();
      const beforeCall = new Date();

      await markAsUsed(client, 'record-1');

      const afterCall = new Date();
      const updateArg = mocks.mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
      const publishedAt = new Date(updateArg.published_at as string);

      expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(publishedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('returns success when update succeeds', async () => {
      const { client } = createMockSupabase({ updateResult: { error: null } });

      const result = await markAsUsed(client, 'record-1');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns failure with error message when update fails', async () => {
      const { client } = createMockSupabase({
        updateResult: { error: { message: 'Record not found' } },
      });

      const result = await markAsUsed(client, 'nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Record not found');
    });
  });

  describe('RLS Enforcement (Tenant Isolation)', () => {
    it('tenant_id is a required field in SaveMarketingAssetParams', async () => {
      const { client, mocks } = createMockSupabase();

      // Verify that tenant_id is always passed to the insert
      await saveMarketingAsset(client, validSaveParams);

      const insertArg = mocks.mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(insertArg).toHaveProperty('tenant_id');
      expect(insertArg.tenant_id).not.toBeNull();
      expect(insertArg.tenant_id).not.toBeUndefined();
      expect(insertArg.tenant_id).not.toBe('');
    });

    it('different tenants produce different tenant_id values in insert', async () => {
      const { client: client1, mocks: mocks1 } = createMockSupabase();
      const { client: client2, mocks: mocks2 } = createMockSupabase();

      const tenantAParams = { ...validSaveParams, tenant_id: 'tenant-A' };
      const tenantBParams = { ...validSaveParams, tenant_id: 'tenant-B' };

      await saveMarketingAsset(client1, tenantAParams);
      await saveMarketingAsset(client2, tenantBParams);

      const insertArgA = mocks1.mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;
      const insertArgB = mocks2.mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;

      expect(insertArgA.tenant_id).toBe('tenant-A');
      expect(insertArgB.tenant_id).toBe('tenant-B');
      expect(insertArgA.tenant_id).not.toBe(insertArgB.tenant_id);
    });

    it('RLS violation error is properly surfaced when tenant mismatch occurs', async () => {
      const { client } = createMockSupabase({
        insertResult: {
          data: null,
          error: { message: 'new row violates row-level security policy for table "listing_marketing_assets"' },
        },
      });

      const result = await saveMarketingAsset(client, validSaveParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('row-level security policy');
    });
  });
});
