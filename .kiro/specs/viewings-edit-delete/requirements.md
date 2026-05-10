# Requirements Document

## Introduction

This feature adds the ability to edit and delete viewings from the viewings page (`/viewings`). Currently, users can schedule new viewings but have no way to modify viewing details (date, time, duration, listing) or remove viewings that are no longer needed. This feature enables agents to manage their viewing schedule directly from the viewings list.

## Glossary

- **Viewings_Page**: The page at `/viewings` that displays a list of upcoming viewings with status "scheduled" or "rescheduled"
- **Viewing**: A scheduled property viewing record linking a lead to a listing at a specific date and time
- **Edit_Dialog**: A modal dialog that allows the user to modify viewing details inline without navigating away from the viewings page
- **Delete_Confirmation**: A confirmation dialog shown before permanently removing a viewing record
- **Agent**: The logged-in real estate agent who owns the viewings

## Requirements

### Requirement 1: Edit Viewing

**User Story:** As an agent, I want to edit an existing viewing's details, so that I can update the schedule when plans change without having to delete and recreate the viewing.

#### Acceptance Criteria

1. WHEN the agent clicks the edit action on a viewing card, THE Edit_Dialog SHALL open pre-populated with the viewing's current values (scheduled date, time, duration, and listing)
2. THE Edit_Dialog SHALL allow the agent to modify the scheduled date, time, and duration of the viewing, where duration is selectable in 15-minute increments between 15 minutes and 480 minutes
3. THE Edit_Dialog SHALL allow the agent to change the listing associated with the viewing
4. WHEN the agent submits the Edit_Dialog with all required fields (date, time, duration, and listing) populated and the scheduled date and time set to a future point in time, THE Viewings_Page SHALL update the viewing record in the database and reflect the changes on the viewing card without requiring a full page reload
5. WHEN a viewing is successfully edited with a new date or time, THE Viewings_Page SHALL set the viewing status to "rescheduled"
6. IF the agent submits the Edit_Dialog with any required field (date, time, duration, or listing) missing or with a scheduled date and time in the past, THEN THE Edit_Dialog SHALL display a validation error indicating the issue and prevent submission
7. IF the viewing update fails due to a server error, THEN THE Edit_Dialog SHALL display an error message indicating the failure and retain the agent's entered values so they can retry
8. WHEN the agent clicks cancel in the Edit_Dialog, THE Edit_Dialog SHALL close without saving any changes

### Requirement 2: Delete Viewing

**User Story:** As an agent, I want to delete a viewing, so that I can remove cancelled or mistakenly created viewings from my schedule.

#### Acceptance Criteria

1. WHEN the agent clicks the delete action on a viewing card, THE Delete_Confirmation SHALL appear asking the agent to confirm the deletion
2. THE Delete_Confirmation SHALL display the viewing's lead name, listing address, and scheduled date to help the agent verify the correct viewing
3. WHEN the agent confirms the deletion, THE Viewings_Page SHALL permanently remove the viewing record from the database and close the Delete_Confirmation
4. WHEN a viewing is successfully deleted, THE Viewings_Page SHALL remove the viewing card from the list without requiring a full page reload
5. WHEN the agent cancels the Delete_Confirmation or presses the Escape key, THE Delete_Confirmation SHALL close without deleting the viewing
6. IF the deletion fails due to a server error, THEN THE Viewings_Page SHALL display an error message indicating the deletion was unsuccessful, close the Delete_Confirmation, and retain the viewing in the list

### Requirement 3: Viewing Action Controls

**User Story:** As an agent, I want clearly visible edit and delete actions on each viewing card, so that I can quickly manage my viewings from the list.

#### Acceptance Criteria

1. THE Viewings_Page SHALL display edit and delete action buttons on each viewing card, with each button having a minimum tap target size of 44x44 pixels.
2. THE Viewings_Page SHALL use a pencil icon for the edit button and a trash icon for the delete button on each viewing card.
3. WHILE a viewing update or deletion is in progress, THE Viewings_Page SHALL disable both action buttons on the affected viewing card and show a loading indicator; IF the operation does not complete within 15 seconds, THEN THE Viewings_Page SHALL re-enable the buttons and display an error message indicating the operation timed out.
4. WHEN the agent taps the delete button on a viewing card, THE Viewings_Page SHALL display a confirmation dialog requiring the agent to confirm or cancel the deletion before the delete operation is executed.
5. WHEN a viewing update or deletion completes successfully, THE Viewings_Page SHALL re-enable the action buttons and display a success message indicating the operation completed; IF the operation fails, THEN THE Viewings_Page SHALL re-enable the action buttons and display an error message indicating the operation failed.
6. WHEN the agent taps the edit button on a viewing card, THE Viewings_Page SHALL open the viewing edit form pre-populated with the selected viewing's data.

### Requirement 4: Google Calendar Sync on Edit

**User Story:** As an agent, I want my Google Calendar to stay in sync when I reschedule a viewing, so that my calendar always reflects the latest schedule.

#### Acceptance Criteria

1. WHEN a viewing with a non-null gcal_event_id is edited with changes to date, time, or duration, THE Viewings_Page SHALL update the corresponding Google Calendar event with the new start time, end time, and duration within a timeout of 5 seconds.
2. WHEN a viewing with a non-null gcal_event_id is edited with a change to the associated listing, THE Viewings_Page SHALL update the Google Calendar event summary and location to reflect the new listing address and district.
3. IF the Google Calendar update does not respond within 5 seconds or returns an error, THEN THE Viewings_Page SHALL save the viewing changes locally, display a non-blocking warning message to the agent indicating the calendar could not be updated, and log the failure to the console.
4. IF a viewing without a gcal_event_id is edited and the agent has Google Calendar connected, THEN THE Viewings_Page SHALL not attempt to create or update a Google Calendar event.

### Requirement 5: Google Calendar Sync on Delete

**User Story:** As an agent, I want the Google Calendar event removed when I delete a viewing, so that my calendar stays clean.

#### Acceptance Criteria

1. WHEN a viewing with a stored Google Calendar event ID is deleted, THE Viewings_Page SHALL attempt to delete the corresponding Google Calendar event before removing the viewing record locally
2. WHEN a viewing without a stored Google Calendar event ID is deleted, THE Viewings_Page SHALL proceed with local deletion without attempting any Google Calendar API call
3. IF the Google Calendar event deletion fails or does not respond within 10 seconds, THEN THE Viewings_Page SHALL still delete the viewing locally and display a non-blocking notification to the agent indicating that the calendar event could not be removed
4. WHEN the Google Calendar event and the local viewing record are both successfully deleted, THE Viewings_Page SHALL remove the viewing card from the list without displaying any calendar-related warning
