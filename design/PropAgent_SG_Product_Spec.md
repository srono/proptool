# PropAgent SG — Product Requirements & Feature Specification

**Version:** 0.3 Draft  
**Date:** May 2026  
**Product Type:** Multi-tenant SaaS — Singapore Property Agent Operating System  
**Target User:** Independent CEA-licensed property agents and small teams (2–10 agents) in Singapore  
**Changelog:** v0.3 — Added Area Insight submodule (URA API + LLM hybrid). MVP fully built and demo-ready with seed data. All open questions resolved.

---

## 1. Executive Summary

PropAgent SG is a purpose-built, mobile-first SaaS platform for independent Singapore property agents. It replaces the fragmented workflow of WhatsApp threads, spreadsheets, portal dashboards, and ad managers with a single app covering marketing, lead capture, CRM pipeline, viewing management, transaction closure, and analytics.

The platform is multi-tenant by architecture — all agents share one deployment but are fully isolated through Postgres Row-Level Security (RLS). Each agent or team is a **tenant** with their own scoped data. Subscription pricing targets S$49–99/month per agent, positioning well below Salesforce and HubSpot while delivering a vertically-integrated Singapore property experience those platforms cannot match out of the box.

---

## 2. Guiding Principles

- **Mobile-first, not mobile-friendly.** Agents work on phones. Every core action must be completable in under 3 taps on mobile.
- **Singapore-native, not adapted.** CEA compliance fields, HDB/Condo/Landed deal types, district D1–D28, OTP workflow, stamp duty, and co-broke are first-class objects — not workarounds.
- **WhatsApp-centric communication.** Agents and clients communicate over WhatsApp. The app must meet agents there, not replace it with email.
- **Zero manual data entry for leads.** Facebook Lead Ads and WhatsApp inbound must auto-create leads. Agents should never copy-paste from a portal email.
- **Lead quality over volume.** Especially for landed property, unqualified leads waste hours. The app must filter, score, and verify leads before agents invest time in viewings.
- **Compliance as a feature.** PDPA consent, DNC checks, and data retention are not afterthoughts — they are built-in capabilities that protect agents and build client trust.
- **Progressive complexity.** Solo agents see a simple pipeline. Team accounts unlock routing, assignment, and reporting. Nothing is hidden — features reveal themselves as needed.

---

## 3. System Architecture

### 3.1 Multi-Tenancy Model

- One shared application and database for all tenants
- Data isolation via PostgreSQL Row-Level Security (RLS) enforced at DB engine level
- Every table carries a `tenant_id` column; every query is implicitly scoped to the authenticated tenant
- Auth token from login carries `tenant_id` — no manual filtering needed in application code
- Tenant = billing unit; can be a solo agent or a team (agency group)

### 3.2 Core Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React (Next.js) PWA | Mobile-first, offline-capable, single codebase |
| Backend | Node.js (API layer) | Lightweight, async-friendly for webhook processing |
| Database | PostgreSQL via Supabase | RLS native, relational model suits property data |
| Auth | Supabase Auth + JWT | Tenant ID embedded in token; social login support |
| File Storage | Supabase Storage with bucket RLS | Listing photos, documents isolated per tenant |
| WhatsApp | BSP (360dialog or Twilio) → Meta Cloud API | Per-agent number (Pro); shared routed number (Team) |
| Facebook Leads | Meta Lead Ads Webhook | Real-time lead push on form submission |
| Payments | Stripe (subscription per tenant_id) | Metered billing, plan upgrades |
| Push Notifications | Firebase Cloud Messaging (FCM) | Cross-platform mobile push |
| Hosting | Vercel (frontend) + Supabase (backend/db) | Scalable, low ops overhead |
| Market Data | URA Data Service API + data.gov.sg | Transaction history, property attributes, free & public |
| Stamp Duty | IRAS rate tables → admin-editable DB table | Rules engine, not hardcoded; update on policy change |

### 3.3 Integration Architecture

```
Facebook / Instagram Lead Ads
        │  (Meta Webhook POST)
        ▼
Your Webhook Endpoint  ──►  Lead auto-created in pipeline
                             Agent receives push notification

WhatsApp Inbound Message
        │  (via BSP webhook)
        ▼
Conversation Timeline  ──►  Linked to existing lead or creates new one
                             Agent replies from in-app messaging screen

Agent replies in app
        │  (API call to BSP)
        ▼
WhatsApp message sent to client phone
```

---

## 4. User Roles and Tenant Structure

| Role | Description | Permissions |
|---|---|---|
| **Owner** | Solo agent or agency principal | Full access to all data, billing, settings |
| **Agent (Team Member)** | Licensed agent within a team tenant | Access to own leads/deals; limited to assigned records |
| **Admin** | Agency manager (non-billing) | Cross-agent visibility, reporting, lead assignment |

> For MVP, only the **Owner** role is required. Team roles are Phase 2.

---

## 5. Core Data Model

### 5.1 Primary Entities

**tenants**
- id, name, cea_registration_number, subscription_plan, subscription_status, created_at, settings_json

**users**
- id, tenant_id, email, phone, full_name, role, avatar_url, created_at

**contacts**
- id, tenant_id, full_name, phone (unique per tenant), email, whatsapp_optin, consent_given_at (timestamp), consent_source (form | whatsapp | manual), source, lead_type (buyer | seller | landlord | tenant | co_broke_agent), cea_number (if agent), nationality, pr_status, linkedin_url, data_retention_expiry (date, auto-computed), created_at, updated_at

**leads**
- id, tenant_id, contact_id, assigned_to (user_id), status (pipeline stage), source (facebook_ad | instagram_ad | portal | whatsapp | referral | open_house | manual), ad_campaign_id, ad_set_id, ad_creative_id, ad_purpose (declared campaign purpose for PDPA), deal_type (sale | resale | rental | landlord_rep | tenant_rep), urgency (hot | warm | cold), budget_min, budget_max, move_in_by (date), notes, created_at, last_activity_at
- **Qualification fields:** residency_status (citizen | pr | ep | other), property_ownership (none | hdb | private | multiple), eligibility_risk (bool), eligibility_flag_reason (text), intent_score (1–5, computed from form answers), time_on_form_seconds (from Meta payload), timeline_declared (0_3mo | 3_6mo | 6_12mo | exploring)
- **Verification fields:** paynow_verified (bool), paynow_name_match (bool), paynow_registered_name (text), verification_score (1–3: low/medium/high confidence), pre_viewing_checklist (JSONB)

**listings**
- id, tenant_id, agent_id (user_id), address, postal_code, district (D01–D28), property_type (HDB | condo | landed | commercial), hdb_type (if HDB: 2room | 3room | 4room | 5room | executive), tenure (freehold | 99yr | 999yr), floor_area_sqft, asking_price, psf (computed), asking_rental, listing_status (draft | live | under_offer | sold | rented | withdrawn), listing_type (sale | rental), floor, unit_number, completion_year, media_urls (array), description, created_at, updated_at

**buyer_requirements**
- id, tenant_id, contact_id, lead_id, districts (array), property_types (array), hdb_types (array), tenure_preference, budget_min, budget_max, min_sqft, max_sqft, bedrooms_min, deal_type, timeline, additional_notes

**viewings**
- id, tenant_id, lead_id, listing_id, scheduled_at, duration_mins, status (scheduled | completed | cancelled | rescheduled), attended (bool), feedback_notes, next_action, created_at

**deals**
- id, tenant_id, lead_id, listing_id, deal_type, status (negotiating | otp_issued | otp_signed | exercised | completed | fallen_through), offer_price, agreed_price, commission_pct, commission_amount, co_broke_agent_id, co_broke_split_pct, otp_date, completion_date, documents (array of urls), notes, created_at, updated_at

**messages** (WhatsApp communication log)
- id, tenant_id, contact_id, lead_id, wa_number_id (supports multi-number for Team plan), direction (inbound | outbound), channel (whatsapp | sms | email | note), body, media_url, wa_message_id, status (sent | delivered | read | failed), sent_at

**tasks**
- id, tenant_id, lead_id, deal_id, assigned_to (user_id), title, due_at, completed_at, priority (high | medium | low), created_at

**campaigns** (Meta ad campaigns linked to tenant)
- id, tenant_id, platform (facebook | instagram), page_id, ad_account_id, campaign_name, status, leads_count, created_at

**stamp_duty_rates** (admin-editable rules engine)
- id, duty_type (BSD | ABSD), buyer_profile (citizen | PR | foreigner | entity | trust), property_count (1st | 2nd | 3rd_plus), price_band_min, price_band_max, rate_pct, effective_from (date), effective_to (date, nullable)

**wa_numbers** (WhatsApp Business numbers per tenant)
- id, tenant_id, phone_number, bsp_account_id, display_name, is_shared (bool — true for Team plan shared numbers), routing_mode (direct | round_robin | availability | keyword), status (active | disconnected), connected_at

**eligibility_rules** (Singapore property purchase eligibility matrix)
- id, buyer_profile (citizen | pr | foreigner | entity | trust), property_type (hdb | condo | landed | commercial), property_count (1st | 2nd | 3rd_plus), eligible (bool), restriction_note (text), absd_rate_pct, effective_from (date)

### 5.2 RLS Policy Pattern (Applied to Every Table)

```sql
-- Example: leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON leads
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

---

## 6. Module Specifications

---

### Module 1: Authentication & Onboarding

**Goal:** Agent signs up and is productive within 5 minutes.

#### Features

- Email/password signup
- Google OAuth signup
- Phone number verification (OTP via SMS)
- CEA licence number field (optional at signup, required before going live)
- Tenant auto-created on first signup
- Onboarding checklist: connect Facebook Page, add first listing, add first contact
- Subscription selection on signup (Free | Pro | Team)
- Deferred billing: 14-day free trial before credit card required

#### Acceptance Criteria

- Signup to dashboard in under 60 seconds
- Invalid CEA format rejected with inline error
- If Facebook Page not connected, Lead Capture module shows contextual setup prompt

---

### Module 2: Lead Capture

**Goal:** Every lead from every channel lands in one inbox automatically, with zero manual data entry.

#### 2.1 Facebook & Instagram Lead Ads (Webhook)

- Agent connects Facebook Page via OAuth (Meta Login)
- App registers webhook for `leadgen` events on connected Pages
- On form submission: lead auto-created with contact name, phone, email, source = `facebook_ad` or `instagram_ad`, ad campaign/set/creative attribution
- Duplicate detection: if phone already exists in contacts, merge into existing contact and add new lead
- Push notification sent to agent within 30 seconds of submission
- Form question mapping: agent can map custom form fields to lead/buyer_requirement fields in Settings
- **Meta `time_on_form` signal captured** — forms completed in < 5 seconds flagged as potential accidental clicks

#### 2.1.1 Meta Instant Form Lead Filtering (At Capture)

Meta Instant Forms support conditional logic and lead filtering gates. The app helps agents configure qualifying forms:

**Pre-configured form templates by property type:**
- Landed property form: residency gate (Citizen/PR only — others blocked from submission), budget bands (S$2M–3M / 3M–5M / 5M+), timeline, existing property ownership
- Condo form: residency status, budget bands, timeline, first-time buyer flag
- HDB form: citizenship confirmation, current housing, eligibility period check

**Lead filtering gate (hard block):**
- For landed property ads: "Are you a Singapore Citizen or PR?" — selecting No prevents form submission entirely. Zero unqualified leads enter the system.
- For HDB ads: "Are you a Singapore Citizen?" — same hard gate.
- Configurable per campaign in Settings → Lead Forms

**Conditional logic questions:**
```
Q1 (Filter gate): "Are you looking to buy or rent?"
→ "Just browsing" → Thank You page. Form not submitted.
→ "Buy" or "Rent" → continue

Q2: "What is your residency status in Singapore?"
→ Citizen | PR | Employment Pass | Other

Q3: "Do you currently own a property in Singapore?"
→ Yes, HDB | Yes, Private | No, first-time buyer | More than one

Q4: "What is your approximate budget?"
→ Multiple choice bands appropriate to property type

Q5: "How soon are you looking to move?"
→ Within 3 months | 3–6 months | 6–12 months | Just exploring
```

**Intent score auto-computed from form answers:**
- Timeline within 3 months + budget declared + first-time buyer = Score 5 (Hot)
- Timeline 3–6 months + budget declared = Score 4
- Timeline 6–12 months = Score 3
- "Just exploring" or accidental click signals = Score 1–2

**PDPA compliance at capture:**
- Ad purpose stored per lead (`ad_purpose` field) — satisfies Meta October 2025 Lead Ads policy requiring data use limited to declared campaign purpose
- Consent timestamp recorded at form submission

#### 2.2 WhatsApp Inbound

- Inbound WhatsApp message to agent's business number arrives in Messages inbox
- If phone matches existing contact → thread appended to their timeline
- If unknown number → new contact and lead auto-created with source = `whatsapp`
- Agent replies from in-app; message delivered via WhatsApp

#### 2.3 Manual Lead Entry

- Quick-add form: name, phone, source, deal type, urgency
- Full profile editable after creation
- Business card scan (camera → OCR pre-fill) — Phase 2

#### 2.4 Portal Lead Import

> **Research finding:** PropertyGuru and EdgeProp do not offer public lead or listing APIs for third-party developers. PropertyGuru for Business is B2B enterprise only. EdgeProp tools (EPIQ, EdgeProspect) are proprietary and closed. Apify-based scraping violates portal ToS — avoided entirely.

- Email parsing: agent forwards portal enquiry email to a dedicated inbox address (e.g., `leads+{tenant_id}@propagent.sg`)
- App parses name, phone, email, property enquired using structured email templates from PropertyGuru/EdgeProp/99.co
- Lead created with source = `portal`, portal name tagged
- Phase 2: If any portal opens an API, integrate via webhook

#### 2.5 Web Form Widget

- Embeddable JS snippet for agent's personal website or landing page
- Captures: name, phone, email, property interest, budget
- Creates lead with source = `web_form`

#### Lead Inbox View

- Unified list of all new leads sorted by recency
- Source badge (FB, IG, WhatsApp, Web, Manual, Referral, Portal)
- Lead type badge (Buyer, Seller, Landlord, Tenant)
- Urgency indicator (Hot 🔴 / Warm 🟡 / Cold 🔵)
- **Verification badge** (🟢 High / 🟡 Medium / 🔴 Low confidence)
- **Eligibility warning badge** — red flag if foreigner on landed, or other restricted combination
- **Intent score** (1–5) displayed as filled dots or bar
- One-tap actions: Call, WhatsApp, Move to Pipeline, Verify Identity
- Unread message count per lead
- Accidental click indicator (⚡) if time_on_form < 5 seconds

---

### Module 3: CRM Pipeline

**Goal:** Agent always knows who to contact next and what action is blocking each deal.

#### 3.1 Pipeline Stages (Default)

1. New Lead
2. Contacted
3. Qualified
4. Viewing Booked
5. Viewing Done
6. Negotiating
7. OTP / LOI Issued
8. Closed Won
9. Closed Lost
10. Nurture (long-term follow-up)

Agent can rename stages but cannot delete Closed Won / Closed Lost.

#### 3.2 Pipeline Views

- **Kanban board** — cards grouped by stage, drag-and-drop to advance
- **List view** — sortable by stage, last activity, urgency, budget
- **Focus view** — shows only Hot leads and leads with overdue tasks

#### 3.3 Lead Card

Each lead card displays:
- Contact name, phone, deal type, urgency
- **Eligibility status badge** — auto-computed from residency × property type × ownership rules:
  - 🟢 Eligible — no restrictions
  - 🟡 Conditional — e.g., PR buying landed (SLA approval needed), citizen with existing HDB
  - 🔴 Restricted — e.g., foreigner on landed, foreigner on HDB
- **Verification confidence badge** (🟢 High / 🟡 Medium / 🔴 Low):
  - High: PayNow name matches + residency confirmed + budget in range + timeline ≤ 3 months
  - Medium: PayNow registered (name unverified) + budget declared
  - Low: PayNow not registered, or foreign status on restricted property, or "just exploring"
- **Intent score** (1–5) from form answers
- Days since last activity (red if > 3 days with no follow-up)
- Next task due
- One-tap: WhatsApp, Call, Add Note, Book Viewing, Verify Identity, Search LinkedIn
- Timeline: chronological log of calls, messages, notes, stage changes, viewings, verification actions

#### 3.4 Contact Profile

- Full contact details: name, phone, email, nationality, PR status
- **LinkedIn profile URL** (saved once, one-tap return link)
- Buyer requirement profile (districts, type, budget, bedrooms, timeline)
- Seller property details if applicable
- Linked leads and deals
- Full communication history (WhatsApp, calls, notes)
- Relationship tags (spouse, co-owner, introducer, co-broke agent)
- **PDPA section:** consent status, consent date, consent source, data retention expiry, export/delete actions

#### 3.5 Smart Alerts

- "No follow-up in 3 days" — badge on lead card + daily digest notification
- "Viewing scheduled tomorrow" — 24hr and 2hr push reminder
- "OTP expiry in 2 days" — push notification
- "Lead went cold" — 7 days no activity on Hot lead → auto-downgrade to Warm

#### 3.6 Tasks

- Create task linked to lead or deal
- Due date, priority, description
- Daily task digest notification at 8:30am
- Overdue tasks highlighted in red on pipeline

#### 3.7 Singapore Eligibility Rules Engine

Auto-evaluates lead eligibility based on residency status × property type × ownership status:

| Buyer Profile | Landed | Private Condo | HDB | Auto-flag |
|---|---|---|---|---|
| Citizen, 1st property | ✅ Eligible | ✅ | ✅ | None |
| Citizen, owns HDB | ✅ (must sell HDB) | ✅ | Upgrade rules | 🟡 Yellow |
| PR, 1st property | ⚠️ SLA approval needed | ✅ | ✅ (resale only) | 🟡 Yellow |
| Foreigner (non-PR) | ❌ Not eligible | ✅ (60% ABSD) | ❌ | 🔴 Red |
| Entity / Trust | ❌ Restricted | ✅ (35% ABSD) | ❌ | 🔴 Red |

- Rules stored in `eligibility_rules` table — admin-editable when policy changes
- When lead enters pipeline with `residency_status` + `deal_type`, eligibility auto-evaluated
- Red-flagged leads show prominent warning badge before agent books viewing
- ABSD rate auto-displayed on deal card for eligible-but-taxed combinations

#### 3.8 Lead Verification Actions

One-tap verification tools on the lead card to confirm identity and seriousness:

**PayNow Phone Verification (Phase 2):**
- "Verify Identity" button on lead card
- App calls PayNow Enquiry API with lead's phone number
- Returns: registered (yes/no) + account holder name
- Display states:
  - ✅ PayNow Verified — Name matches: [NAME]
  - ⚠️ PayNow Registered — Name mismatch (form says X, PayNow says Y)
  - ❌ Number not registered on PayNow — Unverified
- Verification action logged on lead timeline with timestamp (PDPA audit trail)
- Requires business API consumer registration with OCBC/MAS

**LinkedIn Profile Lookup (Phase 1):**
- "Search LinkedIn" button on lead card
- Opens: `linkedin.com/search/results/people/?keywords={full_name}+Singapore`
- Agent reviews in browser, pastes LinkedIn URL back into contact profile
- Saved URL becomes one-tap return link on contact card
- Phase 2: Apply for LinkedIn Marketing Partner API access for programmatic profile data

---

### Module 4: Listings & Matching

**Goal:** Structured listing records that enable automatic buyer-listing matching.

#### 4.1 Listing Record

Fields:
- Address, postal code, unit, floor
- District (D01–D28) — auto-populated from postal code lookup
- Property type: HDB | Condo | Landed | Commercial
- HDB flat type (if HDB): 2-room to Executive
- Tenure: Freehold | 99-year | 999-year
- Floor area (sqft), asking price, PSF (auto-computed)
- Asking rental (if rental listing)
- TOP / completion year
- Listing type: Sale | Rental
- Status: Draft | Live | Under Offer | Sold | Rented | Withdrawn
- Media: up to 20 photos, 1 video, 1 floorplan PDF
- Description (free text; AI draft available — Phase 2)
- Exclusive: Yes/No + exclusivity expiry date

#### 4.2 Listing Performance

- Total enquiries
- Total viewings scheduled
- Total viewings completed
- Offers received count
- Days on market

#### 4.3 Buyer-Listing Matching

- Buyer requirement profile stored per lead (districts, type, HDB type, tenure, budget, size, bedrooms)
- Match engine runs on: new listing added, new buyer requirement added, listing price change
- Match score computed based on field overlap (district weight 30%, type weight 25%, budget weight 25%, size/bedrooms weight 20%)
- Agent sees "X matched buyers" on each listing card
- Agent sees "X matched listings" on each buyer lead card
- One-tap to send matched listing via WhatsApp to buyer — Phase 2

#### 4.4 Open House

- Create open house event linked to listing
- Set date, time, duration
- Share registration link (WhatsApp / web)
- Attendee log with contact creation per registrant
- Post-event feedback notes per attendee

#### 4.5 Area Insight (Submodule)

**Goal:** Auto-generate location context, transaction signals, and agent talking points from a listing's postal code — reducing manual research and strengthening agent conversations.

> This is a submodule of Listings + Viewing Management, not a standalone market intelligence module. It stays tied to daily workflow where agents feel the edge.

**Data sources:**
- URA Data Service API — private residential transactions by project/postal code
- Postal code → district/planning area mapping
- Listing and buyer requirement data already in the system

**Generation approach:** Hybrid — template-based for transaction summaries (deterministic), LLM-assisted for talking points and seller pitch (richer natural language).

**UI surfaces (5 compact cards):**

1. **Area Insight card** on Listing Detail — area summary, confidence note, "why this matters" bullets
2. **Viewing Prep card** on Lead Detail (when viewing is scheduled) — 3 talking points, recent nearby transactions, 1–2 likely objections to prepare for
3. **Buyer Fit panel** on Lead Detail — "fit signals" and "watchouts" tied to saved buyer requirements
4. **Seller Pitch snippet** on Listing Detail — short paragraph agent can copy into WhatsApp or use during pitch
5. **Refresh Insight action** — button to rerun enrichment after price change or new data

**Output schema (cached as JSONB on listing):**
```
area_insights: {
  area_summary: string,
  planning_context: string | null,
  nearby_transactions: { project, price, psf, date, type }[],
  transaction_summary: string,
  fit_signals: string[],
  watchouts: string[],
  agent_talking_points: string[],
  seller_pitch_snippet: string,
  confidence_note: string,
  last_refreshed_at: timestamp
}
```

**Rules for insight generation:**
- Summarize, do not predict — no price forecasts
- Surface only what helps an agent act: fit, objection prep, pricing support, viewing prep
- Use "watchout" language instead of hard recommendations for directional signals
- Always show source freshness and disclaimer when using transaction data
- Fail gracefully — if URA data unavailable, return limited summary, never block listing creation

**Acceptance criteria:**
- Agent can generate Area Insight automatically when listing is saved with valid postal code
- Viewing Prep loads without requiring agent to open separate tools
- Buyer Fit panel shows at least 2 signals/watchouts when buyer requirements exist
- If external data incomplete, module returns limited summary instead of erroring
- All summaries are mobile-readable, collapsible, and copyable

---

### Module 5: Viewing Management

**Goal:** Streamline the scheduling, reminders, and post-viewing follow-up cycle.

#### Features

- Schedule viewing: link lead + listing, select date/time, duration
- Google Calendar sync (OAuth) — adds event to agent's calendar
- Auto-send WhatsApp reminder to client: 24 hours and 2 hours before
- Reschedule / cancel flow with templated WhatsApp notification
- Mark viewing as Attended / No-show
- Post-viewing fields: feedback summary, buyer interest level (1–5), objections logged, seller update sent (checkbox)
- Shortlist management: buyer's liked / rejected listings tracked per lead
- Viewing history per listing and per lead

#### Pre-Viewing Qualification Checklist

Before confirming a viewing, the app prompts a soft qualification gate — protects agent's time without blocking them:

```
Before confirming viewing for [Lead Name]:

□ Residency status confirmed? (Citizen / PR / EP)
□ Eligibility for property type confirmed?
□ Financing pre-approval / proof of funds discussed?
□ Existing property situation understood?
□ Decision maker confirmed? (or is spouse/partner also involved?)
□ Timeline genuine? (move-in within ___ months)
□ PayNow verified? (Phase 2)

[ Skip and Book Anyway ]   [ Confirm — All Checks Done ]
```

- Does not block the agent — "Skip and Book Anyway" always available
- Logs qualification status on lead timeline
- Incomplete checklist shows 🟡 warning on viewing card
- Completed checklist shows 🟢 on viewing card
- Stored as JSONB in `pre_viewing_checklist` field on lead

---

### Module 6: Communication (WhatsApp & Messaging)

**Goal:** All client communication captured and accessible without leaving the app.

#### 6.1 Unified Message Thread

- Per-contact conversation view combining WhatsApp messages, notes, and system events (stage changes, viewings, tasks)
- Inbound WhatsApp messages trigger push notification
- Agent types reply in app; delivered via WhatsApp BSP
- Media support: images, PDFs, voice notes (receive only at MVP)
- Read receipts and delivery status

#### 6.1.1 WhatsApp Number Architecture

> **Research finding:** Each agent must have their own WhatsApp Business number. A WA Business number cannot be their personal WhatsApp simultaneously — agents need a dedicated business SIM or secondary number.

**Pro plan (per-agent number):**
- Agent connects their own WhatsApp Business number via BSP OAuth
- 1:1 mapping: one number, one agent, all conversations belong to them
- Simplest model — no routing logic needed

**Team plan (shared routed number):**
- Agency connects one shared WhatsApp Business number
- Conversations routed to assigned agents via configurable rules:
  - Round-robin (rotating assignment)
  - Availability-based (assign to online agents with lowest workload)
  - Keyword-based (route "buy" queries to sales agents, "rent" to rental team)
  - Department-based (landed team, condo team, HDB team)
- Routing inbox with agent assignment UI
- `wa_numbers` table tracks all connected numbers per tenant
- `wa_number_id` on messages table links each message to the correct number

**Constraint communicated to users:** "Your WhatsApp Business number must be a dedicated business line — it cannot be your personal WhatsApp number at the same time."

#### 6.2 Message Templates

- Pre-saved templates: initial follow-up, viewing confirmation, offer congratulations, post-closing thank you
- Templates personalised with merge fields: {{name}}, {{property_address}}, {{viewing_time}}
- Template library managed in Settings

#### 6.3 Quick Replies

- Frequently used messages saved as quick replies (e.g., "I'll send you the brochure now")
- Accessible from message input toolbar

#### 6.4 Manual Call Log

- "Log a call" action on lead timeline
- Duration, outcome (answered | voicemail | no answer), notes
- Counts toward last-activity timestamp

---

### Module 7: Deal & Transaction Management

**Goal:** Track every deal from offer to completion with no missed milestones.

#### 7.1 Deal Record

- Linked to: lead, listing, co-broke agent (if applicable)
- Deal type: Sale | Resale | Rental | Landlord Rep | Tenant Rep | Co-broke
- Offer price history (log every offer made/received)
- Agreed price
- Commission %  and computed commission amount
- Co-broke split % and co-broke agent contact
- OTP date, exercise deadline, completion date
- Stamp duty calculator (rules-engine architecture — see Module 11: Market Intelligence)

#### 7.2 Milestone Tracker

For Sale / Resale deals:
1. Offer accepted
2. OTP issued
3. OTP exercised
4. 1% booking fee received
5. Caveat lodged
6. Legal paperwork in progress
7. Completion
8. Commission received

For Rental deals:
1. Offer accepted
2. Letter of Intent (LOI) signed
3. Tenancy Agreement signed
4. Security deposit received
5. Handover completed
6. Commission received

Each milestone: date field, completed checkbox, notes, document upload slot.

#### 7.3 Documents

- Upload and attach documents to deal: OTP, S&P Agreement, LOI, Tenancy Agreement, commission invoices
- Document type tagging
- View and download from deal record

#### 7.4 Commission Tracker

- Commission amount auto-computed from agreed price × commission %
- Co-broke deduction auto-applied
- Net commission displayed
- Payment status: Unpaid | Partial | Received
- Payment date recorded

#### 7.5 Closed-Lost Capture

- Mandatory reason selection on Closed Lost: Price | Location | Timing | Co-broke lost | Client changed mind | Other
- Feeds into analytics

---

### Module 8: Marketing Tools

**Goal:** Agent creates and tracks marketing content without leaving the app.

> Note: Phase 1 covers creation and tracking. Ad campaign management within the app is Phase 3.

#### 8.1 Listing Content Generator (AI-assisted — Phase 2)

- Input: listing details
- Output: property description, Facebook ad copy, Instagram caption, WhatsApp broadcast message
- Tone selector: Professional | Casual | Urgency

#### 8.2 Flyer / Poster Generator

- Select listing → choose branded template
- Agent uploads logo and profile photo once (saved in Settings)
- Download as JPEG/PDF for sharing on WhatsApp or social media
- Phase 1: 5 fixed templates. Phase 2: custom template editor.

#### 8.3 Listing Landing Page

- Auto-generated public URL per listing: `propagent.sg/l/{listing_slug}`
- Displays: photos, key details, agent contact, WhatsApp CTA button
- Enquiry form creates lead in pipeline automatically
- Agent can share link directly in WhatsApp or social posts

#### 8.4 Campaign Tracking

- Log a campaign: platform, campaign name, budget, start/end date, linked listing
- Leads tagged with campaign ID (auto via webhook for Facebook; manual for other channels)
- ROI summary: leads generated, cost per lead, viewings booked, deals closed

---

### Module 9: Analytics & Reporting

**Goal:** Agent understands where deals come from and where they are losing time.

#### 9.1 Dashboard KPIs (Home Screen)

- Active leads by stage (mini funnel)
- New leads this week vs last week
- Viewings scheduled this week
- Open tasks overdue
- Deals closing this month (by completion date)
- Estimated commission pipeline (sum of deals in Negotiating + OTP stages)

#### 9.2 Pipeline Conversion Report

- Stage-by-stage conversion rates
- Average time spent per stage
- Drop-off stage identification

#### 9.3 Lead Source Report

- Leads by source: Facebook, Instagram, WhatsApp, referral, web form, portal
- Cost per lead (if campaign budget logged)
- Leads → Viewings → Offers → Closed conversion by source

#### 9.4 Activity Report

- Calls logged per week
- Messages sent per week
- Viewings completed per week
- Response time to new leads (median hours)

#### 9.5 Commission Report

- Closed deals by month
- Gross commission earned (YTD)
- Pending commissions (deals in OTP/completion stage)
- Co-broke deductions summary

#### 9.6 Export

- All reports exportable to CSV
- Deal summary exportable to PDF (for self-reporting / tax)

---

### Module 10: Settings & Administration

#### Agent Profile
- Full name, phone, email, profile photo
- CEA licence number and expiry date
- Agency affiliation (optional)
- WhatsApp Business number (linked via BSP)

#### Integrations
- Facebook Page connection (OAuth)
- Google Calendar connection (OAuth)
- WhatsApp number registration (via BSP onboarding flow)
- Portal email forwarding address (read-only, system-generated)

#### Notifications
- Push notification preferences per event type
- Daily digest time
- Email notification fallback toggle

#### Subscription & Billing
- Current plan, next billing date
- Upgrade / downgrade plan
- Invoice history
- Cancel subscription

---

### Module 11: Market Intelligence & Stamp Duty Calculator

**Goal:** Give agents data-driven tools for client conversations — transaction comps, price trends, and stamp duty estimates — powered by free public APIs.

> **Data sources:** URA Data Service API (private residential transactions since 2004, no auth required), data.gov.sg (REST API, free), IRAS (official BSD/ABSD rate tables, manually maintained).

#### 11.1 Stamp Duty Calculator

**Rules-engine architecture** — rates stored in `stamp_duty_rates` database table, not hardcoded. Admin can update rates without a code release when IRAS announces policy changes.

**Inputs:**
- Purchase price
- Buyer profile: Singapore Citizen | PR | Foreigner | Entity | Trust
- Property count: 1st | 2nd | 3rd or more
- Property type (for eligibility cross-reference)

**Outputs:**
- Buyer's Stamp Duty (BSD) — progressive rate calculation
- Additional Buyer's Stamp Duty (ABSD) — flat rate on full price
- Total stamp duty payable
- Breakdown table showing each band

**Rate table structure:**
```sql
stamp_duty_rates:
  id, duty_type (BSD | ABSD),
  buyer_profile (citizen | PR | foreigner | entity | trust),
  property_count (1st | 2nd | 3rd_plus),
  price_band_min, price_band_max,
  rate_pct,
  effective_from (date), effective_to (date nullable)
```

**Disclaimer (mandatory on every output):** "This is an estimate only. Consult a lawyer or IRAS for definitive stamp duty obligations."

**Maintenance:** ABSD rates have changed ~4 times since 2011. When they change, it's major news — update rate table within 24 hours of any IRAS announcement.

#### 11.2 Transaction Price History

- Search by project name, street, or postal code
- Display recent transactions: date, unit, area, price, PSF
- Data from URA REALIS API (private residential) and data.gov.sg (HDB resale)
- Filter by time period (last 6 months, 1 year, 3 years, all)
- PSF trend chart per project

#### 11.3 Market Comparables (Comps)

- Given a listing or address, show comparable transactions in same project and nearby projects
- Compare asking price vs. recent transacted PSF
- Highlight if asking price is above/below market average
- Useful for: pricing discussions with sellers, buyer negotiations, valuation conversations

#### 11.4 District Price Trends

- Average PSF by district (D01–D28) over time
- Property type breakdown (HDB, condo, landed)
- Volume of transactions per quarter
- Useful for: market reports agents share with clients

**Tier availability:**
- Stamp duty calculator: All tiers (Free hook to attract agents)
- Transaction history: All tiers (limited to 10 lookups/month on Free)
- Comps and trends: Pro and Team only

---

### Module 12: PDPA Compliance & Data Governance

**Goal:** Make the app a compliance enabler — agents can demonstrate proper data handling to clients and regulators.

> **Research finding:** CEA has worked with PDPC to produce sector-specific PDPA guidelines for real estate agents. The app must support all key obligations.

#### 12.1 Consent Management

- Every contact has `whatsapp_optin`, `consent_given_at`, `consent_source` fields
- Consent recorded at point of capture (form submission, WhatsApp opt-in, manual entry)
- Consent status visible on contact profile
- Bulk consent status report exportable

#### 12.2 Purpose Limitation

- Each lead stores `ad_purpose` — the declared purpose of the campaign that generated it
- Leads from Facebook Lead Ads cannot be repurposed for unrelated marketing without fresh consent (Meta October 2025 policy)
- Warning shown if agent attempts to add a lead to a broadcast list with a different purpose than original capture

#### 12.3 Do Not Call (DNC) Registry Check — Phase 2

- Before sending SMS or marketing messages via broadcast feature, check Singapore DNC Registry
- DNC check integrated into broadcast send flow — blocked numbers flagged before send
- Audit log of DNC checks performed

#### 12.4 Data Retention Policy

- Tenant-level setting: auto-anonymise closed/lost contacts after X years (default: 5 years)
- Aligned with CPF/legal limitation periods for property disputes
- Anonymisation removes PII (name, phone, email) but retains deal statistics for reporting
- Manual override: agent can extend retention for active relationships

#### 12.5 Data Access & Deletion

- Per-contact "Export Data" action — generates PDF/JSON of all data held about that person
- Per-contact "Delete Data" action — removes all PII, anonymises linked records
- Audit log of all export/delete actions (required for PDPC accountability)
- Self-service for agents to execute on client request

#### 12.6 Data Breach Protocol

- If platform is breached and data of 500+ individuals affected, PDPC must be notified within 3 business days
- Internal incident response documented in ops runbook (not in-app feature, but noted for compliance)

#### 12.7 Data Residency

- All data stored in Singapore region (AWS ap-southeast-1 via Supabase)
- Satisfies PDPA data transfer rules — no cross-border transfer concerns
- Documented in Terms of Service and Privacy Policy

---

## 7. Subscription Plans

| Feature | Free | Pro (S$79/mo) | Team (S$199/mo) |
|---|---|---|---|
| Contacts | 100 | Unlimited | Unlimited |
| Active leads | 20 | Unlimited | Unlimited |
| Listings | 5 | Unlimited | Unlimited |
| Facebook Lead Ads connection | 1 Page | 3 Pages | 10 Pages |
| WhatsApp messaging | Manual log only | Full integration (own number) | Full integration (shared routed number) |
| Lead form templates (conditional logic) | 1 template | Unlimited | Unlimited |
| Eligibility rules engine | ✅ | ✅ | ✅ |
| Verification score & badges | ✅ | ✅ | ✅ |
| PayNow verification | ✗ | ✅ (Phase 2) | ✅ (Phase 2) |
| Pre-viewing qualification checklist | ✅ | ✅ | ✅ |
| Stamp duty calculator | ✅ | ✅ | ✅ |
| Transaction history lookups | 10/month | Unlimited | Unlimited |
| Market comps & district trends | ✗ | ✅ | ✅ |
| Listing landing pages | ✗ | ✅ | ✅ |
| AI content generation | ✗ | ✅ (Phase 2) | ✅ (Phase 2) |
| Team members | 1 (solo) | 1 (solo) | Up to 10 |
| WhatsApp conversation routing | N/A | N/A | Round-robin, availability, keyword |
| Analytics | Basic KPIs | Full reports | Full + cross-agent |
| CSV export | ✗ | ✅ | ✅ |
| PDPA data export/delete tools | ✅ | ✅ | ✅ |
| Support | Community | Email | Priority chat |

---

## 8. MVP Scope (Phase 1)

Phase 1 delivers a daily-use habit loop: lead arrives → agent follows up → viewing booked → deal tracked.

### In Scope for MVP

- Authentication & onboarding (Module 1)
- Lead capture: Facebook Lead Ads webhook with conditional form templates, WhatsApp inbound, manual entry, web form widget, portal email parsing (Module 2)
- Meta Instant Form lead filtering with eligibility gates and intent scoring (Module 2.1.1)
- CRM pipeline: Kanban, lead card with eligibility/verification badges, contact profile, tasks, smart alerts (Module 3)
- Singapore eligibility rules engine — auto-flag restricted leads (Module 3.7)
- LinkedIn one-tap search deep link on lead card (Module 3.8)
- Listings: full listing record, basic matching (Module 4)
- Viewing scheduling with reminders and pre-viewing qualification checklist (Module 5)
- WhatsApp messaging thread with per-agent number (Module 6)
- Deal tracker: milestones, documents, commission (Module 7)
- Stamp duty calculator with rules-engine architecture (Module 11.1)
- Transaction price history from URA/data.gov.sg (Module 11.2)
- Home screen dashboard KPIs (Module 9 — partial)
- Settings: profile, integrations, notifications, billing (Module 10)
- PDPA compliance: consent tracking, data export/delete, retention policy (Module 12)
- Subscription: Free + Pro tiers, Stripe billing

### Deferred to Phase 2

- PayNow phone verification (OCBC API registration required) (Module 3.8)
- AI listing description and content generation
- WhatsApp broadcast / template campaigns with DNC Registry check
- Advanced analytics and lead source ROI
- Instagram direct message integration
- Business card OCR scanning
- Custom flyer template editor
- Team plan: shared WhatsApp number with routing inbox
- Team roles and cross-agent visibility
- Market comps and district price trends (Module 11.3, 11.4)
- LinkedIn API integration (Marketing Partner access)
- Portal email parsing improvements (ML-based extraction)

### Deferred to Phase 3

- In-app ad campaign creation and management
- TikTok Lead Ads
- Google Ads lead forms
- Voice AI for lead qualification
- Native dialer with call recording
- AI-powered lead scoring

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load (mobile, 4G) | < 2.5 seconds |
| Webhook lead delivery (FB → pipeline) | < 30 seconds |
| WhatsApp message delivery | < 5 seconds |
| Uptime | 99.5% monthly |
| Data residency | Singapore region (AWS ap-southeast-1) — mandatory for PDPA |
| PDPA compliance | Consent flag + timestamp per contact, purpose limitation per lead, data export/delete on request, auto-anonymise after retention period |
| DNC compliance | DNC Registry check before broadcast sends (Phase 2) |
| CEA awareness | CEA licence field, compliance notes field on deals, eligibility rules engine |
| Data breach notification | PDPC notified within 3 business days if 500+ individuals affected |
| Data retention | Default 5 years (aligned with CPF/legal limitation periods), configurable per tenant |
| RLS enforcement | All tenant data isolated at DB level — no application-layer filtering solely |
| Meta App Review | Submit when Lead Inbox functional; allow 2-week buffer before beta launch |

---

## 10. Resolved Decisions (Previously Open Questions)

| # | Question | Decision | Impact on Build |
|---|---|---|---|
| 1 | Portal API access | **No usable public API.** PropertyGuru and EdgeProp are closed ecosystems. Use email parsing for MVP. URA + data.gov.sg APIs (free, public) for market data. | Email parsing confirmed as only portal integration. Added Module 11 (Market Intelligence) using public APIs. |
| 2 | WhatsApp number policy | **Per-agent number for Pro; shared routed number for Team.** Agent cannot use personal WA simultaneously — needs dedicated business SIM. | Added `wa_numbers` table. Team plan routing is Phase 2 differentiator. |
| 3 | Meta App Review timeline | **5–10 business days. Submit early.** Requires functioning app with real API calls, screencast video, business verification (ACRA), privacy policy, housing ads compliance statement. | Build Lead Inbox first → submit review → use wait time for other modules. 2-week buffer before beta. |
| 4 | CEA / PDPA compliance | **PDPA applies directly. CEA has sector-specific guidelines.** Must support: consent per contact, purpose limitation per lead, DNC check (Phase 2), retention policy, data export/delete, breach notification protocol. | Added Module 12 (PDPA Compliance). Updated contacts/leads schema. Singapore data residency (ap-southeast-1) mandatory. |
| 5 | Stamp duty calculator | **Rules-engine with admin-editable rate table.** Seed from IRAS. Disclaimer on every output. Update within 24hrs of policy change. | Added `stamp_duty_rates` table. Calculator in Module 11. Not hardcoded. |

---

## 11. Meta App Review — Launch Dependency

Meta App Review is a critical-path dependency for the Facebook Lead Ads integration. Requirements:

1. **Business Verification** — ACRA registration document (a few days)
2. **Functioning app** — Lead Inbox must be working with real API calls (not mockups)
3. **Screencast video** — demonstrate exactly how lead data is accessed and used
4. **Privacy policy** — explain how lead data is stored and processed
5. **Housing Ads compliance** — property = special ad category under Meta policy
6. **Meta October 2025 policy compliance** — platform (as data processor) must ensure agents (as data controllers) only use lead data for declared campaign purpose. The `ad_purpose` field per lead satisfies this.

**Timeline:**
- Standard permissions: 2–4 days
- Advanced (Ads API, Lead Ads Retrieval): 4–7 days
- After rejection (restarts clock): +3–5 days

**Recommended sequence:**
```
Week 1–4: Build Lead Inbox + Pipeline (functional)
Week 4: Submit Meta App Review
Week 4–6: Build other modules during review wait
Week 6: Beta launch (review approved)
```

---

*Document version 0.2 — Updated with research findings on portal APIs, WhatsApp architecture, Meta review process, PDPA/CEA compliance, stamp duty rules engine, and lead qualification/verification features from agent interviews. All module priorities and phase assignments subject to revision based on development capacity.*
