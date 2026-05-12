-- Listing Seller Management — Schema Changes
-- Adds seller contact association to listings and seller update tracking to viewings

-- ============================================================
-- 1. Add seller_contact_id to listings
-- ============================================================
ALTER TABLE listings
  ADD COLUMN seller_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX idx_listings_seller ON listings(seller_contact_id);

-- ============================================================
-- 2. Add seller_updated_at to viewings
-- ============================================================
ALTER TABLE viewings
  ADD COLUMN seller_updated_at TIMESTAMPTZ;

-- ============================================================
-- 3. Trigger: Reset seller_updated on viewing completion
-- ============================================================
CREATE OR REPLACE FUNCTION handle_viewing_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.seller_updated := false;
    NEW.seller_updated_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER viewing_completion_seller_reset
  BEFORE UPDATE OF status ON viewings
  FOR EACH ROW EXECUTE FUNCTION handle_viewing_completion();
