# Requirements Document

## Introduction

The Lead Add Note feature enables property agents to add free-text notes to a lead directly from the lead detail page. Notes are stored as records in the existing messages table with channel set to "note" and appear in the lead's timeline alongside WhatsApp messages and other communications. This provides agents with a quick way to record call summaries, meeting outcomes, client preferences, and other observations without leaving the lead context.

## Glossary

- **Lead_Detail_Page**: The page component at /leads/{id} that displays all information about a specific lead including contact details, timeline, and action buttons
- **Note_Dialog**: A modal dialog that appears over the Lead_Detail_Page allowing the agent to compose and save a note
- **Note_Input**: The multi-line text input field within the Note_Dialog where the agent types the note content
- **Timeline**: The chronological feed on the Lead_Detail_Page that displays messages, notes, and other activity items
- **Note_Entry**: A single note record stored in the messages table with channel set to "note" and direction set to "outbound"
- **Add_Note_Button**: The button in the action buttons area of the Lead_Detail_Page that opens the Note_Dialog
- **Save_Button**: The button within the Note_Dialog that submits the note for persistence

## Requirements

### Requirement 1: Open Note Dialog

**User Story:** As a property agent, I want to click "Add note" on the lead detail page, so that I can quickly record observations about a lead without navigating away.

#### Acceptance Criteria

1. WHEN the agent clicks the Add_Note_Button on the Lead_Detail_Page, THE Note_Dialog SHALL open as a modal overlay centered on the viewport with a backdrop of black at 50% opacity.
2. WHEN the Note_Dialog opens, THE Note_Dialog SHALL trap keyboard focus so that pressing Tab or Shift+Tab cycles only through focusable elements within the dialog, and THE Note_Input SHALL receive keyboard focus automatically.
3. WHEN the agent presses the Escape key while the Note_Dialog is open, THE Note_Dialog SHALL close without saving any content and return keyboard focus to the Add_Note_Button.
4. WHEN the agent clicks the backdrop area outside the Note_Dialog, THE Note_Dialog SHALL close without saving any content and return keyboard focus to the Add_Note_Button.
5. THE Note_Dialog SHALL include a visible close button (X icon) in the top-right corner that closes the dialog without saving.
6. THE Note_Dialog SHALL display the heading "Add Note" to indicate its purpose.
7. THE Note_Dialog SHALL be accessible with ARIA attributes including role="dialog", aria-modal="true", and an aria-labelledby reference to the dialog heading.

### Requirement 2: Compose Note Content

**User Story:** As a property agent, I want a text area to write my note, so that I can capture detailed observations including multi-line content.

#### Acceptance Criteria

1. THE Note_Input SHALL render as a multi-line text area with a minimum visible height of 4 text lines and user-resizable vertically.
2. WHILE the Note_Input is empty, THE Note_Input SHALL display placeholder text "Write a note..." and THE Note_Dialog SHALL hide the character count indicator.
3. THE Note_Input SHALL allow the agent to enter up to 2000 characters of text, counted as Unicode characters (code points).
4. WHEN the agent types or pastes text that would cause the total content to exceed 2000 characters, THE Note_Input SHALL truncate the input at the 2000-character boundary, retaining only the first 2000 characters, and display the character count indicator showing "2000/2000".
5. WHILE the Note_Input contains one or more characters, THE Note_Dialog SHALL display a character count indicator in the format "{current}/{max}" (e.g., "145/2000") positioned below the text area, updating on each input event.
6. THE Note_Input SHALL preserve all line breaks, spaces, and indentation as entered by the agent during both input display and upon submission.

### Requirement 3: Save Note

**User Story:** As a property agent, I want to save my note so that it is permanently recorded against the lead and visible in the timeline.

#### Acceptance Criteria

1. WHEN the agent clicks the Save_Button and the Note_Input contains at least one non-whitespace character, THE Lead_Detail_Page SHALL insert a new record into the messages table with channel set to "note", direction set to "outbound", the body set to the Note_Input content (trimmed of leading/trailing whitespace), the lead_id set to the current lead's ID, the contact_id set to the lead's associated contact ID, and sent_at set to the current timestamp.
2. WHEN the note is saved successfully, THE Note_Dialog SHALL close and THE Timeline SHALL display the new Note_Entry at the top of the feed without requiring a full page reload.
3. WHILE the note is being saved, THE Save_Button SHALL display a loading state with the text "Saving..." and SHALL be disabled to prevent duplicate submissions.
4. WHILE the note is being saved, THE Note_Input SHALL be disabled to prevent content modification during the save operation.
5. IF the Note_Input is empty or contains only whitespace characters, THEN THE Save_Button SHALL be disabled and visually indicate that it is not actionable.
6. IF the save operation fails due to a network error or server error, THEN THE Note_Dialog SHALL remain open, re-enable the Save_Button and Note_Input, and display an error message "Failed to save note. Please try again." within the dialog.
7. WHEN the note is saved successfully, THE Lead_Detail_Page SHALL update the lead's last_activity_at timestamp to reflect the note creation time.
8. IF the save operation does not complete within 15 seconds, THEN THE Note_Dialog SHALL treat the operation as failed, re-enable the Save_Button and Note_Input, and display an error message indicating a timeout occurred.

### Requirement 4: Display Notes in Timeline

**User Story:** As a property agent, I want to see my notes in the lead timeline, so that I can review past observations in chronological context alongside messages.

#### Acceptance Criteria

1. THE Timeline SHALL display Note_Entry items with the type indicator label "NOTE" and no direction indicator, differentiating them from WhatsApp messages and other channel types.
2. THE Timeline SHALL display the Note_Entry body text preserving line breaks and whitespace as originally entered.
3. THE Timeline SHALL display the Note_Entry timestamp in the same format as other timeline items (day, abbreviated month, hour, and minute in en-SG locale).
4. THE Timeline SHALL sort Note_Entry items chronologically alongside all other timeline items, with the most recent items appearing first.
5. WHEN a new note is saved, THE Timeline SHALL prepend the new Note_Entry to the top of the feed immediately without requiring a page refresh.

### Requirement 5: Note Input Validation

**User Story:** As a property agent, I want clear feedback when my note content is invalid, so that I do not accidentally save empty notes.

#### Acceptance Criteria

1. WHILE the Note_Input is empty or contains only whitespace, THE Save_Button SHALL remain disabled with reduced opacity (0.5) to indicate it is not actionable.
2. WHEN the Note_Input content changes from empty or whitespace-only to containing at least one non-whitespace character, THE Save_Button SHALL become enabled with full opacity.
3. WHEN the agent types or pastes content that would cause the Note_Input to exceed 2000 characters, THE Note_Input SHALL prevent the input from exceeding 2000 characters by truncating the excess and display the character count as "2000/2000".
4. THE Note_Input SHALL trim leading and trailing whitespace from the content before saving, while preserving internal whitespace and line breaks.
