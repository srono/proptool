# Viewings Create Bug — Bugfix Design

## Overview

The `viewings` table (and all other tenant-scoped tables) defines `tenant_id UUID NOT NULL` without a column default. Client-side insert code in `new-viewing-form.tsx` does not include `tenant_id` in the payload. This causes a two-stage failure: first the NOT NULL constraint rejects the insert, and second the RLS policy `tenant_isolation` (which uses `USING (tenant_id = public.get_tenant_id())`) would also reject any row where `tenant_id` doesn't match. The fix is a Supabase migration that adds `DEFAULT public.get_tenant_id()` to the `tenant_id` column on all tenant-scoped tables, so the database auto-populates the correct value when client code omits it.

## Glossary

- **Bug_Condition (C)**: An INSERT on a tenant-scoped table where the `tenant_id` column is omitted from the payload
- **Property (P)**: The database auto-populates `tenant_id` with `public.get_tenant_id()` and the insert succeeds
- **Preservation**: Existing behavior where explicit `tenant_id` values are accepted (if valid) or rejected by RLS (if invalid) must remain unchanged
- **`get_tenant_id()`**: A `SECURITY DEFINER STABLE` SQL function in `public` schema that returns the `tenant_id` of the currently authenticated user by looking up `auth.uid()` in the `users` table
- **Tenant-scoped tables**: contacts, leads, buyer_requirements, listings, viewings, deals, messages, tasks, campaigns, wa_numbers
- **RLS policy `tenant_isolation`**: A `FOR ALL USING (tenant_id = public.get_tenant_id())` policy on each tenant-scoped table that restricts row access to the authenticated user's tenant

## Bug Details

### Bug Condition

The bug manifests when an authenticated user submits the new viewing form (or any insert on a tenant-scoped table) without explicitly providing `tenant_id` in the insert payload. The column has `NOT NULL` but no `DEFAULT`, so PostgreSQL rejects the insert before RLS even evaluates.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type InsertPayload for a tenant-scoped table
  OUTPUT: boolean

  RETURN input.tenant_id IS NOT PROVIDED
         AND targetTable IN [contacts, leads, buyer_requirements, listings,
                             viewings, deals, messages, tasks, campaigns, wa_numbers]
         AND targetTable.tenant_id HAS NO DEFAULT VALUE
END FUNCTION
```

### Examples

- **Viewing insert without tenant_id**: User submits `{ lead_id, listing_id, scheduled_at, duration_mins, status, attended }` → fails with `null value in column "tenant_id" violates not-null constraint`
- **Contact insert without tenant_id**: A future form inserts `{ full_name, phone }` → same NOT NULL violation
- **Viewing insert with valid tenant_id**: User submits `{ tenant_id: <own_tenant>, lead_id, ... }` → succeeds (not a bug condition)
- **Viewing insert with wrong tenant_id**: User submits `{ tenant_id: <other_tenant>, lead_id, ... }` → RLS rejects (correct behavior, not a bug)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Explicit inserts that provide a valid `tenant_id` matching `get_tenant_id()` must continue to succeed (the default is only used when the column is omitted)
- RLS policy must continue to reject inserts where `tenant_id` does not match `get_tenant_id()` (cross-tenant writes remain blocked)
- Existing SELECT, UPDATE, DELETE operations must continue to enforce tenant isolation via the existing RLS policy
- All other columns in tenant-scoped tables must continue to store values correctly
- The `get_tenant_id()` function itself must remain unchanged

**Scope:**
All operations that do NOT involve omitting `tenant_id` from an INSERT should be completely unaffected by this fix. This includes:
- Inserts that explicitly provide `tenant_id`
- All SELECT queries (RLS USING clause unchanged)
- All UPDATE operations (RLS USING clause unchanged)
- All DELETE operations (RLS USING clause unchanged)

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward:

1. **Missing Column Default**: The `tenant_id` column on all tenant-scoped tables is defined as `UUID NOT NULL` without a `DEFAULT` clause. PostgreSQL requires either an explicit value or a default when inserting.

2. **Client Code Omits tenant_id**: The `new-viewing-form.tsx` insert payload does not include `tenant_id` because the client-side Supabase client doesn't have direct access to the raw tenant UUID — it relies on the server/database to resolve tenant context.

3. **RLS Double-Rejection**: Even if the NOT NULL constraint were somehow bypassed, the RLS policy `USING (tenant_id = public.get_tenant_id())` acts as a WITH CHECK on inserts, so a NULL `tenant_id` would fail the policy check as well.

4. **Pattern Affects All Tenant-Scoped Tables**: The same schema pattern (NOT NULL without DEFAULT) is repeated across all 10 tenant-scoped tables, meaning any client insert that omits `tenant_id` will fail.

## Correctness Properties

Property 1: Bug Condition - Inserts Without tenant_id Succeed

_For any_ INSERT on a tenant-scoped table where `tenant_id` is omitted from the payload and the user is authenticated, the database SHALL automatically populate `tenant_id` with the value of `public.get_tenant_id()` and the insert SHALL succeed (assuming all other constraints are satisfied).

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Explicit tenant_id and RLS Behavior Unchanged

_For any_ INSERT that explicitly provides `tenant_id`, the database SHALL use the provided value (not the default), and the RLS policy SHALL continue to reject rows where the provided `tenant_id` does not match `public.get_tenant_id()`, preserving tenant isolation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `supabase/migrations/<new_timestamp>_add_tenant_id_defaults.sql`

**Specific Changes**:
1. **ALTER TABLE contacts**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
2. **ALTER TABLE leads**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
3. **ALTER TABLE buyer_requirements**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
4. **ALTER TABLE listings**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
5. **ALTER TABLE viewings**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
6. **ALTER TABLE deals**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
7. **ALTER TABLE messages**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
8. **ALTER TABLE tasks**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
9. **ALTER TABLE campaigns**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`
10. **ALTER TABLE wa_numbers**: `ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id()`

**No client code changes required.** The `new-viewing-form.tsx` insert payload remains as-is — the database now handles `tenant_id` population automatically.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the NOT NULL constraint and RLS policy reject inserts without `tenant_id`.

**Test Plan**: Execute INSERT statements on tenant-scoped tables without providing `tenant_id` and observe the error. Run these on the UNFIXED schema to confirm the failure mode.

**Test Cases**:
1. **Viewings Insert Test**: Insert `{ lead_id, listing_id, scheduled_at, duration_mins, status }` into viewings (will fail on unfixed schema)
2. **Contacts Insert Test**: Insert `{ full_name, phone }` into contacts (will fail on unfixed schema)
3. **Leads Insert Test**: Insert `{ contact_id, status, source }` into leads (will fail on unfixed schema)
4. **All Tables Test**: Attempt insert without `tenant_id` on each of the 10 tables (will fail on unfixed schema)

**Expected Counterexamples**:
- PostgreSQL error: `null value in column "tenant_id" of relation "viewings" violates not-null constraint`
- If NOT NULL is somehow bypassed: RLS policy violation error

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed schema produces the expected behavior.

**Pseudocode:**
```
FOR ALL table IN tenant_scoped_tables DO
  FOR ALL payload WHERE tenant_id IS OMITTED DO
    result := INSERT INTO table (payload)
    ASSERT result.success = true
    ASSERT result.row.tenant_id = get_tenant_id()
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed schema produces the same result as the original schema.

**Pseudocode:**
```
FOR ALL table IN tenant_scoped_tables DO
  FOR ALL payload WHERE tenant_id IS EXPLICITLY PROVIDED DO
    ASSERT INSERT_original(table, payload) = INSERT_fixed(table, payload)
  END FOR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of explicit `tenant_id` values (valid, invalid, cross-tenant)
- It catches edge cases around NULL handling and default precedence
- It provides strong guarantees that RLS enforcement is unchanged

**Test Plan**: Observe behavior on UNFIXED schema for explicit `tenant_id` inserts, then write property-based tests capturing that behavior continues after the migration.

**Test Cases**:
1. **Explicit Valid tenant_id Preservation**: Insert with correct `tenant_id` succeeds on both old and new schema
2. **Explicit Invalid tenant_id Preservation**: Insert with wrong `tenant_id` is rejected by RLS on both old and new schema
3. **SELECT/UPDATE/DELETE Preservation**: All read and write operations with existing RLS continue to work identically
4. **Other Column Preservation**: All non-tenant_id columns store values correctly after migration

### Unit Tests

- Test that `ALTER COLUMN ... SET DEFAULT` migration applies cleanly
- Test INSERT without `tenant_id` succeeds after migration
- Test INSERT with explicit valid `tenant_id` still succeeds
- Test INSERT with explicit invalid `tenant_id` still fails via RLS

### Property-Based Tests

- Generate random valid insert payloads (omitting `tenant_id`) across all 10 tables and verify inserts succeed with correct `tenant_id` populated
- Generate random explicit `tenant_id` values and verify RLS continues to accept/reject correctly
- Generate random combinations of provided/omitted fields and verify only `tenant_id` default behavior changes

### Integration Tests

- Test full viewing creation flow from `new-viewing-form.tsx` end-to-end
- Test that the created viewing row has the correct `tenant_id` matching the authenticated user
- Test that a second tenant cannot see viewings created by the first tenant
- Test that the lead status update and viewing creation both succeed in the same form submission
