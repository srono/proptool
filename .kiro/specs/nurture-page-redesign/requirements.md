# Requirements Document

## Introduction

The Nurture Page Redesign transforms the existing nurture task list into a comprehensive outreach management dashboard for AgentOS. The redesign introduces a stats strip for at-a-glance urgency awareness, pill-tab filtering with colored urgency states, grouped task views (by urgency or playbook), an enriched task row layout with urgency color bars and consent segment chips, and a slide-in detail panel with playbook progress timelines. The visual language follows the AgentOS dark theme design system with onyx backgrounds, brand blue (#2859F7), aqua accent (#8EFEFF), Figtree headings, and Inter body text.

## Glossary

- **Nurture_Page**: The main page component responsible for rendering the redesigned nurture outreach dashboard within AgentOS
- **Stats_Strip**: A horizontal row of clickable stat tiles displaying task counts grouped by urgency (Overdue, Due Today, Upcoming)
- **Filter_Bar**: The horizontal control bar containing pill tabs, dropdown filters, the My Tasks toggle, and a task count label
- **Pill_Tab**: A rounded tab button within the Filter_Bar used to filter tasks by urgency category (All, Overdue, Today, Upcoming, Snoozed)
- **Task_Row**: A single row in the task list representing one nurture task, displaying contact info, action details, due date, consent status, and action buttons
- **Urgency_Color_Bar**: A vertical colored indicator on the left edge of a Task_Row denoting urgency (red for overdue, amber for due today, gray for upcoming)
- **Consent_Chip**: A visual badge on a Task_Row showing the contact's consent status with colored segments (green for valid, yellow for partial, red for no consent)
- **Detail_Panel**: A slide-in panel from the right side of the screen showing full contact context, quick actions, property info, consent details, and playbook progress
- **Playbook_Progress_Timeline**: A vertical timeline within the Detail_Panel showing completed, pending, and upcoming steps for a contact's playbook enrollment
- **Task_Group**: A collapsible section of tasks grouped by either urgency level or playbook name
- **Channel_Icon**: An icon representing the outreach channel (WhatsApp, Call, Email) displayed alongside the action title in a Task_Row

## Requirements

### Requirement 1: Page Header

**User Story:** As a property agent, I want a clear page header with navigation to playbooks and a quick-create button, so that I can orient myself and access playbook management without leaving the nurture view.

#### Acceptance Criteria

1. THE Nurture_Page SHALL display a page title "Nurture" using the Figtree font at 26px bold weight with white color, left-aligned within the header area.
2. THE Nurture_Page SHALL display a subtitle "Manage outreach tasks across your active playbooks" in 13px Inter font with gray-2 color directly below the title with no other elements between them.
3. THE Nurture_Page SHALL display a "Playbooks" ghost button (transparent background with 1px border) and a "+ New Playbook" primary button with aqua (#8EFEFF) background and onyx (#0F0F0F) text, right-aligned in the header on the same horizontal row as the title.
4. WHEN the agent clicks the "Playbooks" ghost button, THE Nurture_Page SHALL navigate to the playbooks management page.
5. WHEN the agent clicks the "+ New Playbook" primary button, THE Nurture_Page SHALL navigate to the new playbook creation page.

### Requirement 2: Stats Strip

**User Story:** As a property agent, I want to see at-a-glance counts of overdue, due today, and upcoming tasks, so that I can quickly assess my workload urgency without scanning the full list.

#### Acceptance Criteria

1. THE Stats_Strip SHALL display three stat tiles in a horizontal row: "Overdue" (red-themed), "Due Today" (amber-themed), and "Upcoming" (gray-themed), each showing the category label and its numeric count.
2. THE Stats_Strip SHALL compute the Overdue count as the number of pending tasks (tasks not marked as "done" or "snoozed") with due_at earlier than the start of the current calendar day in the agent's local browser timezone.
3. THE Stats_Strip SHALL compute the Due Today count as the number of pending tasks (tasks not marked as "done" or "snoozed") with due_at on the current calendar day in the agent's local browser timezone.
4. THE Stats_Strip SHALL compute the Upcoming count as the number of pending tasks (tasks not marked as "done" or "snoozed") with due_at later than the end of the current calendar day in the agent's local browser timezone.
5. WHEN the agent clicks an Overdue stat tile, THE Stats_Strip SHALL activate the "Overdue" pill tab filter in the Filter_Bar.
6. WHEN the agent clicks a Due Today stat tile, THE Stats_Strip SHALL activate the "Today" pill tab filter in the Filter_Bar.
7. WHEN the agent clicks an Upcoming stat tile, THE Stats_Strip SHALL activate the "Upcoming" pill tab filter in the Filter_Bar.
8. WHEN the agent clicks a stat tile that is already active, THE Stats_Strip SHALL deactivate the filter and revert the Filter_Bar to the "All" pill tab.
9. WHEN a task is marked done, snoozed, or a new task appears, THE Stats_Strip SHALL update the affected tile counts within 1 second without requiring a page reload.
10. IF a tile count exceeds 999, THEN THE Stats_Strip SHALL display the count abbreviated as "999+".

### Requirement 3: Filter Bar with Pill Tabs

**User Story:** As a property agent, I want to filter my task list by urgency, playbook, consent status, and ownership, so that I can focus on the most relevant subset of tasks for my current workflow.

#### Acceptance Criteria

1. THE Filter_Bar SHALL display pill-shaped tab buttons in the following order: All (selected by default), Overdue, Today, Upcoming, and Snoozed, with only one pill tab active at a time.
2. WHEN the "Overdue" pill tab is active, THE Filter_Bar SHALL style the tab with a status-red background color and display only tasks with due_at before the start of the current day.
3. WHEN the "Today" pill tab is active, THE Filter_Bar SHALL style the tab with a status-amber background color and display only tasks with due_at on the current calendar day.
4. WHEN the "Upcoming" pill tab is active, THE Filter_Bar SHALL style the tab with a neutral gray background color and display only tasks with due_at after the end of the current day.
5. WHEN the "Snoozed" pill tab is active, THE Filter_Bar SHALL style the tab with a neutral gray background color and display only tasks with a status of "snoozed", regardless of due_at.
6. THE Filter_Bar SHALL display a "Playbook" dropdown filter with options: "All Playbooks" (selected by default) and one entry per active playbook in the agent's tenant.
7. THE Filter_Bar SHALL display a "Consent" dropdown filter with options: "All Consent" (selected by default), "Valid" (green), "Partial" (yellow), and "No Consent" (red).
8. THE Filter_Bar SHALL display a "My Tasks" toggle, disabled by default, that when enabled filters the task list to show only tasks assigned to the current authenticated agent.
9. THE Filter_Bar SHALL display a task count label in the format "{count} tasks" showing the number of tasks matching the current filter combination, updated within 300ms of any filter change.
10. WHEN multiple filters are active simultaneously, THE Filter_Bar SHALL apply all filters with AND logic, combining the active pill tab filter, the Playbook dropdown selection, the Consent dropdown selection, and the My Tasks toggle state.
11. WHEN the "All" pill tab is selected, THE Filter_Bar SHALL show all pending and snoozed tasks without urgency filtering.
12. THE Filter_Bar SHALL style inactive pill tabs with a transparent background and onyx-line border to visually distinguish them from the active pill tab.

### Requirement 4: Task List Grouping

**User Story:** As a property agent, I want to view my tasks grouped by urgency or by playbook, so that I can choose the organizational view that best matches my workflow for the day.

#### Acceptance Criteria

1. THE Nurture_Page SHALL support two grouping modes: "Urgency" (default) and "Playbook".
2. WHILE grouping by Urgency is active, THE Nurture_Page SHALL display tasks in collapsible sections: "Overdue", "Due Today", and "Upcoming", each with a section header showing the group name and task count, with tasks within each section sorted by due_at ascending.
3. WHILE grouping by Playbook is active, THE Nurture_Page SHALL display tasks in collapsible sections named after each playbook sorted alphabetically, with tasks within each section sorted by due_at ascending.
4. THE Nurture_Page SHALL display the section headers with the group name in bold and the task count in parentheses.
5. WHEN a group section contains zero tasks after filtering, THE Nurture_Page SHALL hide that section entirely.
6. THE Nurture_Page SHALL persist the selected grouping mode in the Tweaks_Panel state.
7. THE Nurture_Page SHALL render all group sections in expanded state by default, allowing the agent to collapse or expand each section individually by clicking the section header.
8. WHILE grouping by Urgency is active, IF a task has a "snoozed" status, THEN THE Nurture_Page SHALL exclude that task from the Overdue, Due Today, and Upcoming sections and display it only when the "Snoozed" pill tab filter is active.
9. WITHIN each urgency or playbook group section, THE Nurture_Page SHALL subgroup tasks by contact, displaying the contact info (avatar, name, phone, property) once as a contact header row, with individual task actions listed as compact sub-rows beneath it.
10. WHEN a contact has multiple tasks within the same group section, THE Nurture_Page SHALL display the contact header row with a task count badge, and the sub-rows SHALL each show the action title, channel icon, due date badge, and action buttons (primary channel, snooze, mark done).
11. WHEN a contact has only one task within a group section, THE Nurture_Page SHALL display it as a single combined row (contact info + task details in one row) without a sub-row expansion.

### Requirement 5: Task Row Layout

**User Story:** As a property agent, I want each task row to show contact info, action details, due date, consent status, and quick actions in a scannable layout, so that I can assess and act on tasks without opening each one individually.

#### Acceptance Criteria

1. THE Task_Row SHALL display an Urgency_Color_Bar as a 4px-wide vertical strip on the left edge: red (#EF4444) for overdue tasks, amber (#F59E0B) for due-today tasks, and gray (#6B7280) for upcoming tasks.
2. THE Task_Row SHALL display a contact avatar showing the contact's first and last name initials (maximum 2 characters) in a 32px circular badge, followed by the contact name, phone number, and a property summary composed of the owned_property_type and owned_property_town (e.g., "Condo · Tampines").
3. THE Task_Row SHALL display the action details section containing: a Channel_Icon (WhatsApp, Call, or Email icon), the channel label, the action title (step title), and the last activity date displayed as a relative time label (e.g., "2d ago", "5h ago") for dates within the past 7 days, or as a short date (e.g., "12 Jan") for older dates.
4. THE Task_Row SHALL display the due date with a colored badge: red (#EF4444) background for overdue, amber (#F59E0B) background for due today, and gray (#6B7280) background for upcoming, formatted as a short date (e.g., "12 Jan") or "Today" when due on the current calendar day.
5. THE Task_Row SHALL display a Consent_Chip showing the consent status with colored segments: green (#22C55E) for valid consent, yellow (#F59E0B) for partial consent, and red (#EF4444) for no consent.
6. THE Task_Row SHALL display action buttons: a primary channel button (WhatsApp or Call icon), a snooze button, and a mark-done button.
7. IF the contact's consent status is red, THEN THE Task_Row SHALL disable the primary channel action button and the mark-done button, rendering them at 40% opacity with a not-allowed cursor and ignoring click events.
8. WHEN the agent clicks anywhere on the Task_Row outside of action buttons, THE Nurture_Page SHALL open the Detail_Panel for that contact.
9. IF the contact name, property summary, or action title text exceeds the available column width, THEN THE Task_Row SHALL truncate the text with an ellipsis and display the full text in a tooltip on hover.

### Requirement 6: Detail Panel

**User Story:** As a property agent, I want a slide-in panel showing full contact context when I click a task row, so that I can review consent, property details, and playbook progress before taking action.

#### Acceptance Criteria

1. WHEN the agent clicks a Task_Row, THE Detail_Panel SHALL slide in from the right edge of the screen with a transition duration of 300ms.
2. THE Detail_Panel SHALL display a contact header section with: the contact's avatar (initials in a circular badge), full name, and a Consent_Chip badge.
3. THE Detail_Panel SHALL display a "Quick Actions" section with a WhatsApp button that navigates to the unified message thread with the contact, and a Call button that deep-links to the device dialer with the contact's phone number pre-filled.
4. THE Detail_Panel SHALL display a "Contact Info" section showing the contact's phone number and email address.
5. THE Detail_Panel SHALL display an "Owned Property" section showing: property type, property label, town, flat type, and MOP date.
6. THE Detail_Panel SHALL display a "Consent" section showing: WhatsApp opt-in status, consent given date, consent source, ad purpose, and data retention expiry.
7. THE Detail_Panel SHALL display a "Playbook Progress" section with a vertical timeline showing each step's status: completed (with checkmark and completion date), pending/current (highlighted with brand blue), and upcoming (dimmed at reduced opacity).
8. THE Detail_Panel SHALL display a "+ Create Ad-Hoc Task" button at the bottom that opens the ad-hoc task creation form.
9. WHEN the agent clicks outside the Detail_Panel or clicks the close button, THE Detail_Panel SHALL slide out to the right with a transition duration of 300ms and close.
10. IF the contact's consent status is red, THEN THE Detail_Panel SHALL disable both the WhatsApp and Call quick action buttons, rendering them in a muted/disabled visual state.
11. IF the contact has no owned property data, THEN THE Detail_Panel SHALL hide the "Owned Property" section.
12. IF the contact has no playbook enrollment, THEN THE Detail_Panel SHALL hide the "Playbook Progress" section and display a message indicating no active playbook.
13. IF the contact has no email address on record, THEN THE Detail_Panel SHALL display a placeholder dash character in the email field within the "Contact Info" section.

### Requirement 7: Design System Compliance

**User Story:** As a property agent, I want the nurture page to follow the AgentOS dark theme design system consistently, so that the interface feels cohesive and professional across all pages.

#### Acceptance Criteria

1. THE Nurture_Page SHALL use the onyx background color (#0F0F0F) for the page background and onyx-card (#1A1A1A) for card surfaces.
2. THE Nurture_Page SHALL use brand blue (#2859F7) for primary interactive elements and aqua (#8EFEFF) for accent highlights and primary button backgrounds.
3. THE Nurture_Page SHALL use Figtree font for all headings (page title, section headers, panel headings) and Inter font for all body text, labels, and data values.
4. THE Nurture_Page SHALL use 14px border-radius for smaller elements (pills, badges, buttons) and 16px border-radius for cards and panels.
5. THE Nurture_Page SHALL use the onyx-line border color (#2A2A2A) for all card borders and dividers.
6. THE Nurture_Page SHALL use status colors consistently: status-red (#EF4444) for overdue/error states, status-amber (#F59E0B) for warning/today states, and status-green (#22C55E) for success/valid states.
7. THE Nurture_Page SHALL ensure all interactive elements have a visible focus indicator rendered as a 2px solid outline in brand blue (#2859F7) with a 2px offset from the element edge, displayed on keyboard focus (focus-visible) only.
8. THE Nurture_Page SHALL ensure sufficient color contrast ratios (minimum 4.5:1 for text below 18px regular or 14px bold, minimum 3:1 for text at or above 18px regular or 14px bold) between text and background colors.
9. WHEN the agent hovers over an interactive element, THE Nurture_Page SHALL display a hover state by transitioning the element's background opacity or background color within 150ms to provide visual feedback distinct from the default and active states.

### Requirement 8: Task Data Model Extension

**User Story:** As a property agent, I want the task data to include all fields needed for the redesigned UI (phone, property details, town, segments, playbook steps), so that the page can render the enriched task rows without additional API calls per row.

#### Acceptance Criteria

1. THE Nurture_Page SHALL consume task data containing: id, contact_name, contact_phone, owned_property_label, owned_property_town, owned_property_type, owned_property_flat_type, mop_date, segment_tags (array of up to 10 string labels), channel, action_title, due_at, last_activity_date, consent_badge (one of "green", "yellow", or "red"), playbook_name, and playbook_steps (array of up to 20 step objects each containing step_number, title, channel, and status).
2. THE Nurture_Page SHALL derive urgency classification from due_at using the agent's local calendar day (Asia/Singapore timezone): "overdue" when due_at is before the start of the current calendar day, "today" when due_at falls within the current calendar day, and "upcoming" when due_at is on or after the start of the next calendar day.
3. THE Nurture_Page SHALL display the contact_phone in the task row formatted for Singapore phone numbers as "+65 XXXX XXXX" (country code, space, four digits, space, four digits).
4. IF contact_phone is null or not a valid 8-digit Singapore mobile/landline number, THEN THE Task_Row SHALL display a dash character ("–") in place of the phone number.
5. WHEN playbook_steps is a non-empty array for a task, THE Detail_Panel SHALL render the Playbook_Progress_Timeline using the steps array sorted by step_number ascending, with each step displaying one of the statuses: "done", "pending", or "upcoming".
6. IF playbook_steps is null or an empty array for a task, THEN THE Detail_Panel SHALL hide the Playbook Progress section and display no timeline.

### Requirement 9: Empty and Loading States

**User Story:** As a property agent, I want clear feedback when the page is loading or when no tasks match my filters, so that I understand the system state and know what action to take.

#### Acceptance Criteria

1. WHILE the Nurture_Page is fetching task data, THE Nurture_Page SHALL display a centered loading spinner with a "Loading tasks…" label, replacing the task list area content.
2. WHEN no nurture tasks exist and no filters are applied, THE Nurture_Page SHALL display an empty state with an icon, a "No nurture tasks yet" heading, a descriptive subtitle indicating that tasks will appear once a playbook is created and contacts are enrolled, and a "+ Create Playbook" button linking to the playbook creation page.
3. WHEN filters are applied but no tasks match the filter criteria, THE Nurture_Page SHALL display a "No tasks match your filters" message, a suggestion to adjust filter criteria, and a "Clear Filters" button that resets all Filter_Bar selections to their default values.
4. IF the task fetch fails due to a network or server error, THEN THE Nurture_Page SHALL display an error message indicating that tasks could not be loaded, along with a "Retry" button that re-triggers the data fetch and returns the page to the loading state while the new fetch is in progress.
5. IF the agent clicks the "Retry" button and the task fetch fails 3 consecutive times, THEN THE Nurture_Page SHALL display an error message indicating a persistent connection issue and suggesting the agent try again later, with the "Retry" button remaining available.

### Requirement 10: Sidebar Redesign

**User Story:** As a property agent, I want a well-organized sidebar with grouped navigation sections and icons, so that I can quickly find and navigate to different areas of the application.

#### Acceptance Criteria

1. THE Sidebar SHALL display navigation items organized into four labeled groups: "Daily" (Dashboard, Lead Inbox, Messages, Nurture), "Clients" (Pipeline, Contacts, Deals), "Properties" (Listings, Viewings), and "Tools" (Insights).
2. THE Sidebar SHALL display each group with an uppercase section label in 10px font weight 700, letter-spacing 0.09em, colored gray-1 (#454545).
3. THE Sidebar SHALL display each navigation item with a 15px SVG stroke icon to the left of the label, with icons at 45% opacity by default, 75% on hover, and 100% with aqua color when active.
4. THE Sidebar SHALL use 10px border-radius for navigation items instead of pill-shaped (999px) border-radius.
5. THE Sidebar SHALL display the active navigation item with a brand-blue tinted background (rgba(40,89,247,.14)), a brand-blue border (rgba(40,89,247,.38)), and white text.
6. THE Sidebar SHALL display badge counts (e.g., "3" for Lead Inbox, "5" for Messages) right-aligned within the navigation item, styled with onyx-raised background and gray-2 text by default, switching to aqua-tinted background and aqua text when the item is active.
7. THE Sidebar SHALL separate navigation groups with a 1px border-top in onyx-line color (#2A2A2A) with 2px margin-top and 8px padding-top between groups.
8. THE Sidebar SHALL display a footer section with the user avatar, name, CEA number, and a settings gear icon button that navigates to the settings page.
9. THE Sidebar settings gear button SHALL be styled as a 15px SVG icon with gray-2 color, 5px padding, 8px border-radius, transitioning to white color with onyx-card background on hover.
10. THE Sidebar SHALL maintain a fixed width of 232px with onyx background and a 1px right border in onyx-line color.

### Requirement 11: Task Actions

**User Story:** As a property agent, I want to execute outreach actions (WhatsApp, Call), snooze tasks, and mark tasks done directly from the task list, so that I can manage my nurture workflow efficiently without opening each contact individually.

#### Acceptance Criteria

1. WHEN the agent clicks the WhatsApp action button on a Task_Row, THE Nurture_Page SHALL navigate to the unified message thread with the contact, passing the nurture task ID as context.
2. WHEN the agent clicks the Call action button on a Task_Row, THE Nurture_Page SHALL deep-link to the device dialer with the contact's phone number pre-filled.
3. WHEN the agent clicks the Snooze button on a Task_Row, THE Nurture_Page SHALL display a snooze dialog prompting for a new due date selectable from tomorrow up to 90 days in the future, then update the task status to "snoozed" with the selected date; IF the agent dismisses or cancels the snooze dialog, THEN THE Nurture_Page SHALL close the dialog and leave the task status unchanged.
4. WHEN the agent clicks the Mark Done button on a Task_Row, THE Nurture_Page SHALL update the task status to "done" and remove the task from the active list with a brief fade-out transition.
5. IF a task has a yellow consent badge, THEN WHEN the agent clicks the WhatsApp, Call, or Mark Done action button, THE Nurture_Page SHALL display a consent warning dialog requiring the agent to confirm or cancel before proceeding with the action.
6. IF a task has a red consent badge, THEN THE Nurture_Page SHALL disable the WhatsApp, Call, and Mark Done action buttons, rendering them in a muted/disabled visual state and preventing interaction.
7. WHEN a task action is completed successfully (task status updated to "done" or "snoozed", or navigation to message thread or dialer initiated), THE Nurture_Page SHALL update the Stats_Strip counts and task list without requiring a full page reload.
8. IF a task status update (mark done or snooze) fails due to a network or server error, THEN THE Nurture_Page SHALL display an inline error message on the affected Task_Row indicating the action could not be completed and leave the task in its previous state.
