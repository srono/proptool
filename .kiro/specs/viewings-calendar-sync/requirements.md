# Requirements Document

## Introduction

Viewings & Calendar Sync is the feature of PropAgent SG that enables Singapore property agents to schedule property viewings for leads, track viewing outcomes with post-viewing feedback, and synchronize viewing appointments to Google Calendar. The feature includes a pre-viewing qualification checklist (soft gate), viewing lifecycle management (scheduled → completed/cancelled/rescheduled), buyer interest tracking, seller update tracking, and bidirectional Google Calendar integration via OAuth 2.0. Viewings link leads to listings and serve as a key conversion step in the agent's sales pipeline.

## Glossary

- **Viewing_System**: The module responsible for creating, reading, updating, and managing property viewing appointments within PropAgent SG
- **Calendar_Sync_Service**: The subsystem that integrates with Google Calendar API v3 to create, update, and delete calendar events corresponding to viewings
- **Viewing**: A scheduled property viewing appointment linking a lead to a listing, with associated time, duration, status, and feedback data
- **Pre_Viewing_Checklist**: A 7-item qualification checklist (residency confirmed, eligibility confirmed, financing discussed, existing property understood, decision maker confirmed, timeline genuine, PayNow verified) that acts as a soft gate before booking a viewing
- **Viewing_Form**: The UI component responsible for capturing viewing details including lead selection, listing selection, date/time, duration, and calendar sync preference
- **Google_Token_Manager**: The subsystem responsible for storing, validating, and refreshing Google OAuth 2.0 access tokens and refresh tokens for calendar integration
- **RLS**: Row-Level Security — Supabase database policy ensuring agents can only access viewings belonging to their tenant
- **Buyer_Interest_Level**: A 1-to-5 integer scale indicating the buyer's interest after a viewing (1 = not interested, 5 = very interested)
- **Schedule_Card**: The dashboard widget that displays upcoming viewings for the current agent

## Requirements

### Requirement 1: Viewing Creation

**User Story:** As a property agent, I want to schedule a new viewing by selecting a lead, listing, date, time, and duration, so that I can organize property showings for my buyers.

#### Acceptance Criteria

1. WHEN the agent submits the viewing form with a valid lead, listing, date, time, and duration, THE Viewing_System SHALL persist the viewing with status "scheduled" and attended set to null.
2. THE Viewing_Form SHALL require the following fields: lead (selected from existing leads), listing (selected from existing listings), date, and time.
3. THE Viewing_Form SHALL provide a duration selector with options: 30, 45, 60, 90, and 120 minutes, defaulting to 60 minutes.
4. THE Viewing_Form SHALL prevent selection of dates in the past by setting the minimum date to the current date.
5. WHEN the viewing is successfully created, THE Viewing_System SHALL update the associated lead's status to "viewing_booked" and set last_activity_at to the current timestamp.
6. WHEN a lead_id query parameter is present on the new viewing page, THE Viewing_Form SHALL pre-select that lead in the lead selector.
7. IF the agent submits the form with missing required fields (lead, listing, date, or time), THEN THE Viewing_Form SHALL display a validation error identifying the missing fields.

### Requirement 2: Pre-Viewing Qualification Checklist

**User Story:** As a property agent, I want a qualification checklist before booking a viewing, so that I can ensure the lead is properly qualified and avoid wasted viewings.

#### Acceptance Criteria

1. WHEN a lead is selected in the viewing form, THE Viewing_Form SHALL display the Pre_Viewing_Checklist with 7 items: residency confirmed, eligibility confirmed, financing discussed, existing property understood, decision maker confirmed, timeline genuine, and PayNow verified.
2. WHEN the selected lead has an existing pre_viewing_checklist saved, THE Viewing_Form SHALL pre-populate the checklist with the saved values.
3. WHEN no lead is selected, THE Viewing_Form SHALL hide the Pre_Viewing_Checklist section.
4. THE Viewing_Form SHALL display a progress indicator showing the count of completed checklist items out of 7.
5. WHEN the agent submits the form with an incomplete checklist, THE Viewing_Form SHALL display a warning indicating the incomplete count and offer two options: "Skip and Book Anyway" or "Go Back".
6. WHEN the agent clicks "Skip and Book Anyway", THE Viewing_System SHALL proceed with creating the viewing regardless of checklist completion.
7. WHEN the viewing is created, THE Viewing_System SHALL persist the current checklist state to the lead's pre_viewing_checklist field.

### Requirement 3: Viewing List View

**User Story:** As a property agent, I want to view all my upcoming viewings in a list, so that I can manage my schedule and prepare for appointments.

#### Acceptance Criteria

1. THE Viewing_System SHALL display all viewings with status "scheduled" or "rescheduled", ordered by scheduled_at ascending (soonest first).
2. THE Viewing_System SHALL display for each viewing: contact name, viewing status badge, listing address and district, scheduled date and time (formatted in en-SG locale), duration in minutes, and checklist qualification status.
3. THE Viewing_System SHALL display a "Qualified" badge when all 7 checklist items are complete, a fractional count (e.g., "4/7") when partially complete, and "No checklist" when no checklist data exists.
4. THE Viewing_System SHALL provide a "View Lead" link on each viewing card that navigates to the associated lead's detail page.
5. WHEN no upcoming viewings exist, THE Viewing_System SHALL display an empty state with guidance to schedule a viewing from a lead's detail page or via the schedule button.
6. THE Viewing_System SHALL provide a "Schedule Viewing" button that navigates to the new viewing form.

### Requirement 4: Viewing Status Lifecycle

**User Story:** As a property agent, I want to track the status of each viewing through its lifecycle, so that I can manage outcomes and follow up appropriately.

#### Acceptance Criteria

1. THE Viewing_System SHALL support the following viewing statuses: scheduled, completed, cancelled, and rescheduled.
2. WHEN a viewing is created, THE Viewing_System SHALL assign the initial status of "scheduled".
3. THE Viewing_System SHALL display status badges with distinct visual styling: scheduled (aqua/brand), rescheduled (amber), completed (green), and cancelled (red).
4. WHEN a viewing status is changed to "rescheduled", THE Viewing_System SHALL allow the agent to set a new scheduled_at date and time.

### Requirement 5: Post-Viewing Feedback

**User Story:** As a property agent, I want to record feedback after a viewing including attendance, buyer interest, and objections, so that I can track buyer sentiment and plan next steps.

#### Acceptance Criteria

1. WHEN a viewing is marked as completed, THE Viewing_System SHALL allow the agent to record: attended (boolean), buyer_interest_level (integer 1 to 5), feedback_notes (free text), objections (free text), and next_action (free text).
2. THE Viewing_System SHALL constrain buyer_interest_level to integer values between 1 and 5 inclusive.
3. THE Viewing_System SHALL store the attended field as a boolean indicating whether the buyer attended the viewing.
4. THE Viewing_System SHALL store the next_action field to capture the agent's planned follow-up step.

### Requirement 6: Seller Update Tracking

**User Story:** As a property agent, I want to track whether I have updated the seller after a viewing, so that I can maintain good communication with property owners.

#### Acceptance Criteria

1. THE Viewing_System SHALL maintain a seller_updated boolean field on each viewing, defaulting to false.
2. WHEN the agent marks a viewing as seller_updated, THE Viewing_System SHALL set the seller_updated field to true.
3. THE Viewing_System SHALL allow the agent to identify viewings where the seller has not yet been updated.

### Requirement 7: Google Calendar OAuth Integration

**User Story:** As a property agent, I want to connect my Google Calendar account, so that viewing appointments can be synced to my calendar automatically.

#### Acceptance Criteria

1. THE Google_Token_Manager SHALL store the following credentials per user: google_access_token, google_refresh_token, and google_token_expiry.
2. WHEN the agent has not connected Google Calendar, THE Viewing_Form SHALL display the calendar sync checkbox as disabled with a link to the Settings integrations page.
3. WHEN the agent has connected Google Calendar, THE Viewing_Form SHALL display the calendar sync checkbox as enabled and checked by default.
4. WHEN a calendar sync operation is requested and the stored access token has expired, THE Google_Token_Manager SHALL refresh the token using the stored refresh_token by calling the Google OAuth 2.0 token endpoint.
5. WHEN the token is successfully refreshed, THE Google_Token_Manager SHALL update the stored google_access_token and google_token_expiry for the user.
6. IF the token refresh fails, THEN THE Calendar_Sync_Service SHALL return an authentication error indicating the Google Calendar connection needs to be re-established.
7. IF the user has no google_refresh_token stored, THEN THE Calendar_Sync_Service SHALL return an error indicating Google Calendar is not connected.

### Requirement 8: Google Calendar Event Creation

**User Story:** As a property agent, I want viewing appointments to appear in my Google Calendar with property and contact details, so that I have all relevant information accessible from my calendar.

#### Acceptance Criteria

1. WHEN calendar sync is enabled and a viewing is created, THE Calendar_Sync_Service SHALL create a Google Calendar event on the user's primary calendar.
2. THE Calendar_Sync_Service SHALL set the event summary to the format: "Viewing: {ContactName} — {ListingAddress}".
3. THE Calendar_Sync_Service SHALL set the event description to include: contact name, contact phone, property type, listing address, and district.
4. THE Calendar_Sync_Service SHALL set the event start time to the viewing's scheduled_at and the end time to scheduled_at plus duration_mins, using the "Asia/Singapore" timezone.
5. THE Calendar_Sync_Service SHALL set the event location to the listing address and district.
6. THE Calendar_Sync_Service SHALL configure event reminders: a popup reminder at 30 minutes before and a popup reminder at 60 minutes before.
7. WHEN the calendar event is successfully created, THE Calendar_Sync_Service SHALL store the returned gcal_event_id on the viewing record.
8. IF the Google Calendar API returns an error during event creation, THEN THE Calendar_Sync_Service SHALL log the error and allow the viewing creation to succeed without blocking the main operation.

### Requirement 9: Calendar Sync API Endpoint

**User Story:** As a property agent, I want the calendar sync to happen via a secure API endpoint, so that only authenticated users can sync their own viewings.

#### Acceptance Criteria

1. THE Calendar_Sync_Service SHALL expose a POST /api/calendar/sync endpoint that accepts a JSON body with a viewing_id field.
2. WHEN the request is received without a valid authenticated session, THE Calendar_Sync_Service SHALL return HTTP 401 Unauthorized.
3. WHEN the viewing_id field is missing from the request body, THE Calendar_Sync_Service SHALL return HTTP 400 with an error message "viewing_id is required".
4. WHEN the specified viewing_id does not exist in the database, THE Calendar_Sync_Service SHALL return HTTP 404 with an error message "Viewing not found".
5. THE Calendar_Sync_Service SHALL fetch the viewing with related lead, contact, and listing data to populate the calendar event details.
6. WHEN the calendar event is created successfully, THE Calendar_Sync_Service SHALL return HTTP 200 with a JSON body containing success: true and the gcal_event_id.
7. IF an unexpected error occurs during processing, THEN THE Calendar_Sync_Service SHALL log the error and return HTTP 500 with a generic error message.

### Requirement 10: Dashboard Schedule Integration

**User Story:** As a property agent, I want to see my upcoming viewings on the dashboard, so that I can quickly check my schedule without navigating to the viewings page.

#### Acceptance Criteria

1. THE Schedule_Card SHALL display upcoming viewings with status "scheduled" on the agent's dashboard.
2. THE Schedule_Card SHALL show the count of viewings scheduled from the current date onwards as a KPI metric labeled "Viewings Booked".

### Requirement 11: Multi-Tenant Data Isolation

**User Story:** As a property agent, I want my viewings to be private to my agency, so that competing agents cannot view my schedule or client information.

#### Acceptance Criteria

1. THE Viewing_System SHALL enforce Row-Level Security policies ensuring agents can only query viewings belonging to their own tenant_id.
2. WHEN a viewing is created, THE Viewing_System SHALL automatically associate the viewing with the authenticated agent's tenant_id.
3. THE Viewing_System SHALL scope all viewing queries (list, detail, feedback) to the authenticated agent's tenant.

### Requirement 12: Viewing Data Model

**User Story:** As a developer, I want a well-defined viewing data model, so that all viewing-related features have a consistent data structure to work with.

#### Acceptance Criteria

1. THE Viewing_System SHALL store each viewing with the following fields: id (UUID), tenant_id (UUID), lead_id (UUID reference to leads), listing_id (UUID reference to listings), scheduled_at (ISO timestamp), duration_mins (integer), status (enum: scheduled, completed, cancelled, rescheduled), attended (nullable boolean), feedback_notes (nullable text), buyer_interest_level (nullable integer 1-5), objections (nullable text), seller_updated (boolean defaulting to false), next_action (nullable text), gcal_event_id (nullable text), and created_at (ISO timestamp).
2. THE Viewing_System SHALL enforce a foreign key relationship between viewing.lead_id and the leads table.
3. THE Viewing_System SHALL enforce a foreign key relationship between viewing.listing_id and the listings table.
4. THE Viewing_System SHALL default duration_mins to 60 when not explicitly provided.
