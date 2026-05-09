# PropAgent SG — Changelog

## [0.4.0] — 2026-05-09

### Added
- **Demo polish (Option A):**
  - Pipeline stage change — tap-to-move select on each lead card
  - Global search — debounced search across contacts and listings with dropdown results
  - Notification badges — red badge counts on sidebar (new leads, unread messages, overdue tasks)
  - Better empty states — icon + message + CTA on leads and listings pages
  - Mobile viewport fixes — iOS safe area padding, horizontal scroll on pipeline
  - Header bar with search across all dashboard pages

- **Google Calendar sync (Option B):**
  - OAuth flow (connect in Settings → Integrations)
  - Auto-sync viewings to Google Calendar on creation
  - Token refresh handling
  - "Sync to Google Calendar" checkbox on viewing form
  - Calendar event includes contact name, phone, listing address, district

- **Push notifications (Option B):**
  - Web Push via service worker (no Firebase dependency)
  - Push toggle in Settings → Notifications
  - Auto-notify agent when new Facebook lead arrives
  - Notification click opens relevant page
  - Subscription management (subscribe/unsubscribe)
  - Expired subscription cleanup

### Changed
- Sidebar now fetches badge counts via `/api/badges` endpoint
- Settings integrations tab: Google Calendar "Connect" button wired to OAuth flow
- Meta webhook now sends push notification after lead creation
- Viewing form now accepts `googleCalendarConnected` prop

## [0.3.0] — 2026-05-09

### Added
- **Area Insight module** — URA API integration (eservice.ura.gov.sg/v1), hybrid generation (template + LLM), 5 UI cards (Area Insight, Seller Pitch, Viewing Prep, Buyer Fit, Refresh)
- **Demo seed data** — 15 contacts, 12 leads, 8 listings, 6 viewings, 2 deals, 20 messages, 10 tasks, 5 campaigns
- **Signup auto-provisioning** — DB trigger creates tenant + user on auth signup
- **Sign-out** — Server-side route at /auth/signout
- **Loading states** — Spinner component for dashboard pages
- **Error boundary** — Catch-all error UI with retry
- **Toast notifications** — ToastProvider for form feedback
- **Tools hub page** — /tools with stamp duty calculator + coming-soon placeholders
- **Add Lead page** — /leads/new quick-add form

### Fixed
- RLS circular dependency on users table (changed to `id = auth.uid()`)
- Supabase config.toml format for CLI v2.98+
- URA API endpoints updated from www.ura.gov.sg to eservice.ura.gov.sg/v1
- Missing messages in demo seed (Rachel now has full 8-message conversation)
- Unread message badges (recent inbound messages marked as 'delivered')
- Sign-out button (was using dynamic import, now uses server route)
- Duplicate variable in URA client

## [0.2.0] — 2026-05-08

### Added
- **Full MVP build** — 28 routes, all modules functional
- Modules: Auth, Dashboard, Lead Capture (Meta + WhatsApp webhooks), CRM Pipeline (Kanban), Listings CRUD, Viewing Management, Messages/Chat, Deals + Milestones, Stamp Duty Calculator, Settings
- Database schema: 13 tables with RLS, indexes, triggers
- Seed data: BSD/ABSD rates, eligibility rules (60 rows)
- Shared types package (@propagent/shared)
- Mobile-first PWA with responsive layout

### Architecture
- Monorepo (npm workspaces): apps/web + packages/shared + packages/db
- Next.js 15, Supabase (local Docker), Tailwind CSS, Shadcn/ui patterns
- WhatsApp via 360dialog, Facebook Lead Ads via Meta webhook
- Stripe placeholder for billing

## [0.1.0] — 2026-05-08

### Added
- Product spec v0.2 (resolved all 5 open questions)
- Lead qualification & verification features from agent interviews
- Meta Instant Form filtering with eligibility gates
- Singapore eligibility rules engine
- PDPA compliance module spec
- Market Intelligence module spec
