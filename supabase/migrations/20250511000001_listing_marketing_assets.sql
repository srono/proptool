-- Listing Marketing Assets — stores saved ad copy and marketing text variants
-- Requirements: 9.2, 10.2, 11.2

CREATE TABLE listing_marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('ad_copy', 'caption', 'headline', 'whatsapp_text', 'hashtags', 'short_form')),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'generic')),
  tone TEXT NOT NULL CHECK (tone IN ('professional', 'premium', 'friendly', 'urgency', 'investor', 'family')),
  target_angle TEXT CHECK (target_angle IN ('family', 'upgrader', 'investor', 'tenant', 'first_time_buyer')),
  content_text TEXT NOT NULL CHECK (char_length(content_text) <= 5000),
  compliance_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by TEXT NOT NULL DEFAULT 'ai' CHECK (generated_by IN ('ai', 'manual')),
  saved_by UUID NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_marketing_assets_listing ON listing_marketing_assets(listing_id, created_at DESC);
CREATE INDEX idx_marketing_assets_tenant ON listing_marketing_assets(tenant_id, listing_id);

-- RLS policy: tenant isolation
ALTER TABLE listing_marketing_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant's marketing assets"
  ON listing_marketing_assets
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Auto-update updated_at on row modification
CREATE TRIGGER set_updated_at BEFORE UPDATE ON listing_marketing_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
