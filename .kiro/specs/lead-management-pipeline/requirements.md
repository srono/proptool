# Requirements Document

## Introduction

Lead Management & Pipeline is the core CRM feature of PropAgent SG — a Singapore Property Agent Operating System. It enables property agents to capture, qualify, track, and convert leads through a structured 10-stage pipeline tailored to Singapore's property transaction lifecycle. The system supports multi-channel lead ingestion (Meta ads, WhatsApp, portals, referrals, open houses, web forms, and manual entry), Singapore-specific eligibility risk detection (ABSD, residency restrictions), buyer verification via PayNow, and a pre-viewing qualification checklist. The feature operates in a multi-tenant environment with row-level security ensuring data isolation between agencies.

## Glossary

- **Lead_Management_System**: The PropAgent SG subsystem responsible for creating, storing, qualifying, and tracking leads through the sales pipeline
- **Pipeline_Board**: The Kanban-style visual interface displaying leads organized by pipeline stage columns
- **Lead_Inbox**: The list view showing new leads awaiting agent action
- **Lead_Detail_View**: The single-lead page displaying contact info, stage selector, qualification checklist, timeline, buyer requirements, viewings, and tasks
- **Meta_Webhook_Handler**: The API endpoint that receives Facebook/Instagram Lead Ad form submissions and creates leads automatically
- **WhatsApp_Webhook_Handler**: The API endpoint that receives inbound WhatsApp messages via 360dialog and creates leads for new contacts
- **Eligibility_Engine**: The logic that determines purchase eligibility risk based on residency status, property ownership, and deal type per Singapore regulations
- **Pre_Viewing_Checklist**: A 7-item qualification checklist that agents complete before scheduling property viewings
- **Intent_Score**: A computed score (1–5) indicating lead purchase intent, derived from form answers (timeline, budget, specificity)
- **Verification_Score**: A score (1–3) indicating the level of identity verification completed for a lead (low/medium/high)
- **Pipeline_Stage**: One of 10 ordered stages a lead progresses through: New Lead, Contacted, Qualified, Viewing Booked, Viewing Done, Negotiating, OTP/LOI Issued, Closed Won, Closed Lost, Nurture
- **Buyer_Requirement**: A structured record of a buyer's property search criteria including districts, property types, budget, size, and timeline
- **Tenant**: An agency or team operating within PropAgent SG; all data is scoped to a tenant for isolation
- **ABSD**: Additional Buyer's Stamp Duty — a Singapore government tax on property purchases that varies by residency status and number of properties owned
- **OTP**: Option to Purchase — a legal document in Singapore property transactions giving the buyer exclusive right to purchase
- **LOI**: Letter of Intent — a document expressing intent to lease in Singapore rental transactions
- **PayNow**: A Singapore peer-to-peer funds transfer service linked to NRIC/phone, used here for identity verification
- **RLS**: Row-Level Security — Supabase/PostgreSQL feature enforcing that users can only access data belonging to their tenant

## Requirements

### Requirement 1: Lead Data Model

**User Story:** As a property agent, I want each lead to capture comprehensive Singapore-specific qualification data, so that I can assess buyer readiness and eligibility before investing time in viewings.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL store each lead with the following core fields: unique identifier, tenant identifier, contact reference, assigned agent, pipeline stage, lead source, deal type, urgency level, budget minimum, budget maximum, move-in date, and notes
2. THE Lead_Management_System SHALL store ad tracking fields for each lead: ad campaign identifier, ad set identifier, ad creative identifier, and ad purpose
3. THE Lead_Management_System SHALL store qualification fields for each lead: residency status (citizen, pr, ep, other), property ownership (none, hdb, private, multiple), eligibility risk flag, eligibility flag reason, intent score (1–5), time on form in seconds, and timeline declared (0–3 months, 3–6 months, 6–12 months, exploring)
4. THE Lead_Management_System SHALL store verification fields for each lead: PayNow verified flag, PayNow name match flag, PayNow registered name, verification score (1–3), and pre-viewing checklist state
5. THE Lead_Management_System SHALL store timestamp fields for each lead: created-at and last-activity-at
6. THE Lead_Management_System SHALL enforce tenant isolation by associating every lead record with a tenant identifier and applying row-level security policies

### Requirement 2: Pipeline Stages

**User Story:** As a property agent, I want a structured pipeline reflecting the Singapore property transaction lifecycle, so that I can track where each lead stands in the sales process.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL support exactly 10 pipeline stages in the following order: New Lead (1), Contacted (2), Qualified (3), Viewing Booked (4), Viewing Done (5), Negotiating (6), OTP/LOI Issued (7), Closed Won (8), Closed Lost (9), Nurture (10)
2. WHEN an agent selects a new stage for a lead, THE Lead_Management_System SHALL update the lead status to the selected stage and set last_activity_at to the current timestamp
3. THE Lead_Management_System SHALL allow leads to move to any stage without enforcing sequential progression, enabling agents to skip stages or move leads backward
4. THE Lead_Management_System SHALL classify Closed Won and Closed Lost as terminal stages that remove leads from the active pipeline count

### Requirement 3: Lead Sources

**User Story:** As a property agent, I want to track where each lead originated, so that I can measure marketing channel effectiveness and optimize ad spend.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL support the following lead sources: Facebook Ad, Instagram Ad, Portal, WhatsApp, Referral, Open House, Web Form, and Manual
2. THE Lead_Management_System SHALL record the lead source at creation time and preserve the original source value throughout the lead lifecycle
3. WHEN a lead originates from a Facebook or Instagram ad, THE Lead_Management_System SHALL additionally store the ad campaign identifier, ad set identifier, ad creative identifier, and ad purpose

### Requirement 4: Deal Types and Urgency

**User Story:** As a property agent, I want to categorize leads by transaction type and urgency, so that I can prioritize my follow-up actions appropriately.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL support the following deal types: sale, resale, rental, landlord representation, and tenant representation
2. THE Lead_Management_System SHALL support three urgency levels: hot (🔴), warm (🟡), and cold (🔵)
3. THE Lead_Management_System SHALL require a deal type and urgency level for every lead at creation time

### Requirement 5: Manual Lead Creation

**User Story:** As a property agent, I want to manually add leads from walk-ins, phone calls, or networking events, so that all my prospects are tracked in one system.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL provide a form to create leads with the following required fields: contact name and phone number
2. THE Lead_Management_System SHALL provide optional fields on the creation form: email, source, deal type, urgency, and notes
3. WHEN a lead is created manually, THE Lead_Management_System SHALL set the initial pipeline stage to New Lead
4. WHEN a lead is created with a phone number matching an existing contact, THE Lead_Management_System SHALL link the lead to the existing contact record instead of creating a duplicate
5. WHEN a lead is created for a new phone number, THE Lead_Management_System SHALL create a new contact record with the provided name, phone, and email

### Requirement 6: Meta (Facebook/Instagram) Lead Ad Integration

**User Story:** As a property agent running Facebook and Instagram ads, I want leads from ad forms to automatically appear in my pipeline, so that I can respond quickly without manual data entry.

#### Acceptance Criteria

1. WHEN the Meta webhook receives a leadgen event, THE Meta_Webhook_Handler SHALL fetch the lead data from the Meta Graph API using the leadgen identifier
2. WHEN lead data is retrieved from Meta, THE Meta_Webhook_Handler SHALL extract the contact name, phone number, email, and form answers from the field data
3. WHEN a valid phone number is present in the Meta lead data, THE Meta_Webhook_Handler SHALL find or create a contact record using the normalized phone number
4. WHEN a new lead is created from Meta, THE Meta_Webhook_Handler SHALL set the source to "facebook_ad", the pipeline stage to New Lead, and store the ad campaign, ad set, and ad creative identifiers
5. WHEN form answers include timeline and budget data, THE Meta_Webhook_Handler SHALL compute an intent score (1–5) based on timeline urgency, budget specificity, and property type specificity
6. WHEN the computed intent score is 4 or higher, THE Meta_Webhook_Handler SHALL set the lead urgency to hot; WHEN the score is 2 or 3, THE Meta_Webhook_Handler SHALL set urgency to warm; WHEN the score is 1, THE Meta_Webhook_Handler SHALL set urgency to cold
7. THE Meta_Webhook_Handler SHALL verify the webhook subscription using the hub.mode, hub.verify_token, and hub.challenge parameters, returning the challenge value for valid tokens and a 403 status for invalid tokens
8. WHEN a lead is created and an agent is assigned, THE Meta_Webhook_Handler SHALL send a push notification to the assigned agent with the lead name and source

### Requirement 7: WhatsApp Inbound Lead Creation

**User Story:** As a property agent, I want inbound WhatsApp messages from new contacts to automatically create leads, so that I never miss an enquiry.

#### Acceptance Criteria

1. WHEN the WhatsApp webhook receives an inbound message from a phone number with no existing contact, THE WhatsApp_Webhook_Handler SHALL create a new contact record and a new lead with source set to "whatsapp", stage set to New Lead, and urgency set to warm
2. WHEN the WhatsApp webhook receives an inbound message from a phone number with an existing contact but no active lead, THE WhatsApp_Webhook_Handler SHALL create a new lead for that contact
3. WHEN the WhatsApp webhook receives an inbound message from a contact with an active (non-closed) lead, THE WhatsApp_Webhook_Handler SHALL update the lead's last_activity_at timestamp and link the message to the existing lead
4. THE WhatsApp_Webhook_Handler SHALL normalize Singapore phone numbers by adding the +65 country code prefix for 8-digit local numbers
5. THE WhatsApp_Webhook_Handler SHALL resolve the tenant identifier from the WhatsApp phone number ID mapping, falling back to single-tenant mode when no mapping exists

### Requirement 8: Eligibility Risk Detection

**User Story:** As a property agent, I want the system to automatically flag leads with potential eligibility issues based on Singapore property regulations, so that I can address restrictions early in the sales process.

#### Acceptance Criteria

1. WHEN a lead is created with a residency status of "foreigner" or "other" and a deal type of "sale" or "resale", THE Eligibility_Engine SHALL set the eligibility_risk flag to true
2. WHEN the eligibility_risk flag is set to true, THE Eligibility_Engine SHALL record the reason including the residency status and deal type combination
3. THE Lead_Detail_View SHALL display an "ELIG RISK" badge prominently on leads with the eligibility_risk flag set to true
4. THE Lead_Inbox SHALL display an "ELIG WATCH" badge on leads with the eligibility_risk flag set to true

### Requirement 9: Pre-Viewing Qualification Checklist

**User Story:** As a property agent, I want a structured checklist to complete before scheduling viewings, so that I only bring qualified and prepared buyers to property viewings.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL provide a pre-viewing checklist with the following 7 items: residency confirmed, eligibility confirmed, financing discussed, existing property understood, decision maker confirmed, timeline genuine, and PayNow verified
2. THE Lead_Detail_View SHALL display the checklist with a completion count showing items completed out of total items
3. THE Lead_Detail_View SHALL visually distinguish completed checklist items from incomplete items using check marks and color differentiation
4. THE Lead_Management_System SHALL store the checklist state as a structured object with boolean values for each item

### Requirement 10: Lead Verification (PayNow)

**User Story:** As a property agent, I want to verify buyer identity through PayNow before viewings, so that I can confirm the lead is a genuine buyer and reduce time-waster viewings.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL track whether a lead has been PayNow verified with a boolean flag
2. THE Lead_Management_System SHALL store the PayNow registered name and whether the name matches the contact name
3. THE Lead_Management_System SHALL compute a verification score from 1 (low) to 3 (high) based on the verification steps completed
4. THE Lead_Detail_View SHALL display the verification score as a badge with color coding: green for score 3, amber for score 2, and red for score 1

### Requirement 11: Buyer Requirements Capture

**User Story:** As a property agent, I want to record detailed buyer property requirements, so that I can match leads to suitable listings in the Singapore market.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL store buyer requirements with the following fields: preferred districts (from Singapore's 28 postal districts D01–D28), property types, HDB types, tenure preference, budget minimum, budget maximum, minimum floor area in square feet, maximum floor area in square feet, minimum bedrooms, deal type, timeline, and additional notes
2. THE Lead_Management_System SHALL associate buyer requirements with both a contact and a specific lead record
3. THE Lead_Detail_View SHALL display buyer requirements including districts, property types, and minimum bedrooms when available

### Requirement 12: Lead Inbox (List View)

**User Story:** As a property agent, I want a focused inbox showing new leads awaiting action, so that I can quickly triage and respond to incoming enquiries.

#### Acceptance Criteria

1. THE Lead_Inbox SHALL display leads filtered to the New Lead stage, ordered by creation date descending (newest first)
2. THE Lead_Inbox SHALL display for each lead: contact name, phone number, source, deal type, creation date, intent score, and eligibility risk badge
3. THE Lead_Inbox SHALL limit the displayed list to 50 leads per page
4. THE Lead_Inbox SHALL provide a link to create a new lead manually
5. WHEN no leads exist, THE Lead_Inbox SHALL display an empty state with guidance to connect a Facebook Page or add a lead manually

### Requirement 13: Lead Detail View

**User Story:** As a property agent, I want a comprehensive single-lead view with all relevant information and actions, so that I can manage the lead effectively without switching between screens.

#### Acceptance Criteria

1. THE Lead_Detail_View SHALL display the contact name, phone number, and email as the page header
2. THE Lead_Detail_View SHALL display status badges for: verification score, eligibility risk, intent score, urgency level, and lead source
3. THE Lead_Detail_View SHALL provide a stage selector dropdown allowing the agent to change the pipeline stage
4. THE Lead_Detail_View SHALL display a message timeline showing all inbound and outbound messages sorted by timestamp descending
5. THE Lead_Detail_View SHALL display lead details including deal type, residency status, budget range, timeline declared, and creation date
6. THE Lead_Detail_View SHALL display associated viewings with scheduled date/time and status
7. THE Lead_Detail_View SHALL display associated tasks with title, due date, and completion status
8. IF a lead identifier does not match any existing lead, THEN THE Lead_Detail_View SHALL return a 404 not-found response

### Requirement 14: Pipeline Board (Kanban View)

**User Story:** As a property agent, I want a visual Kanban board showing all leads organized by stage, so that I can see my entire pipeline at a glance and identify bottlenecks.

#### Acceptance Criteria

1. THE Pipeline_Board SHALL display all 10 pipeline stages as columns with leads grouped under their current stage
2. THE Pipeline_Board SHALL display the total count of leads across all stages
3. THE Pipeline_Board SHALL order leads within each column by last activity date descending (most recently active first)
4. THE Pipeline_Board SHALL display for each lead card: contact name, phone, email, and associated tasks
5. THE Pipeline_Board SHALL provide navigation to create a new lead

### Requirement 15: Phone Number Normalization

**User Story:** As a property agent, I want phone numbers to be consistently formatted regardless of how they are entered, so that duplicate contacts are correctly identified and WhatsApp integration works reliably.

#### Acceptance Criteria

1. WHEN a phone number with 8 digits is received, THE Lead_Management_System SHALL prepend the +65 Singapore country code
2. WHEN a phone number starting with "65" and having 10 digits total is received, THE Lead_Management_System SHALL prepend a "+" prefix
3. WHEN a phone number without a "+" prefix is received and does not match the above patterns, THE Lead_Management_System SHALL prepend a "+" prefix
4. THE Lead_Management_System SHALL strip all non-digit characters from phone numbers before applying normalization rules

### Requirement 16: Multi-Tenancy and Data Isolation

**User Story:** As an agency administrator, I want all lead data to be isolated between tenants, so that agents from different agencies cannot access each other's leads.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL associate every lead record with a tenant_id
2. THE Lead_Management_System SHALL enforce row-level security policies ensuring users can only query leads belonging to their own tenant
3. WHEN a lead is created via webhook, THE Lead_Management_System SHALL resolve the tenant from the channel connection mapping (Meta page ID or WhatsApp phone number ID), falling back to single-tenant mode when no mapping exists
4. THE Lead_Management_System SHALL associate every buyer requirement record with a tenant_id

### Requirement 17: Lead Activity Tracking

**User Story:** As a property agent, I want the system to track when leads were last active, so that I can identify stale leads needing follow-up.

#### Acceptance Criteria

1. WHEN a lead's pipeline stage is changed, THE Lead_Management_System SHALL update the last_activity_at timestamp to the current time
2. WHEN an inbound message is received for a lead, THE Lead_Management_System SHALL update the lead's last_activity_at timestamp to the current time
3. THE Lead_Management_System SHALL record the created_at timestamp when a lead is first created
4. THE Pipeline_Board SHALL use last_activity_at for ordering leads within each stage column

### Requirement 18: Push Notifications for New Leads

**User Story:** As a property agent, I want to receive push notifications when new leads arrive, so that I can respond quickly and improve conversion rates.

#### Acceptance Criteria

1. WHEN a new lead is created from a Meta ad webhook and an agent is assigned, THE Lead_Management_System SHALL send a push notification to the assigned agent
2. THE Lead_Management_System SHALL include the lead contact name and source in the push notification body
3. THE Lead_Management_System SHALL include a deep link URL to the leads page in the push notification
4. IF the push notification delivery fails, THEN THE Lead_Management_System SHALL log the failure and continue processing without failing the webhook response

### Requirement 19: Intent Score Computation

**User Story:** As a property agent, I want leads from ad forms to be automatically scored for purchase intent, so that I can prioritize high-intent leads for immediate follow-up.

#### Acceptance Criteria

1. THE Lead_Management_System SHALL compute intent score starting from a base value of 2
2. WHEN the declared timeline is 0–3 months, THE Lead_Management_System SHALL add 2 points to the intent score
3. WHEN the declared timeline is 3–6 months, THE Lead_Management_System SHALL add 1 point to the intent score
4. WHEN budget information (minimum or maximum) is provided, THE Lead_Management_System SHALL add 1 point to the intent score
5. WHEN a specific property type or district preference is provided, THE Lead_Management_System SHALL add 1 point to the intent score
6. THE Lead_Management_System SHALL cap the maximum intent score at 5
