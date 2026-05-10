import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Bug Condition Exploration Test — Property 1: Inserts Without tenant_id Fail on Unfixed Schema
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 *
 * Bug Condition: isBugCondition(input) = input.tenant_id IS NOT PROVIDED
 *   AND targetTable IN [contacts, leads, buyer_requirements, listings, viewings, deals, messages, tasks, campaigns, wa_numbers]
 *   AND targetTable.tenant_id HAS NO DEFAULT VALUE
 *
 * This test encodes the EXPECTED behavior after the fix:
 * - INSERT without tenant_id should succeed with tenant_id auto-populated to get_tenant_id()
 *
 * On UNFIXED code, this test MUST FAIL with:
 * - "null value in column \"tenant_id\" violates not-null constraint"
 * - OR RLS policy violation
 *
 * DO NOT fix the test or the code when it fails — failure confirms the bug exists.
 */

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

// Demo user and tenant from seed data
const DEMO_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';

// Known FK references from demo seed data
const DEMO_CONTACT_ID = 'c0000001-0000-0000-0000-000000000001';
const DEMO_LEAD_ID = 'd0000001-0000-0000-0000-000000000001';
const DEMO_LISTING_ID = '10000001-0000-0000-0000-000000000001';
const DEMO_DEAL_ID = 'de000001-0000-0000-0000-000000000001';

let adminClient: SupabaseClient;
let anonClient: SupabaseClient;

beforeAll(async () => {
  // Admin client for setup/teardown (bypasses RLS)
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Anon client impersonating the demo user (subject to RLS)
  // We use the service role key with auth override to simulate an authenticated user
  anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        // Set the auth context to the demo user so get_tenant_id() resolves
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    },
  });
});

afterAll(async () => {
  // Cleanup: remove any test-created rows (those not in the original seed)
  // We use the admin client to clean up regardless of RLS
  await adminClient.from('viewings').delete().eq('feedback_notes', '__pbt_test__');
  await adminClient.from('deals').delete().eq('notes', '__pbt_test__');
  await adminClient.from('messages').delete().eq('body', '__pbt_test__');
  await adminClient.from('tasks').delete().eq('title', '__pbt_test__');
  await adminClient.from('campaigns').delete().eq('campaign_name', '__pbt_test__');
  await adminClient.from('wa_numbers').delete().eq('display_name', '__pbt_test__');
  await adminClient.from('buyer_requirements').delete().eq('additional_notes', '__pbt_test__');
  await adminClient.from('leads').delete().eq('notes', '__pbt_test__');
  await adminClient.from('contacts').delete().eq('email', 'pbt_test@test.local');
  await adminClient.from('listings').delete().eq('description', '__pbt_test__');
});

/**
 * Get an access token for the demo user by signing in
 */
async function getAccessToken(): Promise<string> {
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'david@cinvea.com',
  });

  if (error || !data) {
    // Fallback: sign in with password
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

  // Use the token from the generated link
  const token = data.properties?.hashed_token;
  if (token) {
    const verifyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: verifyData, error: verifyError } = await verifyClient.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    });
    if (!verifyError && verifyData.session) {
      return verifyData.session.access_token;
    }
  }

  // Final fallback
  const fallbackClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: fbData, error: fbError } = await fallbackClient.auth.signInWithPassword({
    email: 'david@cinvea.com',
    password: 'demo1234',
  });
  if (fbError || !fbData.session) {
    throw new Error(`Failed to sign in (fallback): ${fbError?.message}`);
  }
  return fbData.session.access_token;
}

// ============================================================
// ARBITRARIES — Generate valid payloads WITHOUT tenant_id
// ============================================================

/** Generate a unique phone number for contacts */
const phoneArb = fc.integer({ min: 60000000, max: 69999999 }).map((n) => `+65${n}`);

/** Contacts: full_name + phone required, omit tenant_id */
const contactPayloadArb = fc.record({
  full_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  phone: phoneArb,
  email: fc.constant('pbt_test@test.local'),
  source: fc.constant('manual'),
  lead_type: fc.constantFrom('buyer', 'seller', 'landlord', 'tenant', 'co_broke_agent'),
});

/** Leads: contact_id + status + source required, omit tenant_id */
const leadPayloadArb = fc.record({
  contact_id: fc.constant(DEMO_CONTACT_ID),
  assigned_to: fc.constant(DEMO_USER_ID),
  status: fc.constantFrom('new_lead', 'contacted', 'qualified'),
  source: fc.constantFrom('manual', 'whatsapp', 'referral'),
  deal_type: fc.constantFrom('sale', 'resale', 'rental'),
  urgency: fc.constantFrom('hot', 'warm', 'cold'),
  notes: fc.constant('__pbt_test__'),
});

/** Buyer Requirements: contact_id + lead_id required, omit tenant_id */
const buyerRequirementsPayloadArb = fc.record({
  contact_id: fc.constant(DEMO_CONTACT_ID),
  lead_id: fc.constant(DEMO_LEAD_ID),
  budget_min: fc.integer({ min: 100000, max: 5000000 }),
  budget_max: fc.integer({ min: 5000001, max: 20000000 }),
  additional_notes: fc.constant('__pbt_test__'),
});

/** Listings: agent_id + address + postal_code + district + property_type + tenure + floor_area_sqft + listing_type required */
const listingPayloadArb = fc.record({
  agent_id: fc.constant(DEMO_USER_ID),
  address: fc.string({ minLength: 5, maxLength: 100 }).filter((s) => s.trim().length >= 5),
  postal_code: fc.integer({ min: 100000, max: 999999 }).map(String),
  district: fc.constantFrom('D01', 'D02', 'D09', 'D10', 'D15', 'D20'),
  property_type: fc.constantFrom('hdb', 'condo', 'landed', 'commercial'),
  tenure: fc.constantFrom('freehold', '99yr', '999yr'),
  floor_area_sqft: fc.integer({ min: 200, max: 10000 }),
  listing_status: fc.constant('draft'),
  listing_type: fc.constantFrom('sale', 'rental'),
  description: fc.constant('__pbt_test__'),
});

/** Viewings: lead_id + listing_id + scheduled_at required, omit tenant_id */
const viewingPayloadArb = fc.record({
  lead_id: fc.constant(DEMO_LEAD_ID),
  listing_id: fc.constant(DEMO_LISTING_ID),
  scheduled_at: fc.date({ min: new Date('2025-06-01'), max: new Date('2025-12-31') }).map((d) => d.toISOString()),
  duration_mins: fc.constantFrom(30, 45, 60, 90),
  status: fc.constant('scheduled'),
  feedback_notes: fc.constant('__pbt_test__'),
});

/** Deals: lead_id + deal_type required, omit tenant_id */
const dealPayloadArb = fc.record({
  lead_id: fc.constant(DEMO_LEAD_ID),
  listing_id: fc.constant(DEMO_LISTING_ID),
  deal_type: fc.constantFrom('sale', 'resale', 'rental'),
  status: fc.constant('negotiating'),
  notes: fc.constant('__pbt_test__'),
});

/** Messages: contact_id + direction + body required, omit tenant_id */
const messagePayloadArb = fc.record({
  contact_id: fc.constant(DEMO_CONTACT_ID),
  lead_id: fc.constant(DEMO_LEAD_ID),
  direction: fc.constantFrom('inbound', 'outbound'),
  channel: fc.constantFrom('whatsapp', 'sms', 'email', 'note'),
  body: fc.constant('__pbt_test__'),
  status: fc.constant('sent'),
});

/** Tasks: assigned_to + title + due_at required, omit tenant_id */
const taskPayloadArb = fc.record({
  lead_id: fc.constant(DEMO_LEAD_ID),
  assigned_to: fc.constant(DEMO_USER_ID),
  title: fc.constant('__pbt_test__'),
  due_at: fc.date({ min: new Date('2025-06-01'), max: new Date('2025-12-31') }).map((d) => d.toISOString()),
  priority: fc.constantFrom('high', 'medium', 'low'),
});

/** Campaigns: platform + page_id + campaign_name required, omit tenant_id */
const campaignPayloadArb = fc.record({
  platform: fc.constantFrom('facebook', 'instagram'),
  page_id: fc.string({ minLength: 5, maxLength: 20 }).filter((s) => s.trim().length >= 5),
  campaign_name: fc.constant('__pbt_test__'),
  status: fc.constantFrom('active', 'paused'),
  leads_count: fc.integer({ min: 0, max: 100 }),
});

/** WA Numbers: phone_number required, omit tenant_id */
const waNumberPayloadArb = fc.record({
  phone_number: phoneArb,
  display_name: fc.constant('__pbt_test__'),
  routing_mode: fc.constantFrom('direct', 'round_robin', 'availability', 'keyword'),
  status: fc.constantFrom('active', 'disconnected'),
});

// ============================================================
// PROPERTY TESTS
// ============================================================

describe('Bug Condition: Inserts Without tenant_id on Unfixed Schema', () => {
  it('contacts: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(contactPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('contacts')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('contacts').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('leads: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(leadPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('leads')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('leads').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('buyer_requirements: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(buyerRequirementsPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('buyer_requirements')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('buyer_requirements').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('listings: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(listingPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('listings')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('listings').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('viewings: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(viewingPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('viewings')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('viewings').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('deals: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(dealPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('deals')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('deals').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('messages: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(messagePayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('messages')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('messages').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('tasks: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(taskPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('tasks')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('tasks').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('campaigns: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(campaignPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('campaigns')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('campaigns').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });

  it('wa_numbers: INSERT without tenant_id succeeds and auto-populates tenant_id', async () => {
    await fc.assert(
      fc.asyncProperty(waNumberPayloadArb, async (payload) => {
        const { data, error } = await anonClient
          .from('wa_numbers')
          .insert(payload)
          .select('id, tenant_id')
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.tenant_id).toBe(DEMO_TENANT_ID);

        // Cleanup
        if (data?.id) {
          await adminClient.from('wa_numbers').delete().eq('id', data.id);
        }
      }),
      { numRuns: 3 },
    );
  });
});
