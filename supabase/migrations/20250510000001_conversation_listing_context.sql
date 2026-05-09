-- Migration: add conversation_listing_context table
-- Stores which listing was last shared per conversation (contact + tenant)
-- Used for AI reply suggestion follow-up context

CREATE TABLE conversation_listing_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, contact_id)
);

CREATE INDEX idx_conv_listing_ctx_tenant ON conversation_listing_context(tenant_id);
CREATE INDEX idx_conv_listing_ctx_contact ON conversation_listing_context(tenant_id, contact_id);

-- RLS
ALTER TABLE conversation_listing_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON conversation_listing_context
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- Updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversation_listing_context
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
