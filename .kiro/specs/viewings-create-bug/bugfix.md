# Bugfix Requirements Document

## Introduction

Creating a new viewing from the `/viewings/new` form fails with a Supabase insert error. The `viewings` table requires a `tenant_id UUID NOT NULL` column, but the insert statement in `new-viewing-form.tsx` does not supply it. Additionally, the RLS policy `tenant_isolation` on the `viewings` table uses `USING (tenant_id = public.get_tenant_id())` which acts as a WITH CHECK on inserts, rejecting any row where `tenant_id` is NULL or doesn't match the authenticated user's tenant. The fix is to add a column default `DEFAULT public.get_tenant_id()` on the `tenant_id` column so the database auto-populates it on insert.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an authenticated user submits the new viewing form THEN the system fails with a database error because `tenant_id` is NOT NULL but no value is provided in the insert payload

1.2 WHEN the insert is attempted without `tenant_id` THEN the RLS policy `tenant_isolation` rejects the row because `NULL != public.get_tenant_id()`

1.3 WHEN the same pattern is used on other tenant-scoped tables (contacts, leads, listings, deals, messages, tasks, campaigns, wa_numbers) that also lack a column default for `tenant_id` THEN inserts from client code that omit `tenant_id` will similarly fail

### Expected Behavior (Correct)

2.1 WHEN an authenticated user submits the new viewing form without explicitly providing `tenant_id` THEN the system SHALL automatically populate `tenant_id` with the value of `public.get_tenant_id()` via a column default and the insert SHALL succeed

2.2 WHEN the column default is applied THEN the RLS policy SHALL pass because the auto-populated `tenant_id` matches `public.get_tenant_id()`

2.3 WHEN the same column default is applied to all other tenant-scoped tables (contacts, leads, listings, deals, messages, tasks, campaigns, wa_numbers) THEN inserts that omit `tenant_id` SHALL also succeed with the correct tenant automatically assigned

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a client explicitly provides a valid `tenant_id` in the insert payload THEN the system SHALL CONTINUE TO use the explicitly provided value (the default is only used when the column is omitted)

3.2 WHEN a user attempts to insert a row with a `tenant_id` that does not match `public.get_tenant_id()` THEN the RLS policy SHALL CONTINUE TO reject the insert

3.3 WHEN existing rows are queried or updated THEN the system SHALL CONTINUE TO enforce tenant isolation via the existing RLS policy

3.4 WHEN other fields in the viewings insert (lead_id, listing_id, scheduled_at, duration_mins, status, attended) are provided THEN the system SHALL CONTINUE TO store them correctly
