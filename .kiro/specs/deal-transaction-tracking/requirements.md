# Requirements Document

## Introduction

Deal & Transaction Tracking is the feature of PropAgent SG that enables Singapore property agents to manage the full lifecycle of property transactions — from initial negotiation through OTP/LOI issuance, exercise, legal completion, and commission collection. The feature provides milestone-based progress tracking with distinct templates for sale and rental transactions, commission calculation with co-broke split support, document attachment, and key date management. Deals are linked to leads and listings, and all data is isolated per tenant via Row-Level Security.

## Glossary

- **Deal_System**: The module responsible for creating, reading, updating, and managing deal records within PropAgent SG
- **Milestone_Tracker**: The UI component that displays and manages the sequential progress steps for a deal, allowing agents to mark milestones as completed with dates and notes
- **Deal_Form**: The UI component responsible for capturing and validating deal data during creation
- **Deal_List**: The UI page that displays all deals for the authenticated agent, with filtering by status category
- **Deal_Detail**: The UI page that displays full deal information including summary, milestones, documents, commission breakdown, and key dates
- **OTP**: Option to Purchase — a legally binding document in Singapore property transactions giving the buyer the right to purchase within a specified exercise period
- **LOI**: Letter of Intent — a document used in rental transactions indicating the tenant's intent to lease
- **TA**: Tenancy Agreement — the binding rental contract between landlord and tenant
- **Co-broke**: A transaction where commission is shared between two agents (the listing agent and the buyer/tenant agent)
- **RLS**: Row-Level Security — Supabase database policy ensuring agents can only access deals belonging to their tenant
- **Commission_Payment_Status**: The payment state of the agent's commission — unpaid, partial, or received
- **Closed_Lost_Reason**: The categorized reason a deal fell through — price, location, timing, co_broke_lost, client_changed_mind, or other

## Requirements

### Requirement 1: Deal Creation

**User Story:** As a property agent, I want to create a new deal linked to an existing lead, so that I can begin tracking a transaction from the negotiation stage.

#### Acceptance Criteria

1. WHEN the agent submits the deal form with a valid lead selected, THE Deal_System SHALL persist the deal with status "negotiating" and redirect the agent to the deals list page.
2. THE Deal_Form SHALL require the agent to select a lead from leads in qualifying stages (negotiating, otp_loi_issued, viewing_booked, or qualified).
3. THE Deal_Form SHALL allow the agent to optionally link a listing to the deal.
4. THE Deal_Form SHALL accept a deal_type value of "sale", "resale", "rental", or "new_launch".
5. THE Deal_Form SHALL accept optional pricing fields: offer_price and agreed_price.
6. THE Deal_Form SHALL accept optional commission fields: commission_pct and co_broke_split_pct with co_broke_agent_name.
7. WHEN commission_pct and agreed_price are both provided, THE Deal_Form SHALL compute and display the commission_amount as agreed_price multiplied by commission_pct divided by 100.
8. WHEN co_broke_split_pct is provided, THE Deal_Form SHALL compute and display the net commission as commission_amount minus the co-broke deduction (commission_amount multiplied by co_broke_split_pct divided by 100).
9. THE Deal_Form SHALL accept optional date fields: otp_date, exercise_deadline, and completion_date.
10. THE Deal_Form SHALL accept an optional free-text notes field.
11. WHEN the agent provides an otp_date during deal creation, THE Deal_System SHALL update the linked lead's status to "otp_loi_issued".
12. IF the agent submits the form without selecting a lead, THEN THE Deal_Form SHALL display a validation error requesting lead selection.

### Requirement 2: Deal Status Lifecycle

**User Story:** As a property agent, I want to track the progression of a deal through defined stages, so that I can monitor where each transaction stands.

#### Acceptance Criteria

1. THE Deal_System SHALL support the following deal statuses in order: negotiating, otp_issued, otp_signed, exercised, completed, and fallen_through.
2. WHEN a deal's status is updated, THE Deal_System SHALL persist the new status and update the deal's updated_at timestamp.
3. WHEN a deal's status is set to "fallen_through", THE Deal_System SHALL accept a closed_lost_reason value from: price, location, timing, co_broke_lost, client_changed_mind, or other.
4. THE Deal_System SHALL display the current status with a color-coded badge: amber for negotiating, aqua for otp_issued/otp_signed/exercised, green for completed, and red for fallen_through.

### Requirement 3: Deal List View

**User Story:** As a property agent, I want to view all my deals in a filterable list, so that I can quickly find and manage active transactions.

#### Acceptance Criteria

1. THE Deal_List SHALL display all deals for the authenticated agent's tenant, ordered by creation date descending.
2. THE Deal_List SHALL provide three filter tabs: "Active" (excluding completed and fallen_through), "Completed", and "Fallen Through".
3. THE Deal_List SHALL default to the "Active" filter on page load.
4. THE Deal_List SHALL display each deal card with: contact name, deal status badge, deal type, linked listing address, agreed price, and commission amount.
5. WHEN a deal has a completion_date, THE Deal_List SHALL display the completion date on the deal card.
6. WHEN the agent clicks a deal card, THE Deal_List SHALL navigate to the deal detail page.
7. THE Deal_List SHALL limit the query to 50 deals per filter view.
8. WHEN no deals match the current filter, THE Deal_List SHALL display an empty state message guiding the agent to create a deal.

### Requirement 4: Deal Detail View

**User Story:** As a property agent, I want to view comprehensive details of a deal on a single page, so that I can review all transaction information at a glance.

#### Acceptance Criteria

1. WHEN the agent navigates to a deal detail page, THE Deal_Detail SHALL display the contact name, deal status badge, deal type, and linked listing address in the header.
2. THE Deal_Detail SHALL display a Deal Summary section with: contact name, phone, property address and district, property type, offer price, agreed price, OTP/LOI date, exercise deadline, and completion date.
3. WHEN the deal has notes, THE Deal_Detail SHALL display the notes below the deal summary.
4. THE Deal_Detail SHALL display the Milestone Tracker component for the deal.
5. THE Deal_Detail SHALL display a Documents section listing all attached documents with name, type label, and a link to view each document.
6. WHEN no documents are attached, THE Deal_Detail SHALL display a message indicating no documents have been uploaded.
7. THE Deal_Detail SHALL display a Commission panel showing: gross commission, commission rate percentage, co-broke deduction with percentage, net commission, co-broke agent name, and payment status.
8. THE Deal_Detail SHALL display a Key Dates panel showing: OTP/LOI date, exercise deadline, completion date, and deal creation date.
9. IF the deal ID does not exist or the agent lacks access, THEN THE Deal_Detail SHALL return a 404 not-found response.

### Requirement 5: Milestone Tracking — Sale Transactions

**User Story:** As a property agent handling a sale, I want to track progress through the 8 standard sale milestones, so that I can ensure no step is missed during the transaction.

#### Acceptance Criteria

1. WHEN a deal has deal_type "sale", "resale", or "new_launch", THE Milestone_Tracker SHALL initialize with 8 milestones in order: Offer Accepted, OTP Issued, OTP Exercised, Booking Fee Received, Caveat Lodged, Legal Completion, Completion, and Commission Received.
2. THE Milestone_Tracker SHALL display a progress bar showing the ratio of completed milestones to total milestones.
3. THE Milestone_Tracker SHALL display milestones as a vertical stepper with visual indicators: green checkmark for completed, highlighted dot for current (first incomplete), and dimmed dot for future steps.
4. WHEN the agent clicks a milestone indicator, THE Milestone_Tracker SHALL toggle the milestone's completed state and set the completion date to the current date if marking as complete.
5. WHEN a milestone is completed or is the current step, THE Milestone_Tracker SHALL display editable date and notes fields for that milestone.
6. WHEN the agent modifies a milestone's date or completion state, THE Milestone_Tracker SHALL persist the updated milestones array to the deal record.
7. WHEN the agent modifies a milestone's notes and the field loses focus, THE Milestone_Tracker SHALL persist the updated milestones array to the deal record.

### Requirement 6: Milestone Tracking — Rental Transactions

**User Story:** As a property agent handling a rental, I want to track progress through the 6 standard rental milestones, so that I can manage the leasing process efficiently.

#### Acceptance Criteria

1. WHEN a deal has deal_type "rental", THE Milestone_Tracker SHALL initialize with 6 milestones in order: Offer Accepted, LOI Signed, TA Signed, Deposit Received, Handover, and Commission Received.
2. THE Milestone_Tracker SHALL apply the same progress bar, visual stepper, toggle, date, notes, and persistence behavior as defined in Requirement 5 acceptance criteria 2 through 7.

### Requirement 7: Commission Tracking

**User Story:** As a property agent, I want to track my commission details including co-broke splits, so that I can monitor my expected earnings from each deal.

#### Acceptance Criteria

1. THE Deal_System SHALL store commission_pct as a percentage value and commission_amount as a currency value in SGD.
2. WHEN commission_pct and agreed_price are both present, THE Deal_System SHALL compute commission_amount as agreed_price multiplied by commission_pct divided by 100.
3. WHEN co_broke_split_pct is present, THE Deal_Detail SHALL compute and display the co-broke deduction as commission_amount multiplied by co_broke_split_pct divided by 100.
4. THE Deal_Detail SHALL compute and display net_commission as commission_amount minus the co-broke deduction.
5. THE Deal_System SHALL track commission_payment_status with values: "unpaid", "partial", or "received".
6. THE Deal_System SHALL store an optional commission_received_date when payment status changes to "received".
7. THE Deal_Detail SHALL display commission amounts formatted in SGD currency with two decimal places and thousands separators.

### Requirement 8: Co-broke Agent Management

**User Story:** As a property agent, I want to record co-broke arrangements with other agents, so that I can track commission splits accurately.

#### Acceptance Criteria

1. THE Deal_Form SHALL accept an optional co_broke_agent_name as free text identifying the co-broking agent.
2. THE Deal_Form SHALL accept an optional co_broke_split_pct as a percentage value representing the co-broke agent's share of the gross commission.
3. WHEN co_broke_split_pct is greater than zero, THE Deal_Detail SHALL display the co-broke agent name and the deduction amount in the commission panel.
4. THE Deal_System SHALL store co_broke_agent_id as an optional reference for future integration with agent directories.

### Requirement 9: Document Attachment

**User Story:** As a property agent, I want to attach documents to a deal, so that I can keep all transaction paperwork organized in one place.

#### Acceptance Criteria

1. THE Deal_System SHALL store documents as an array of objects, each containing a URL, document type label, and document name.
2. THE Deal_Detail SHALL display each attached document with its name, type badge, and a link to view the document in a new browser tab.
3. WHEN no documents are attached to a deal, THE Deal_Detail SHALL display a message stating "No documents uploaded yet".

### Requirement 10: Key Date Management

**User Story:** As a property agent, I want to record and view key transaction dates, so that I can track deadlines and ensure timely completion.

#### Acceptance Criteria

1. THE Deal_System SHALL store the following optional date fields: otp_date, exercise_deadline, completion_date, and commission_received_date.
2. THE Deal_Detail SHALL display all populated date fields formatted in Singapore locale (day month short format).
3. THE Deal_Detail SHALL always display the deal's created_at date in the Key Dates panel.
4. THE Deal_Form SHALL accept otp_date, exercise_deadline, and completion_date as optional date inputs during deal creation.

### Requirement 11: Multi-Tenant Data Isolation

**User Story:** As a property agent, I want my deal data to be isolated from other agents' data, so that my transaction information remains private and secure.

#### Acceptance Criteria

1. THE Deal_System SHALL associate every deal record with a tenant_id.
2. THE Deal_System SHALL enforce Row-Level Security policies so that agents can only query, insert, and update deals belonging to their own tenant.
3. WHEN the agent queries the deals list or a deal detail, THE Deal_System SHALL automatically filter results by the authenticated agent's tenant_id.

### Requirement 12: Lead and Listing Linkage

**User Story:** As a property agent, I want deals to be linked to my leads and listings, so that I can trace the full journey from lead acquisition to deal completion.

#### Acceptance Criteria

1. THE Deal_System SHALL require every deal to reference a lead_id from the leads table.
2. THE Deal_System SHALL accept an optional listing_id linking the deal to a property listing.
3. WHEN displaying a deal, THE Deal_Detail SHALL resolve and display the linked lead's contact name, phone, and email.
4. WHEN a listing is linked, THE Deal_Detail SHALL resolve and display the listing's address, district, and property type.
5. WHEN creating a deal, THE Deal_Form SHALL fetch available listings ordered by creation date descending, limited to 100 records.
