# Requirements Document

## Introduction

The Contact vs Lead Object Model separates person-level identity from opportunity-level engagement in PropAgent SG. A contact is a permanent record representing a person or organization, storing identity, communication details, consent, and long-term relationship context. A lead is an opportunity-level record representing one concrete intent, enquiry, campaign response, or sales process — always linked to exactly one contact. This separation enables Singapore property agents to handle the same person making multiple enquiries across different listings, returning months or years later, acting in different roles (buyer, seller, landlord, tenant), or having multiple active opportunities simultaneously. The model refines the existing schema by enriching the contacts table with relationship-management fields and enriching the leads table with opportunity-lifecycle fields, while establishing clear rules for contact resolution, duplicate detection, and UI navigation patterns.

## Glossary

- **Contact_Service**: The PropAgent SG subsystem responsible for creating, resolving, updating, and managing permanent person-level contact records
- **Lead_Service**: The PropAgent SG subsystem responsible for creating, tracking, and managing opportunity-level lead records linked to contacts
- **Duplicate_Detection_Engine**: The logic that identifies potential duplicate leads for the same contact based on deal type, listing/requirement band, and creation recency
- **Contact_Profile_View**: The UI page displaying a contact's identity, communication info, consent status, and aggregated history across all linked leads and deals
- **Lead_Card_View**: The UI workspace for a single lead showing current stage, qualification, verification, and opportunity-specific context
- **Contact_Resolution**: The process of matching an incoming enquiry to an existing contact by normalized phone number, or creating a new contact if no match is found
- **PDPA**: Personal Data Protection Act — Singapore's data protection legislation governing collection, use, and disclosure of personal data
- **Tenant**: An agency or team operating within PropAgent SG; all data is scoped to a tenant for isolation
- **Pipeline_View**: The Kanban board and list views that display leads organized by pipeline stage
- **Inbox_View**: The list view showing new leads awaiting agent action
- **RLS**: Row-Level Security — Supabase/PostgreSQL feature enforcing that users can only access data belonging to their tenant

## Requirements

### Requirement 1: Contact Data Model Enhancement

**User Story:** As a property agent, I want contacts to store long-term relationship context independently of any single deal, so that I retain a complete picture of each person across multiple engagements over time.

#### Acceptance Criteria

1. THE Contact_Service SHALL store each contact with the following identity fields: unique identifier, tenant identifier, full name, phone number, email, nationality, PR status, and LinkedIn URL
2. THE Contact_Service SHALL store consent and compliance fields for each contact: WhatsApp opt-in flag, consent given timestamp, consent source, and data retention expiry date
3. THE Contact_Service SHALL store relationship management fields for each contact: primary agent identifier, contact status (active, inactive, archived, do_not_contact), last contacted timestamp, last inbound timestamp, first source, latest source, channel preference, and relationship tags
4. THE Contact_Service SHALL enforce a unique constraint on the combination of tenant identifier and normalized phone number to prevent duplicate contact records within the same tenant
5. THE Contact_Service SHALL enforce tenant isolation by associating every contact record with a tenant identifier and applying row-level security policies
6. THE Contact_Service SHALL maintain a contact record independently of linked leads, preserving the contact even when all linked leads are closed or lost, subject to data retention policy

### Requirement 2: Lead Data Model Enhancement

**User Story:** As a property agent, I want each lead to represent a distinct opportunity with lifecycle tracking, so that I can manage multiple concurrent and historical opportunities per contact.

#### Acceptance Criteria

1. THE Lead_Service SHALL store each lead with the following opportunity-lifecycle fields: lead title (short human label), lead category (buyer, seller, landlord, tenant, co_broke, nurture), is_active boolean flag, opened at timestamp, closed at timestamp, and close reason
2. THE Lead_Service SHALL store origin context fields for each lead: origin listing identifier (nullable) and duplicate of lead identifier (nullable)
3. THE Lead_Service SHALL enforce a foreign key constraint requiring every lead record to reference a valid contact identifier
4. THE Lead_Service SHALL set the is_active flag to true when a lead is created and set the is_active flag to false when the lead reaches a terminal stage (Closed Won, Closed Lost)
5. THE Lead_Service SHALL record the opened_at timestamp when a lead is created and the closed_at timestamp when a lead reaches a terminal stage
6. THE Lead_Service SHALL require a close reason when a lead is moved to Closed Won or Closed Lost stage

### Requirement 3: Contact Resolution on Lead Creation

**User Story:** As a property agent, I want every new enquiry to automatically resolve to an existing contact or create a new one, so that I never have duplicate person records and all history is linked.

#### Acceptance Criteria

1. WHEN a new lead is created from any source (Facebook Ad, WhatsApp, portal, web form, referral, manual entry), THE Contact_Service SHALL search existing contacts in the same tenant by normalized phone number
2. WHEN a matching contact is found by normalized phone number, THE Contact_Service SHALL reuse the existing contact identifier for the new lead
3. WHEN no matching contact is found by normalized phone number, THE Contact_Service SHALL create a new contact record with the provided name, phone, and email before creating the lead
4. THE Contact_Service SHALL update the contact's latest_source field to reflect the source of the most recent lead creation
5. THE Contact_Service SHALL update the contact's last_inbound_at timestamp when a new lead is created from an inbound channel (WhatsApp, web form, Facebook Ad)

### Requirement 4: Duplicate Lead Detection and Agent Choice

**User Story:** As a property agent, I want the system to warn me about potential duplicate leads for the same contact, so that I can decide whether to create a new lead or attach activity to an existing one.

#### Acceptance Criteria

1. WHEN a new lead is being created for a contact that already has existing leads, THE Duplicate_Detection_Engine SHALL display a context banner showing: number of past leads, number of closed deals, and number of currently active leads for that contact
2. WHEN a new lead is being created for a contact with an active lead of the same deal type, created within the past 14 days, THE Duplicate_Detection_Engine SHALL display a duplicate warning to the agent
3. WHEN a duplicate warning is displayed, THE Lead_Service SHALL present the agent with three options: create new lead (default), attach activity to the current active lead, or merge into the active lead
4. WHEN the agent selects "create new lead" or takes no explicit action, THE Lead_Service SHALL create a new lead record linked to the existing contact
5. WHEN the agent selects "attach activity to current lead", THE Lead_Service SHALL link the incoming enquiry data to the existing active lead without creating a new lead record
6. THE Lead_Service SHALL NOT automatically merge leads without explicit agent confirmation

### Requirement 5: Multiple Active Leads Per Contact

**User Story:** As a property agent, I want a contact to have multiple active leads simultaneously for different scenarios, so that I can track a person who is both buying and selling at the same time.

#### Acceptance Criteria

1. THE Lead_Service SHALL allow a contact to have multiple active leads simultaneously, provided each lead has a different lead category
2. WHEN a new lead is created with the same lead category as an existing active lead for the same contact, THE Duplicate_Detection_Engine SHALL warn the agent about the potential duplicate
3. THE Lead_Service SHALL NOT enforce a limit on the total number of active leads per contact
4. THE Lead_Service SHALL independently track pipeline stage, urgency, and qualification status for each lead belonging to the same contact

### Requirement 6: Contact Profile View

**User Story:** As a property agent, I want a unified contact profile showing all history across leads and deals, so that I have full context about a person before engaging with them.

#### Acceptance Criteria

1. THE Contact_Profile_View SHALL display the contact's identity and communication information: full name, phone, email, nationality, PR status, LinkedIn URL, and channel preference
2. THE Contact_Profile_View SHALL display consent and PDPA information: WhatsApp opt-in status, consent given timestamp, consent source, and data retention expiry
3. THE Contact_Profile_View SHALL display all linked leads in reverse chronological order by creation date, showing lead title, lead category, status, and is_active flag for each
4. THE Contact_Profile_View SHALL display all linked deals aggregated from all leads, showing deal type, status, and agreed price for each
5. THE Contact_Profile_View SHALL display the full message history across all leads, sorted by timestamp descending
6. THE Contact_Profile_View SHALL display an aggregated timeline at the contact level showing key events from all linked leads
7. THE Contact_Profile_View SHALL display relationship tags and long-term notes associated with the contact

### Requirement 7: Lead Card View

**User Story:** As a property agent, I want a focused lead workspace showing only the opportunity-specific context, so that I can manage each deal efficiently without distraction from unrelated history.

#### Acceptance Criteria

1. THE Lead_Card_View SHALL display the lead title, lead category, current pipeline stage, urgency level, and is_active status
2. THE Lead_Card_View SHALL display qualification and verification information: budget range, intent score, verification score badge, and eligibility risk badge
3. THE Lead_Card_View SHALL display the next pending task, associated viewings, and deal context for the lead
4. THE Lead_Card_View SHALL display opportunity-specific notes and a timeline of events scoped to the current lead only
5. THE Lead_Card_View SHALL provide navigation to the parent contact profile

### Requirement 8: Navigation and Search Behavior

**User Story:** As a property agent, I want intuitive navigation between contact-level and lead-level views, so that I can quickly switch context depending on whether I am managing a person or an opportunity.

#### Acceptance Criteria

1. THE Inbox_View SHALL open into a lead-first view, displaying leads with their associated contact name
2. THE Pipeline_View SHALL operate on leads, displaying lead cards grouped by pipeline stage
3. WHEN a user searches for a contact by name or phone, THE Contact_Service SHALL return the contact result along with all active leads under that contact
4. THE Contact_Profile_View SHALL provide direct navigation links to each linked lead's Lead_Card_View
5. WHEN viewing messages, THE Contact_Profile_View SHALL display messages at the contact level with optional filtering by a selected lead

### Requirement 9: Message Linking

**User Story:** As a property agent, I want messages to be linked to both the contact and optionally a specific lead, so that I can view conversation history at either level.

#### Acceptance Criteria

1. THE Lead_Service SHALL link every message record to a contact_id (required) and optionally to a lead_id
2. WHEN a message is sent or received in the context of a specific lead, THE Lead_Service SHALL set both the contact_id and lead_id on the message record
3. WHEN a message is sent or received without a specific lead context, THE Lead_Service SHALL set only the contact_id on the message record
4. THE Contact_Profile_View SHALL display all messages for a contact regardless of lead_id
5. THE Lead_Card_View SHALL display only messages where the lead_id matches the current lead

### Requirement 10: Task Linking

**User Story:** As a property agent, I want tasks to support both lead-level and contact-level association, so that I can create follow-up tasks for a specific opportunity or for general relationship management.

#### Acceptance Criteria

1. THE Lead_Service SHALL support tasks with a lead_id (required for opportunity tasks) and optionally a contact_id
2. WHEN a task is created in the context of a lead, THE Lead_Service SHALL set the lead_id and derive the contact_id from the lead's parent contact
3. THE Lead_Card_View SHALL display tasks associated with the current lead
4. THE Contact_Profile_View SHALL display all tasks across all leads for the contact, plus any contact-level tasks

### Requirement 11: PDPA Compliance Operations

**User Story:** As a property agent, I want data export and deletion to operate at the contact level and cascade safely, so that I can comply with Singapore PDPA requirements without leaving orphaned records.

#### Acceptance Criteria

1. WHEN a PDPA data export is requested for a contact, THE Contact_Service SHALL export all contact fields, all linked leads, all linked messages, all linked tasks, all linked buyer requirements, all linked viewings, and all linked deals
2. WHEN a PDPA deletion is requested for a contact, THE Contact_Service SHALL anonymise the contact record by removing personally identifiable fields (full name, phone, email, nationality, PR status, LinkedIn URL) and replacing them with anonymised placeholders
3. WHEN a contact is anonymised, THE Contact_Service SHALL anonymise all linked message bodies and remove media URLs from linked messages
4. WHEN a contact is anonymised, THE Contact_Service SHALL set the contact status to "archived" and clear the data retention expiry
5. THE Contact_Service SHALL NOT delete lead records, deal records, or task records during anonymisation, preserving aggregate business data with anonymised references
6. IF a contact's data retention expiry date has passed, THEN THE Contact_Service SHALL flag the contact for review by the primary agent before automatic anonymisation

### Requirement 12: Cardinality Enforcement

**User Story:** As a system administrator, I want the data model to enforce correct relationships between tenants, contacts, leads, and deals, so that data integrity is maintained.

#### Acceptance Criteria

1. THE Contact_Service SHALL enforce that one tenant can have many contacts and one contact belongs to exactly one tenant
2. THE Lead_Service SHALL enforce that one contact can have zero, one, or many leads and one lead belongs to exactly one contact
3. THE Lead_Service SHALL enforce that one lead can result in zero or one primary deal record via foreign key constraint
4. THE Contact_Service SHALL enforce that deleting a contact cascades appropriately to linked leads, messages, tasks, buyer requirements, and viewings according to the configured cascade policy
5. THE Lead_Service SHALL enforce that a lead's contact_id cannot be changed after creation to prevent accidental reassignment of opportunity history

