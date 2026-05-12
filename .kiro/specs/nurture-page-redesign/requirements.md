# Requirements Document

## Introduction

The Nurture Page Redesign transforms the existing nurture task list into a comprehensive outreach management dashboard for AgentOS. The redesign introduces a stats strip for at-a-glance urgency awareness, pill-tab filtering with colored urgency states, grouped task views (by urgency or playbook), an enriched task row layout with urgency color bars and consent segment chips, a slide-in detail panel with playbook progress timelines, and a floating tweaks panel for display preferences. The visual language follows the AgentOS dark theme design system with onyx backgrounds, brand blue (#2859F7), aqua accent (#8EFEFF), Figtree headings, and Inter body text.

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
- **Tweaks_Panel**: A floating bottom-right panel allowing the agent to adjust display preferences (row density, grouping mode, last activity visibility)
- **Task_Group**: A collapsible section of tasks grouped by either urgency level or playbook name
- **Channel_Icon**: An icon representing the outreach channel (WhatsApp, Call, Email) displayed alongside the action title in a Task_Row

## Requirements

### Requirement 1: Page Header

**User Story:** As a property agent, I want a clear page header with navigation to playbooks and a quick-create button, so that I can orient myself and access playbook management without leaving the nurture view.

#### Acceptance Criteria

1. THE Nurture_Page SHALL display a page title "Nurture" using the Figtree font at 26px bold weight with white color.
2. THE Nurture_Page SHALL display a subtitle "Manage outreach tasks across your active playbooks" in 13px Inter font with gray-2 color below the title.
3. THE Nurture_Page SHALL display a "Playbooks" ghost button (transparent background with border) in the header that navigates to the playbooks management page.
4. THE Nurture_Page SHALL display a "+ New Playbook" primary button with aqua (#8EFEFF) background and dark text in the header that navigates to the new playbook creation page.

### Requirement 2: Stats Strip

**User Story:** As a property agent, I want to see at-a-glance counts of overdue, due today, and upcoming tasks, so that I can quickly assess my workload urgency without scanning the full list.

#### Acceptance Criteria

1. THE Stats_Strip SHALL display three stat tiles in a horizontal row: "Overdue" (red-themed), "Due Today" (amber-themed), and "Upcoming" (gray-themed).
2. THE Stats_Strip SHALL compute the Overdue count as the number of pending tasks with due_at earlier than the start of the current day.
3. THE Stats_Strip SHALL compute the Due Today count as the number of pending tasks with due_at on the current calendar day.
4. THE Stats_Strip SHALL compute the Upcoming count as the number of pending tasks with due_at later than the end of the current day.
5. WHEN the agent clicks an Overdue stat tile, THE Stats_Strip SHALL activate the "Overdue" pill tab filter in the Filter_Bar.
6. WHEN the agent clicks a Due Today stat tile, THE Stats_Strip SHALL activate the "Today" pill tab filter in the Filter_Bar.
7. WHEN the agent clicks an Upcoming stat tile, THE Stats_Strip SHALL activate the "Upcoming" pill tab filter in the Filter_Bar.
8. THE Stats_Strip SHALL update counts in real time when tasks are marked done, snoozed, or when new tasks appear.

### Requirement 3: Filter Bar with Pill Tabs

**User Story:** As a property agent, I want to filter my task list by urgency, playbook, consent status, and ownership, so that I can focus on the most relevant subset of tasks for my current workflow.

#### Acceptance Criteria

1. THE Filter_Bar SHALL display pill-shaped tab buttons for: All, Overdue, Today, Upcoming, and Snoozed.
2. WHEN the "Overdue" pill tab is active, THE Filter_Bar SHALL style the tab with a red background color to indicate urgency.
3. WHEN the "Today" pill tab is active, THE Filter_Bar SHALL style the tab with an amber background color.
4. WHEN the "Upcoming" pill tab is active, THE Filter_Bar SHALL style the tab with a neutral gray background color.
5. WHEN the "Snoozed" pill tab is active, THE Filter_Bar SHALL style the tab with a neutral gray background color.
6. THE Filter_Bar SHALL display a "Playbook" dropdown filter with options: "All Playbooks" (default) and one entry per active playbook in the agent's tenant.
7. THE Filter_Bar SHALL display a "Consent" dropdown filter with options: "All Consent" (default), "Valid" (green), "Partial" (yellow), and "No Consent" (red).
8. THE Filter_Bar SHALL display a "My Tasks" toggle that, when enabled, filters the list to show only tasks assigned to the current authenticated agent.
9. THE Filter_Bar SHALL display a task count label showing the number of tasks matching the current filter combination.
10. WHEN multiple filters are active simultaneously, THE Filter_Bar SHALL apply all filters with AND logic.
11. WHEN the "All" pill tab is selected, THE Filter_Bar SHALL show all pending and snoozed tasks without urgency filtering.

### Requirement 4: Task List Grouping

**User Story:** As a property agent, I want to view my tasks grouped by urgency or by playbook, so that I can choose the organizational view that best matches my workflow for the day.

#### Acceptance Criteria

1. THE Nurture_Page SHALL support two grouping modes: "Urgency" (default) and "Playbook".
2. WHEN grouping by Urgency, THE Nurture_Page SHALL display tasks in collapsible sections: "Overdue", "Due Today", and "Upcoming", each with a section header showing the group name and task count.
3. WHEN grouping by Playbook, THE Nurture_Page SHALL display tasks in collapsible sections named after each playbook, with tasks within each section sorted by due_at ascending.
4. THE Nurture_Page SHALL display the section headers with the group name in bold and the task count in parentheses.
5. WHEN a group section contains zero tasks after filtering, THE Nurture_Page SHALL hide that section entirely.
6. THE Nurture_Page SHALL persist the selected grouping mode in the Tweaks_Panel state.

### Requirement 5: Task Row Layout

**User Story:** As a property agent, I want each task row to show contact info, action details, due date, consent status, and quick actions in a scannable layout, so that I can assess and act on tasks without opening each one individually.

#### Acceptance Criteria

1. THE Task_Row SHALL display an Urgency_Color_Bar on the left edge: red (#EF4444) for overdue tasks, amber (#F59E0B) for due-today tasks, and gray (#6B7280) for upcoming tasks.
2. THE Task_Row SHALL display a contact avatar showing the contact's initials in a circular badge, followed by the contact name, phone number, and property summary.
3. THE Task_Row SHALL display the action details section containing: a Channel_Icon (WhatsApp, Call, or Email icon), the channel label, the action title (step title), and the last activity date.
4. THE Task_Row SHALL display the due date with a colored badge: red background for overdue, amber background for due today, and neutral for upcoming.
5. THE Task_Row SHALL display a Consent_Chip showing the consent status with colored segments: green for valid consent, yellow for partial consent, and red for no consent.
6. THE Task_Row SHALL display action buttons: a primary channel button (WhatsApp or Call icon), a snooze button, and a mark-done button.
7. IF the contact's consent status is red, THEN THE Task_Row SHALL disable the primary channel action button and the mark-done button, displaying them in a muted state.
8. WHEN the agent clicks anywhere on the Task_Row outside of action buttons, THE Nurture_Page SHALL open the Detail_Panel for that contact.
9. THE Task_Row SHALL support two density modes: "Comfortable" (more padding, larger text) and "Compact" (reduced padding, tighter spacing).
10. WHEN the "Show Last Activity" preference is disabled in the Tweaks_Panel, THE Task_Row SHALL hide the last activity date column.

### Requirement 6: Detail Panel

**User Story:** As a property agent, I want a slide-in panel showing full contact context when I click a task row, so that I can review consent, property details, and playbook progress before taking action.

#### Acceptance Criteria

1. WHEN the agent clicks a Task_Row, THE Detail_Panel SHALL slide in from the right edge of the screen with a smooth animation.
2. THE Detail_Panel SHALL display a contact header section with: the contact's avatar (initials in a circular badge), full name, and a Consent_Chip badge.
3. THE Detail_Panel SHALL display a "Quick Actions" section with WhatsApp and Call buttons that execute the respective outreach actions.
4. THE Detail_Panel SHALL display a "Contact Info" section showing the contact's phone number and email address.
5. THE Detail_Panel SHALL display an "Owned Property" section showing: property type, property label, town, flat type, and MOP date.
6. THE Detail_Panel SHALL display a "Consent" section showing: WhatsApp opt-in status, consent given date, consent source, ad purpose, and data retention expiry.
7. THE Detail_Panel SHALL display a "Playbook Progress" section with a vertical timeline showing each step's status: completed (with checkmark and date), pending/current (highlighted), and upcoming (dimmed).
8. THE Detail_Panel SHALL display a "+ Create Ad-Hoc Task" button at the bottom that opens the ad-hoc task creation form.
9. WHEN the agent clicks outside the Detail_Panel or clicks the close button, THE Detail_Panel SHALL slide out to the right and close.
10. IF the contact's consent status is red, THEN THE Detail_Panel SHALL disable the WhatsApp quick action button.

### Requirement 7: Tweaks Panel

**User Story:** As a property agent, I want a floating settings panel to adjust display preferences without navigating away, so that I can customize the task list density and organization to my preference.

#### Acceptance Criteria

1. THE Tweaks_Panel SHALL appear as a floating card in the bottom-right corner of the Nurture_Page.
2. THE Tweaks_Panel SHALL provide a "Row Density" toggle with options: "Comfortable" (default) and "Compact".
3. THE Tweaks_Panel SHALL provide a "Group By" toggle with options: "Urgency" (default) and "Playbook".
4. THE Tweaks_Panel SHALL provide a "Show Last Activity" toggle with options: "On" (default) and "Off".
5. WHEN the agent changes any Tweaks_Panel setting, THE Nurture_Page SHALL immediately re-render the task list with the new preference applied without a page reload.
6. THE Tweaks_Panel SHALL persist preferences in the browser's local storage so they survive page refreshes and session changes.
7. THE Tweaks_Panel SHALL be collapsible to minimize screen real estate usage when not actively being adjusted.

### Requirement 8: Design System Compliance

**User Story:** As a property agent, I want the nurture page to follow the AgentOS dark theme design system consistently, so that the interface feels cohesive and professional across all pages.

#### Acceptance Criteria

1. THE Nurture_Page SHALL use the onyx background color (#0F0F0F) for the page background and onyx-card (#1A1A1A) for card surfaces.
2. THE Nurture_Page SHALL use brand blue (#2859F7) for primary interactive elements and aqua (#8EFEFF) for accent highlights and primary button backgrounds.
3. THE Nurture_Page SHALL use Figtree font for all headings (page title, section headers, panel headings) and Inter font for all body text, labels, and data values.
4. THE Nurture_Page SHALL use 14px border-radius for smaller elements (pills, badges, buttons) and 16px border-radius for cards and panels.
5. THE Nurture_Page SHALL use the onyx-line border color for all card borders and dividers.
6. THE Nurture_Page SHALL use status colors consistently: status-red (#EF4444) for overdue/error states, status-amber (#F59E0B) for warning/today states, and status-green (#22C55E) for success/valid states.
7. THE Nurture_Page SHALL ensure all interactive elements have visible focus indicators for keyboard navigation accessibility.
8. THE Nurture_Page SHALL ensure sufficient color contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text) between text and background colors.

### Requirement 9: Task Data Model Extension

**User Story:** As a property agent, I want the task data to include all fields needed for the redesigned UI (phone, property details, town, segments, playbook steps), so that the page can render the enriched task rows without additional API calls per row.

#### Acceptance Criteria

1. THE Nurture_Page SHALL consume task data containing: id, contact_name, contact_phone, owned_property_label, owned_property_town, owned_property_type, owned_property_flat_type, mop_date, segment_tags, channel, action_title, due_at, last_activity_date, consent_badge (green/yellow/red), playbook_name, and playbook_steps (array of step objects with step_number, title, channel, and status).
2. THE Nurture_Page SHALL derive urgency classification from due_at: "overdue" when due_at is before today, "today" when due_at is the current calendar day, and "upcoming" when due_at is after today.
3. THE Nurture_Page SHALL display the contact_phone in the task row formatted for Singapore phone numbers (e.g., +65 9XXX XXXX).
4. WHEN playbook_steps data is available for a task, THE Detail_Panel SHALL render the Playbook_Progress_Timeline using the steps array with statuses: "done", "pending", and "upcoming".

### Requirement 10: Empty and Loading States

**User Story:** As a property agent, I want clear feedback when the page is loading or when no tasks match my filters, so that I understand the system state and know what action to take.

#### Acceptance Criteria

1. WHILE the Nurture_Page is fetching task data, THE Nurture_Page SHALL display a centered loading spinner with a "Loading tasks…" label.
2. WHEN no nurture tasks exist and no filters are applied, THE Nurture_Page SHALL display an empty state with an icon, a "No nurture tasks yet" heading, explanatory text about creating a playbook, and a "+ Create Playbook" button linking to the playbook creation page.
3. WHEN filters are applied but no tasks match the filter criteria, THE Nurture_Page SHALL display a "No tasks match your filters" message with a suggestion to adjust filter criteria.
4. IF the task fetch fails due to a network or server error, THEN THE Nurture_Page SHALL display an error message with a "Retry" button that re-triggers the data fetch.

### Requirement 11: Task Actions

**User Story:** As a property agent, I want to execute outreach actions (WhatsApp, Call), snooze tasks, and mark tasks done directly from the task list, so that I can manage my nurture workflow efficiently without opening each contact individually.

#### Acceptance Criteria

1. WHEN the agent clicks the WhatsApp action button on a Task_Row, THE Nurture_Page SHALL navigate to the unified message thread with the contact, passing the nurture task ID as context.
2. WHEN the agent clicks the Call action button on a Task_Row, THE Nurture_Page SHALL deep-link to the device dialer with the contact's phone number pre-filled.
3. WHEN the agent clicks the Snooze button on a Task_Row, THE Nurture_Page SHALL display a snooze dialog prompting for a new due date, then update the task status to "snoozed" with the selected date.
4. WHEN the agent clicks the Mark Done button on a Task_Row, THE Nurture_Page SHALL update the task status to "done" and remove the task from the active list.
5. WHEN a task has a yellow consent badge and the agent clicks an action button, THE Nurture_Page SHALL display a consent warning dialog requiring explicit confirmation before proceeding.
6. WHEN a task has a red consent badge, THE Nurture_Page SHALL disable the WhatsApp, Call, and Mark Done action buttons, rendering them in a muted/disabled visual state.
7. WHEN a task action is completed successfully, THE Nurture_Page SHALL update the Stats_Strip counts and task list without requiring a full page reload.
