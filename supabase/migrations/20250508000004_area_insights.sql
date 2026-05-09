-- Area Insight — adds JSONB column to listings for cached insight data
ALTER TABLE listings ADD COLUMN IF NOT EXISTS area_insights JSONB;

-- Index for quick lookup of listings with/without insights
CREATE INDEX IF NOT EXISTS idx_listings_has_insights ON listings((area_insights IS NOT NULL));
