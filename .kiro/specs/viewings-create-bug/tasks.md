# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Inserts Without tenant_id Fail on Unfixed Schema
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists on all 10 tenant-scoped tables
  - **Scoped PBT Approach**: For each tenant-scoped table, generate random valid insert payloads that omit `tenant_id` and assert the insert succeeds with `tenant_id` auto-populated to `get_tenant_id()`
  - Create test file at `supabase/tests/tenant-id-default-bug-condition.test.ts`
  - Use `fast-check` to generate arbitrary valid payloads for each of the 10 tables (contacts, leads, buyer_requirements, listings, viewings, deals, messages, tasks, campaigns, wa_numbers) with `tenant_id` omitted
  - Assert that INSERT succeeds and the returned row has `tenant_id = get_tenant_id()`
  - Bug condition from design: `isBugCondition(input) = input.tenant_id IS NOT PROVIDED AND targetTable IN [contacts, leads, buyer_requirements, listings, viewings, deals, messages, tasks, campaigns, wa_numbers] AND targetTable.tenant_id HAS NO DEFAULT VALUE`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (PostgreSQL error: `null value in column "tenant_id" violates not-null constraint`)
  - Document counterexamples found (e.g., "INSERT into viewings without tenant_id throws NOT NULL violation")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Explicit tenant_id and RLS Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: INSERT with explicit valid `tenant_id` (matching `get_tenant_id()`) succeeds on unfixed code
  - Observe: INSERT with explicit invalid `tenant_id` (not matching `get_tenant_id()`) is rejected by RLS on unfixed code
  - Observe: SELECT/UPDATE/DELETE operations continue to enforce tenant isolation on unfixed code
  - Observe: All other columns (lead_id, listing_id, scheduled_at, etc.) store values correctly on unfixed code
  - Create test file at `supabase/tests/tenant-id-default-preservation.test.ts`
  - Use `fast-check` to generate arbitrary explicit `tenant_id` values (both valid and invalid UUIDs)
  - Write property: for all inserts with explicit valid `tenant_id` matching authenticated user's tenant, insert succeeds and uses the provided value
  - Write property: for all inserts with explicit `tenant_id` NOT matching authenticated user's tenant, RLS rejects the insert
  - Write property: for all non-tenant_id columns in the payload, values are stored correctly regardless of whether `tenant_id` is explicit or defaulted
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for tenant_id column missing DEFAULT on tenant-scoped tables

  - [x] 3.1 Create Supabase migration to add tenant_id defaults
    - Create new migration file `supabase/migrations/<timestamp>_add_tenant_id_defaults.sql`
    - Add `ALTER TABLE contacts ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE leads ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE buyer_requirements ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE listings ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE viewings ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE deals ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE messages ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE tasks ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE campaigns ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - Add `ALTER TABLE wa_numbers ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();`
    - No client code changes needed — `new-viewing-form.tsx` insert payload remains as-is
    - _Bug_Condition: isBugCondition(input) where input.tenant_id IS NOT PROVIDED on any tenant-scoped table_
    - _Expected_Behavior: Database auto-populates tenant_id with public.get_tenant_id() and insert succeeds_
    - _Preservation: Explicit tenant_id values accepted if valid, rejected by RLS if invalid; all other operations unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Inserts Without tenant_id Succeed After Fix
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (insert succeeds with auto-populated tenant_id)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — inserts without tenant_id now succeed with correct default)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Explicit tenant_id and RLS Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — explicit tenant_id still works, RLS still enforces isolation)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify migration applies cleanly with `supabase db reset` or equivalent
  - Ensure all tests pass, ask the user if questions arise
