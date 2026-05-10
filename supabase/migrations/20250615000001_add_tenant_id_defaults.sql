-- Add DEFAULT public.get_tenant_id() to tenant_id column on all tenant-scoped tables.
-- This allows inserts that omit tenant_id to auto-populate it from the authenticated
-- user's tenant, fixing the NOT NULL violation when client code doesn't supply it.
-- SET DEFAULT is idempotent — safe to re-run.

ALTER TABLE contacts ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE leads ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE buyer_requirements ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE listings ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE viewings ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE deals ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE messages ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE tasks ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE campaigns ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
ALTER TABLE wa_numbers ALTER COLUMN tenant_id SET DEFAULT public.get_tenant_id();
