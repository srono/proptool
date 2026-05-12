# Requirements Document

## Introduction

The Contacts List Page provides a browsable index of all contacts at `/contacts` within the PropTool CRM dashboard. Currently, contacts can only be accessed via "View Contact Profile" links on lead detail pages. This feature adds a dedicated list view with search, status filtering, and direct navigation to individual contact profiles — following the same patterns established by the Leads, Deals, and Listings list views.

## Glossary

- **Contacts_List_Page**: The server-rendered page at `/contacts` that displays a searchable, filterable list of all contacts belonging to the current user's tenant.
- **Contact_Card**: A single row or card element in the contacts list representing one contact record, displaying summary information and linking to the contact profile.
- **Search_Input**: A text input field that filters the displayed contacts by matching against name or phone number.
- **Status_Filter**: A set of tab-style controls that filter contacts by their `contact_status` value (all, active, inactive, archived, do_not_contact).
- **Contact_Profile**: The existing detail view at `/contacts/[id]` showing full contact information, leads, deals, and messages.
- **Sidebar_Navigation**: The persistent left-hand navigation menu in the dashboard layout that provides links to all major sections of the application.

## Requirements

### Requirement 1: Page Routing and Layout

**User Story:** As an agent, I want a dedicated contacts page in the dashboard, so that I can browse my contact database without needing to navigate through leads first.

#### Acceptance Criteria

1. WHEN a user navigates to `/contacts`, THE Contacts_List_Page SHALL render within the existing dashboard layout with the sidebar navigation visible on viewports 1024px and wider and the mobile bottom navigation visible on viewports below 1024px.
2. THE Contacts_List_Page SHALL display a page header with the title "Contacts" and a subtitle of no more than 60 characters describing the page purpose.
3. THE Sidebar_Navigation SHALL include a "Contacts" link with `href` set to `/contacts` that is visually marked as active when the current path starts with `/contacts`.
4. IF a user navigates to `/contacts` and is not authenticated, THEN THE System SHALL redirect the user to `/login` before rendering the Contacts_List_Page.

### Requirement 2: Contact List Display

**User Story:** As an agent, I want to see all my contacts in a list, so that I can quickly scan and find the person I need.

#### Acceptance Criteria

1. THE Contacts_List_Page SHALL display contacts as a vertical list of Contact_Card elements ordered by most recently updated first (descending `updated_at` timestamp).
2. WHEN contacts exist, each Contact_Card SHALL display the contact full name, phone number, contact status, and the date of last activity formatted as "day month year" (e.g., "5 Jan 2025"), where last activity is the more recent of `last_contacted_at` or `last_inbound_at`.
3. IF both `last_contacted_at` and `last_inbound_at` are null for a contact, THEN the Contact_Card SHALL display a dash character ("—") in place of the last activity date.
4. WHEN no contacts exist, THE Contacts_List_Page SHALL display an empty state message indicating no contacts are available.
5. THE Contacts_List_Page SHALL limit the initial display to 50 contacts and SHALL not provide pagination or infinite scroll beyond the initial 50 results.

### Requirement 3: Search Functionality

**User Story:** As an agent, I want to search contacts by name or phone number, so that I can quickly locate a specific person.

#### Acceptance Criteria

1. THE Contacts_List_Page SHALL display a Search_Input field above the contacts list with a maximum input length of 100 characters.
2. WHEN a user enters at least 1 character into the Search_Input, THE Contacts_List_Page SHALL filter contacts from the full dataset (not limited to the initially displayed 50) to those whose full name or phone number contains the search term (case-insensitive partial match), where phone number matching is performed against the raw digit sequence ignoring formatting characters such as spaces, dashes, and parentheses.
3. WHEN the Search_Input is cleared, THE Contacts_List_Page SHALL display the full unfiltered contacts list with the default 50-contact limit applied.
4. WHEN a search yields no results, THE Contacts_List_Page SHALL display a message indicating no contacts match the search term, distinct from the "no contacts exist" empty state.

### Requirement 4: Status Filtering

**User Story:** As an agent, I want to filter contacts by status, so that I can focus on active clients or review archived ones separately.

#### Acceptance Criteria

1. THE Contacts_List_Page SHALL display a Status_Filter with tabs for: "All", "Active", "Inactive", "Archived", and "Do Not Contact".
2. WHEN a user selects a Status_Filter tab, THE Contacts_List_Page SHALL visually indicate the selected tab as active and display only contacts matching the selected contact_status value.
3. WHEN the "All" tab is selected, THE Contacts_List_Page SHALL display contacts regardless of their contact_status.
4. WHEN the Contacts_List_Page first loads, THE Status_Filter SHALL default to the "All" tab selected.
5. WHEN a Status_Filter tab other than "All" is selected, THE Contacts_List_Page SHALL apply the status filter to the full contact dataset and limit the displayed results to a maximum of 50 contacts.

### Requirement 5: Navigation to Contact Profile

**User Story:** As an agent, I want to click on a contact to view their full profile, so that I can access detailed information and history.

#### Acceptance Criteria

1. WHEN a user clicks on a Contact_Card, THE Contacts_List_Page SHALL navigate the user to the Contact_Profile page at `/contacts/{contact_id}` using client-side navigation without a full page reload.
2. Each Contact_Card SHALL be rendered as a navigable link element (`<a>` tag or equivalent) that is focusable via keyboard and includes an accessible name derived from the contact's full name.
3. WHEN a user hovers over a Contact_Card, THE Contacts_List_Page SHALL display a border highlight consistent with existing list views (border color transition on hover).

### Requirement 6: Combined Search and Filter

**User Story:** As an agent, I want search and status filter to work together, so that I can narrow results precisely (e.g., search for "Tan" among active contacts only).

#### Acceptance Criteria

1. WHEN both a search term and a status filter (other than "All") are active, THE Contacts_List_Page SHALL display only contacts that match both the search term (case-insensitive partial match on full name or phone number) and the selected contact_status value.
2. WHEN the status filter is changed while a search term is present, THE Contacts_List_Page SHALL re-filter results applying both the current search term and the newly selected status.
3. WHEN the search term is changed while a status filter (other than "All") is selected, THE Contacts_List_Page SHALL re-filter results applying both the updated search term and the current status filter.
4. WHEN the Search_Input is cleared while a status filter (other than "All") is selected, THE Contacts_List_Page SHALL display all contacts matching the selected status filter without any search constraint.
5. WHEN the status filter is set to "All" while a search term is present, THE Contacts_List_Page SHALL display all contacts matching the search term regardless of contact_status.

### Requirement 7: Empty and Loading States

**User Story:** As an agent, I want clear feedback when the page is loading or has no data, so that I understand the current state of the interface.

#### Acceptance Criteria

1. WHILE the Contacts_List_Page is loading contact data, THE Contacts_List_Page SHALL display the dashboard-level loading indicator (centered spinner) in place of the contacts list.
2. WHEN the contacts list is empty due to an active search term or status filter, THE Contacts_List_Page SHALL display an empty state message that references the active search term or selected status filter, visually and textually distinct from the "no contacts at all" empty state defined in Requirement 2.
3. IF a database query fails, THEN THE Contacts_List_Page SHALL display the dashboard-level error boundary with an error message indicating that contacts could not be loaded, and SHALL provide a retry action that re-attempts the data fetch.
4. WHEN the contacts list is empty due to filtering or search, THE Contacts_List_Page SHALL continue to display the Search_Input and Status_Filter controls so the user can modify their criteria.
