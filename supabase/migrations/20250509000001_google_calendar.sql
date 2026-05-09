-- Google Calendar integration: store OAuth tokens on users and event IDs on viewings
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;
