import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Preservation Property Tests — Property 2: Explicit tenant_id and RLS Behavior Unchanged
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * These tests confirm baseline behavior on UNFIXED code that must remain unchanged after the fix:
 * - INSERT with explicit valid tenant_id (matching get_tenant_id()) succeeds
 * - INSERT with explicit invalid tenant_id (not matching get_tenant_id()) is rejected by RLS
 * - SELECT/UPDATE/DELETE operations enforce tenant isolation
 * - All non-tenant_id columns store values correctly
 *
 * EXPECTED OUTCOME: All tests PASS on unfixed code (confirms baseline to preserve).
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

// Demo user and tenant from seed data
const DEMO_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// A second tenant ID we'll create for isolation tests
const OTHER_TENANT_ID = '99999999-9999-9999-9999-999999999999';

// Known FK references from demo seed data
const DEMO_CONTACT_ID = 'c0000001-0000-0000-0000-000000000001';
const DEMO_LEAD_ID = 'd0000001-0000-0000-0000-000000000001';
const DEMO_LISTING_ID = '10000001-0000-0000-0000-000000000001';

let adminClient: SupabaseClient;
let anonClient: SupabaseClient;

beforeAll(async () => {
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    },
  });

  // Create a second tenant for isolation tests
  await adminClient.from('tenants').upsert({
    id: OTHER_TENANT_ID,
    name: 'Other Tenant (Test)',
    subscription_plan: 'free',
    subscription_status: 'active',
  });
});

afterAll(async () => {
  // Cleanup test-created rows using admin client (bypasses RLS)
  await adminClient.from('viewings').delete().eq('feedback_notes', '__pbt_preservation__');
  await adminClient.from('viewings').delete().eq('feedback_notes', '__pbt_columns__');
  // Remove the test tenant (cascade will remove related rows)
  await adminClient.from('tenants').delete().eq('id', OTHER_TENANT_ID);
});

/**
 * Get an access token for the demo user by signing in
 */
async function getAccessToken(): Promise<string> {
  const signInClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({
    email: 'david@cinvea.com',
    password: 'demo1234',
  });
  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in: ${signInError?.message}`);
  }
  return signInData.session.access_token;
}

// ============================================================
// ARBITRARIES
// ============================================================

/** Generate a random UUID that is NOT the demo tenant's UUID (for RLS rejection tests) */
const invalidTenantIdArb = fc.uuid().filter((uuid) => uuid !== DEMO_TENANT_ID);

/** Generate random duration values */
const durationArb = fc.constantFrom(30, 45, 60, 90);

/** Generate random viewing status — only valid values per CHECK constraint */
const statusArb = fc.constantFrom('scheduled', 'completed', 'cancelled', 'rescheduled');

/** Generate random scheduled_at dates */
const scheduledAtArb = fc
  .date({ min: new Date('2025-06-01'), max: new Date('2025-12-31') })
  .map((d) => d.toISOString());

/** Generate a boolean for attended */
const attendedArb = fc.constantFrom(true, false, null);

// ============================================================
// PROPERTY TESTS
// ============================================================

describe('Preservation: Explicit tenant_id and RLS Behavior Unchanged', () => {
  /**
   * Property: For all inserts with explicit valid tenant_id matching authenticated
   * user's tenant, insert succeeds and uses the provided value.
   *
   * **Validates: Requirements 3.1**
   */
  it('INSERT with explicit valid tenant_id (matching get_tenant_id()) succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(scheduledAtArb, durationArb, statusArb, async (scheduledAt, duration, status) => {
        const payload = {
          tenant_id: DEMO_TENANT_ID, // Explicit valid tenant_id
          lead_id: DEMO_LEAD_ID,
          listing_id: DEMO_LISTING_ID,
          scheduled_at: scheduledAt,
          duration_mins: duration,
          status,
          feedback_notes: '__pbt_preservation__',
        };

        const { data, error } = await anonClient
          .from('viewings')
          .insert(payload)
          .select('id, tenant_id, status')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('viewings').delete().eq('id', data.id);
        }
      }),
      { numRuns: 5 },
    );
  });

  /**
   * Property: For all inserts with explicit tenant_id NOT matching authenticated
   * user's tenant, RLS rejects the insert.
   *
   * **Validates: Requirements 3.2**
   */
  it('INSERT with explicit invalid tenant_id (not matching get_tenant_id()) is rejected by RLS', async () => {
    await fc.assert(
      fc.asyncProperty(invalidTenantIdArb, scheduledAtArb, durationArb, async (fakeTenantId, scheduledAt, duration) => {
        const payload = {
          tenant_id: fakeTenantId, // Explicit INVALID tenant_id
          lead_id: DEMO_LEAD_ID,
          listing_id: DEMO_LISTING_ID,
          scheduled_at: scheduledAt,
          duration_mins: duration,
          status: 'scheduled',
          feedback_notes: '__pbt_preservation__',
        };

        const { data, error } = await anonClient
          .from('viewings')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        // RLS should reject this insert (row violates policy)
        expect(error).not.toBeNull();
        expect(data).toBeNull();
      }),
      { numRuns: 5 },
    );
  });

  /**
   * Property: SELECT/UPDATE/DELETE operations continue to enforce tenant isolation.
   * A row belonging to another tenant cannot be seen, updated, or deleted by the demo user.
   *
   * **Validates: Requirements 3.3**
   */
  it('SELECT/UPDATE/DELETE enforce tenant isolation on unfixed code', async () => {
    // Insert a row belonging to another tenant using admin client (bypasses RLS)
    // We need to also create a lead and listing for the other tenant, or use admin to bypass FK checks
    // Instead, we directly insert with admin which bypasses RLS but not FK constraints.
    // Since lead_id and listing_id reference demo tenant's data, we'll just insert the viewing
    // with the other tenant_id using admin — FK on lead/listing is to the row ID, not tenant-scoped.
    const { data: otherRow, error: insertErr } = await adminClient
      .from('viewings')
      .insert({
        tenant_id: OTHER_TENANT_ID,
        lead_id: DEMO_LEAD_ID,
        listing_id: DEMO_LISTING_ID,
        scheduled_at: '2025-07-01T10:00:00.000Z',
        duration_mins: 30,
        status: 'scheduled',
        feedback_notes: '__pbt_preservation__',
      })
      .select('id')
      .single();

    expect(insertErr).toBeNull();
    expect(otherRow).not.toBeNull();
    const otherRowId = otherRow!.id;

    try {
      // SELECT: authenticated user should NOT see the other tenant's row
      const { data: selectData } = await anonClient
        .from('viewings')
        .select('id')
        .eq('id', otherRowId);

      expect(selectData).toEqual([]);

      // UPDATE: authenticated user should NOT be able to update the other tenant's row
      const { data: updateData } = await anonClient
        .from('viewings')
        .update({ status: 'cancelled' })
        .eq('id', otherRowId)
        .select('id');

      // RLS silently filters — no rows matched, so no update
      expect(updateData).toEqual([]);

      // DELETE: authenticated user should NOT be able to delete the other tenant's row
      const { data: deleteData } = await anonClient
        .from('viewings')
        .delete()
        .eq('id', otherRowId)
        .select('id');

      expect(deleteData).toEqual([]);

      // Verify the row still exists via admin
      const { data: verifyRow } = await adminClient
        .from('viewings')
        .select('id, tenant_id')
        .eq('id', otherRowId)
        .single();

      expect(verifyRow).not.toBeNull();
      expect(verifyRow!.tenant_id).toBe(OTHER_TENANT_ID);
    } finally {
      // Cleanup
      await adminClient.from('viewings').delete().eq('id', otherRowId);
    }
  });

  /**
   * Property: For all non-tenant_id columns in the payload, values are stored correctly
   * regardless of whether tenant_id is explicit or defaulted.
   *
   * **Validates: Requirements 3.4**
   */
  it('non-tenant_id columns (lead_id, listing_id, scheduled_at, duration_mins, status, attended) store values correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        scheduledAtArb,
        durationArb,
        statusArb,
        attendedArb,
        async (scheduledAt, duration, status, attended) => {
          const payload: Record<string, unknown> = {
            tenant_id: DEMO_TENANT_ID, // Explicit valid tenant_id (required on unfixed code)
            lead_id: DEMO_LEAD_ID,
            listing_id: DEMO_LISTING_ID,
            scheduled_at: scheduledAt,
            duration_mins: duration,
            status,
            feedback_notes: '__pbt_columns__',
          };

          // Only include attended if not null (to avoid issues with nullable boolean)
          if (attended !== null) {
            payload.attended = attended;
          }

          const { data, error } = await anonClient
            .from('viewings')
            .insert(payload)
            .select('id, tenant_id, lead_id, listing_id, scheduled_at, duration_mins, status, attended')
            .single();

          expect(error).toBeNull();
          expect(data).not.toBeNull();

          // Verify all columns stored correctly
          expect(data!.tenant_id).toBe(DEMO_TENANT_ID);
          expect(data!.lead_id).toBe(DEMO_LEAD_ID);
          expect(data!.listing_id).toBe(DEMO_LISTING_ID);
          expect(new Date(data!.scheduled_at).toISOString()).toBe(new Date(scheduledAt).toISOString());
          expect(data!.duration_mins).toBe(duration);
          expect(data!.status).toBe(status);
          if (attended !== null) {
            expect(data!.attended).toBe(attended);
          }

          // Cleanup
          if (data?.id) {
            await adminClient.from('viewings').delete().eq('id', data.id);
          }
        },
      ),
      { numRuns: 5 },
    );
  });
});
