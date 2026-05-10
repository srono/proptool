# Requirements Document

## Introduction

The Pipeline List View feature adds an alternative table/list display mode to the Pipeline page in PropAgent SG. The pipeline currently uses a Kanban board with drag-and-drop for managing leads across stages. While the board view excels at visualizing workflow, agents managing large volumes of leads need a data-dense list view for quick scanning, sorting, and filtering. This feature introduces a toggleable list view alongside the existing board, following the same pattern established on the Listings page.

## Glossary

- **Pipeline_Page**: The page component at the /pipeline route responsible for displaying all leads organized by pipeline stage
- **Board_View**: The existing Kanban-style display mode showing leads as cards in stage columns with drag-and-drop support
- **List_View**: The tabular display mode showing leads as rows with data columns optimized for scanning and bulk review
- **View_Toggle**: The UI control in the page header that allows the agent to switch between Board_View and List_View
- **Column_Header**: A clickable header cell in the List_View that triggers sorting of leads by that column's data field
- **Sort_Indicator**: A visual arrow icon on a Column_Header indicating the current sort direction (ascending or descending)
- **Filter_Bar**: The UI section containing filter controls for narrowing down displayed leads by stage, urgency, deal type, source, and text search
- **Lead_Row**: A single row in the List_View representing one lead with its associated data fields

## Requirements

### Requirement 1: List View Display

**User Story:** As a property agent, I want a table/list view of my pipeline leads, so that I can scan lead data quickly and compare leads across stages without the spatial constraints of a Kanban board.

#### Acceptance Criteria

1. THE List_View SHALL display leads as rows in a table layout with the following columns: Contact Name, Phone, Deal Type, Urgency, Stage, Source, Intent Score, Last Activity, and Created Date.
2. THE List_View SHALL display the lead urgency as a color-coded badge using the existing urgency color scheme (hot: red, warm: amber, cold: blue).
3. THE List_View SHALL display the pipeline stage as a text label using the stage's display name from PIPELINE_STAGES.
4. THE List_View SHALL display the deal_type as a text label (Sale, Resale, Rental, Landlord Rep, Tenant Rep).
5. THE List_View SHALL display the last_activity_at field as a relative time string where 0 days elapsed displays "Today" and any other value displays "{n}d ago" (e.g., "2d ago", "14d ago"), calculated as the floor of whole days between the current time and the last_activity_at timestamp.
6. THE List_View SHALL display the intent_score as a numeric value (1–5) with color coding (4–5: green, 2–3: amber, 1: red).
7. IF a lead has no contact record, THEN THE List_View SHALL display "Unknown" in the Contact Name column and a dash character ("—") in the Phone column.
8. IF a lead has a null intent_score, THEN THE List_View SHALL display a dash character ("—") in the Intent Score column.
9. IF a lead has a null last_activity_at, THEN THE List_View SHALL display a dash character ("—") in the Last Activity column.
10. THE List_View SHALL display the source field using the display label from LEAD_SOURCES (e.g., "Facebook Ad", "WhatsApp", "Referral") rather than the raw key value.
11. THE List_View SHALL display the created_at field as a locale-formatted date string in DD MMM YYYY format (e.g., "15 Jan 2024").
12. THE List_View SHALL truncate the Contact Name column text with an ellipsis when it exceeds 200px of rendered width.
13. WHEN no leads match the current filters, THE Pipeline_Page SHALL display an empty state with a message indicating no leads match and an option to clear all filters.
14. WHEN no leads exist at all, THE Pipeline_Page SHALL display an empty state with a prompt and a link to create a new lead.

### Requirement 2: View Toggle Between Board and List

**User Story:** As a property agent, I want to switch between the Kanban board and list view, so that I can use the board for drag-and-drop workflow management and the list for data scanning.

#### Acceptance Criteria

1. THE Pipeline_Page SHALL display a View_Toggle control in the page header area, offering two modes: Board_View and List_View, with the currently active mode visually distinguished by a filled or highlighted background style and the inactive mode displayed with a transparent or outline-only style.
2. WHEN the agent clicks the Board_View option in the View_Toggle, THE Pipeline_Page SHALL render the existing PipelineBoard component with drag-and-drop functionality.
3. WHEN the agent clicks the List_View option in the View_Toggle, THE Pipeline_Page SHALL render leads in a tabular layout displaying one row per lead.
4. WHEN the agent toggles between Board_View and List_View, THE Pipeline_Page SHALL preserve the currently active filter selections and display the same filtered set of leads in the new view mode.
5. WHEN the agent toggles from List_View to Board_View, THE Pipeline_Page SHALL reset any active column sort state, since Board_View does not support column sorting.
6. THE Pipeline_Page SHALL persist the agent's selected view mode in browser local storage using the key "pipeline-view-mode" with the value "board" for Board_View or "list" for List_View, so that the preference is retained across page navigations and browser sessions.
7. WHEN no stored preference exists in local storage for the key "pipeline-view-mode", THE Pipeline_Page SHALL default to Board_View.
8. IF the stored view mode preference in local storage contains a value other than "board" or "list", or if reading from local storage throws an error, THEN THE Pipeline_Page SHALL fall back to Board_View and overwrite the stored value with "board".

### Requirement 3: Column Sorting

**User Story:** As a property agent, I want to sort my pipeline leads by different columns, so that I can organize leads by urgency, activity date, or intent score to prioritize my follow-ups.

#### Acceptance Criteria

1. THE List_View SHALL support sorting by the following columns: Contact Name (case-insensitive alphabetical), Deal Type (case-insensitive alphabetical), Urgency (hot > warm > cold), Stage (by pipeline order as defined in PIPELINE_STAGES), Source (case-insensitive alphabetical), Intent Score (numerical), Last Activity (chronological), and Created Date (chronological).
2. WHEN the agent clicks a Column_Header, THE List_View SHALL sort the leads by that column in ascending order and display the Sort_Indicator arrow pointing up on that column.
3. WHEN the agent clicks the same Column_Header a second time, THE List_View SHALL reverse the sort direction to descending order and update the Sort_Indicator arrow to point down.
4. WHEN the agent clicks the same Column_Header a third time, THE List_View SHALL cycle back to ascending order for that column.
5. WHEN the agent clicks a different Column_Header than the currently active sort column, THE List_View SHALL sort by the newly clicked column in ascending order and remove the Sort_Indicator from the previously active column.
6. THE List_View SHALL display a Sort_Indicator arrow only on the currently active sort column, pointing up for ascending and down for descending.
7. WHEN the Pipeline_Page first loads in List_View mode, THE List_View SHALL sort leads by last_activity_at descending as the default sort order with the Sort_Indicator arrow pointing down on the Last Activity column.
8. IF a column contains null values for some leads, THEN THE List_View SHALL place those leads at the end of the sorted list regardless of sort direction.
9. IF two or more leads have equal values in the currently sorted column, THEN THE List_View SHALL use created_at descending as a stable secondary sort to maintain consistent ordering.

### Requirement 4: Filtering

**User Story:** As a property agent, I want to filter my pipeline leads by stage, urgency, deal type, and source, so that I can focus on specific segments of my pipeline.

#### Acceptance Criteria

1. THE Filter_Bar SHALL provide a text search input that filters leads by contact name or phone number as the agent types, with a debounce delay of 300 milliseconds and a minimum input length of 2 characters before filtering is triggered.
2. WHEN the agent enters 2 or more characters in the search input, THE Pipeline_Page SHALL filter the displayed leads to show only those whose contact full_name or phone contains the search text (case-insensitive substring match).
3. WHEN the text search input contains fewer than 2 characters (including empty), THE Pipeline_Page SHALL not apply the text search filter and SHALL display leads as if no text search is active, removing any previously applied text search filter.
4. THE Filter_Bar SHALL provide a stage multi-select dropdown filter allowing the agent to select one or more pipeline stages to filter by.
5. WHEN one or more stages are selected in the stage filter, THE Pipeline_Page SHALL display only leads whose status matches one of the selected stage values.
6. THE Filter_Bar SHALL provide an urgency single-select dropdown filter with options: Hot, Warm, Cold, and a default unselected state representing no urgency filter.
7. WHEN an urgency is selected, THE Pipeline_Page SHALL display only leads whose urgency matches the selected value.
8. THE Filter_Bar SHALL provide a deal type single-select dropdown filter with options: Sale, Resale, Rental, Landlord Rep, Tenant Rep, and a default unselected state representing no deal type filter.
9. WHEN a deal type is selected, THE Pipeline_Page SHALL display only leads whose deal_type matches the selected value.
10. THE Filter_Bar SHALL provide a source single-select dropdown filter with options matching the LEAD_SOURCES constant (Facebook Ad, Instagram Ad, Portal, WhatsApp, Referral, Open House, Web Form, Manual), and a default unselected state representing no source filter.
11. WHEN a source is selected, THE Pipeline_Page SHALL display only leads whose source matches the selected value.
12. WHEN multiple filters are active simultaneously, THE Pipeline_Page SHALL apply all filters using AND logic, displaying only leads that satisfy every active filter condition.
13. THE Filter_Bar SHALL display a count of currently visible leads in the format "Showing {filtered_count} of {total_count} leads", where total_count is the total number of leads in the agent's pipeline before any filters are applied.
14. WHEN the agent clears the text search input or resets a dropdown filter to its default unselected state, THE Pipeline_Page SHALL remove that filter from the active filter set and update the displayed leads within 300 milliseconds.
15. THE Filter_Bar SHALL provide a "Clear all filters" button that resets the text search input to empty and all dropdown filters to their default unselected state in a single action.
16. IF the active combination of filters produces zero matching leads, THEN THE Pipeline_Page SHALL display an empty state message indicating no leads match the current filters, and SHALL display the "Clear all filters" button to allow the agent to reset all filters.
17. WHEN the agent is in Board_View mode, THE Filter_Bar SHALL also filter the leads displayed in the Kanban columns, applying the same AND logic across all active filters.

### Requirement 5: Row Interaction and Navigation

**User Story:** As a property agent, I want to click on a lead row to view its details, so that I can quickly access full lead information from the list.

#### Acceptance Criteria

1. WHEN the agent clicks a Lead_Row in the List_View, THE Pipeline_Page SHALL navigate to the lead detail page at /leads/{id}.
2. THE Lead_Row SHALL render as a navigable element with a pointer cursor and an accessible role so that keyboard and assistive-technology users can activate it.
3. WHILE the agent hovers over a Lead_Row, THE List_View SHALL visually distinguish the hovered row by changing its background color to the brand accent color at reduced opacity, matching the existing card hover pattern.
4. IF a lead has urgency set to "hot" or intent_score of 4 or higher, THEN THE List_View SHALL display a hot indicator on that Lead_Row consisting of an aqua dot (1.5 × 1.5 px rounded circle with glow) and "HOT" label, matching the existing LeadCard hot indicator style.
5. IF a lead has eligibility_risk set to true, THEN THE List_View SHALL display an eligibility risk badge on that Lead_Row using the existing chip style (red text, red border at 40% opacity, red background at 10% opacity) with the label "ELIG WATCH".
6. WHEN the agent activates a Lead_Row using the keyboard (Enter or Space key while the row has focus), THE Pipeline_Page SHALL navigate to the lead detail page at /leads/{id}.
7. IF the lead detail page at /leads/{id} does not exist (lead was deleted or ID is invalid), THEN THE Pipeline_Page SHALL display the application's standard not-found page.

### Requirement 6: Responsive Behavior

**User Story:** As a property agent, I want the list view to adapt to different screen sizes, so that I can use it on both desktop and tablet devices.

#### Acceptance Criteria

1. WHILE the viewport width is 1024px or greater, THE List_View SHALL display all columns (Contact Name, Phone, Deal Type, Urgency, Stage, Source, Intent Score, Last Activity, Created Date).
2. WHILE the viewport width is between 768px and 1023px, THE List_View SHALL display the following columns in order: Contact Name, Deal Type, Urgency, Stage, Last Activity, hiding the Phone, Source, Intent Score, and Created Date columns.
3. WHILE the viewport width is below 768px, THE Pipeline_Page SHALL display the Board_View layout instead of the List_View regardless of the agent's stored view mode preference, without overwriting the stored preference in local storage.
4. WHILE the viewport width is between 768px and 1023px, IF the total column content width exceeds the available viewport width, THEN THE List_View SHALL enable horizontal scrolling to access overflowing columns.
5. WHEN the viewport width crosses a breakpoint boundary (768px or 1024px) due to browser resize or device orientation change, THE Pipeline_Page SHALL update the layout to match the new breakpoint within the same render cycle without requiring a page reload.
6. WHILE the viewport width is below 768px, THE Pipeline_Page SHALL hide the View_Toggle control since only Board_View is available at this breakpoint.
7. WHEN the viewport width increases from below 768px to 768px or above, THE Pipeline_Page SHALL restore the view mode matching the agent's stored preference in local storage and re-display the View_Toggle control.
