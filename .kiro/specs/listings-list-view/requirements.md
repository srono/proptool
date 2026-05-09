# Requirements Document

## Introduction

The Listings List View feature enhances the Listings page in PropAgent SG by introducing a data-dense table/list view as the default display mode. Since PropAgent SG is an internal tool for property agents, day-to-day workflow prioritizes scanning data quickly over viewing photos. The list view provides sortable columns, inline status indicators, and improved filtering, while preserving the existing card grid as a secondary toggle option.

## Glossary

- **Listings_Page**: The page component responsible for displaying all listings belonging to the authenticated agent, located at the /listings route
- **List_View**: The default tabular display mode showing listings as rows with data columns optimized for scanning and comparison
- **Card_View**: The secondary display mode showing listings as photo-centric cards in a responsive grid (the current default behavior)
- **View_Toggle**: The UI control that allows the agent to switch between List_View and Card_View display modes
- **Column_Header**: A clickable header cell in the List_View that triggers sorting of the listings by that column's data field
- **Filter_Bar**: The UI section containing filter controls (status tabs, search, and column-specific filters) for narrowing down displayed listings
- **Sort_Indicator**: A visual arrow icon on a Column_Header indicating the current sort direction (ascending or descending)

## Requirements

### Requirement 1: Default List View Display

**User Story:** As a property agent, I want the listings page to default to a table/list view, so that I can scan my inventory quickly without large photo thumbnails taking up space.

#### Acceptance Criteria

1. WHEN the agent navigates to the Listings_Page, THE Listings_Page SHALL render the List_View as the default display mode.
2. THE List_View SHALL display listings as rows in a table layout with the following columns: Address, District, Property Type, Tenure, Floor Area (sqft), Listing Type (Sale/Rental), Status, Price, and PSF, ordered by creation date descending.
3. THE List_View SHALL display the listing_status as a color-coded badge within the Status column, using the existing status color scheme (draft: neutral, live: green, under_offer: amber, sold: aqua, rented: aqua, withdrawn: red).
4. THE List_View SHALL display the listing_type as a text label or subtle badge distinguishing "Sale" from "Rental" entries.
5. WHEN a listing has listing_type "rental", THE List_View SHALL display the asking_rental value formatted with the "S$" currency prefix and a "/mo" suffix in the Price column, and SHALL display the PSF column as empty.
6. WHEN a listing has listing_type "sale", THE List_View SHALL display the asking_price formatted with the "S$" currency prefix in the Price column and the computed PSF value formatted as "S$[value] psf" in the PSF column.
7. THE List_View SHALL truncate the address column text with an ellipsis when it exceeds the available column width, ensuring the full address is not wrapped to multiple lines.
8. WHEN no listings match the current filters, THE Listings_Page SHALL display an empty state with a prompt and a link to create a new listing.
9. IF a listing has no asking_price or asking_rental value, THEN THE List_View SHALL display a dash character ("—") in the Price column.

### Requirement 2: View Toggle Between List and Card

**User Story:** As a property agent, I want to switch between list view and card view, so that I can use the photo grid when I need a visual overview of my properties.

#### Acceptance Criteria

1. THE Listings_Page SHALL display a View_Toggle control in the page header area, offering two modes: List_View and Card_View, with the currently active mode visually distinguished from the inactive mode.
2. WHEN the agent clicks the Card_View option in the View_Toggle, THE Listings_Page SHALL render listings using the existing card grid layout with photo thumbnails.
3. WHEN the agent clicks the List_View option in the View_Toggle, THE Listings_Page SHALL render listings in a tabular layout displaying one row per listing with the following columns: address, district, property_type, listing_status badge, listing_type badge, price (with "/mo" suffix for rentals), and PSF (for sale listings).
4. WHEN the agent toggles between List_View and Card_View, THE Listings_Page SHALL preserve the currently active filter tab selection and display the same filtered set of listings in the new view mode.
5. THE Listings_Page SHALL persist the agent's selected view mode in browser local storage so that the preference is retained across page navigations and browser sessions.
6. WHEN no stored preference exists in local storage, THE Listings_Page SHALL default to List_View.
7. IF the stored view mode preference in local storage is unreadable or contains an invalid value, THEN THE Listings_Page SHALL fall back to List_View and overwrite the corrupted value with the default.

### Requirement 3: Column Sorting

**User Story:** As a property agent, I want to sort my listings by different columns, so that I can organize my inventory by price, area, district, or date to find what I need.

#### Acceptance Criteria

1. THE List_View SHALL support sorting by the following columns: Address (alphabetical), District (alphabetical by district code), Property Type (alphabetical), Price (numerical), PSF (numerical), Floor Area (numerical), and Status (alphabetical).
2. WHEN the agent clicks a Column_Header, THE List_View SHALL sort the listings by that column in ascending order and display the Sort_Indicator arrow pointing up on that column.
3. WHEN the agent clicks the same Column_Header a second time, THE List_View SHALL reverse the sort direction to descending order and update the Sort_Indicator arrow to point down.
4. WHEN the agent clicks the same Column_Header a third time, THE List_View SHALL cycle back to ascending order for that column.
5. WHEN the agent clicks a different Column_Header than the currently active sort column, THE List_View SHALL sort by the newly clicked column in ascending order and remove the Sort_Indicator from the previously active column.
6. THE List_View SHALL display a Sort_Indicator arrow only on the currently active sort column, pointing up for ascending and down for descending.
7. WHEN the Listings_Page first loads, THE List_View SHALL sort listings by creation date descending as the default sort order with no Sort_Indicator displayed on any column header.
8. IF a column contains empty or null values for some listings, THEN THE List_View SHALL place those listings at the end of the sorted list regardless of sort direction.

### Requirement 4: Enhanced Filtering

**User Story:** As a property agent, I want additional filter options beyond the existing tabs, so that I can narrow down listings by specific criteria like district, property type, or status.

#### Acceptance Criteria

1. THE Filter_Bar SHALL retain the existing filter tabs: All, Sale, Rental, and Draft.
2. THE Filter_Bar SHALL provide a text search input that filters listings by address or postal code as the agent types, with a debounce delay of 300 milliseconds and a minimum input length of 2 characters before filtering is triggered.
3. WHEN the agent enters 2 or more characters in the search input, THE Listings_Page SHALL filter the displayed listings to show only those whose address or postal_code contains the search text (case-insensitive substring match).
4. THE Filter_Bar SHALL provide a district multi-select dropdown filter allowing the agent to select one or more districts (D01–D28) to filter by.
5. WHEN one or more districts are selected in the district filter, THE Listings_Page SHALL display only listings whose district matches one of the selected values.
6. THE Filter_Bar SHALL provide a property type dropdown filter with options: HDB, Condo, Landed, Commercial.
7. WHEN a property type is selected, THE Listings_Page SHALL display only listings whose property_type matches the selected value.
8. THE Filter_Bar SHALL provide a status dropdown filter with options: Draft, Live, Under Offer, Sold, Rented, Withdrawn.
9. WHEN a status is selected, THE Listings_Page SHALL display only listings whose listing_status matches the selected value.
10. WHEN multiple filters are active simultaneously (including the active tab), THE Listings_Page SHALL apply all filters using AND logic, displaying only listings that satisfy every active filter condition combined with the active tab constraint.
11. THE Filter_Bar SHALL display a count of currently visible listings in the format "Showing {filtered_count} of {total_count} listings", where total_count is the number of listings matching the active tab before additional filters are applied.
12. WHEN the agent clears the text search input or deselects all values from a dropdown filter, THE Listings_Page SHALL remove that filter from the active filter set and update the displayed listings accordingly.
13. IF the active combination of filters produces zero matching listings, THEN THE Listings_Page SHALL display an empty state message indicating no listings match the current filters, and offer the agent an option to clear all filters.

### Requirement 5: Row Interaction and Navigation

**User Story:** As a property agent, I want to click on a listing row to view its details, so that I can quickly access full property information from the list.

#### Acceptance Criteria

1. WHEN the agent clicks a listing item in the List_View, THE Listings_Page SHALL navigate to the listing detail page corresponding to that listing's unique identifier, and SHALL render the item with a pointer cursor to indicate it is clickable.
2. WHILE the agent hovers over a listing item in the List_View, THE List_View SHALL visually distinguish the hovered item by changing its border color to the brand accent color.
3. IF a listing has is_exclusive set to true and exclusivity_expiry is a date in the future relative to the current system date, THEN THE List_View SHALL display an exclusivity indicator badge on that listing item.
4. IF a listing has is_exclusive set to true and exclusivity_expiry is null or in the past relative to the current system date, THEN THE List_View SHALL NOT display the exclusivity indicator badge on that listing item.

### Requirement 6: Responsive Behavior

**User Story:** As a property agent, I want the list view to adapt to different screen sizes, so that I can use it on both desktop and tablet devices.

#### Acceptance Criteria

1. WHILE the viewport width is 1024px or greater, THE List_View SHALL display all columns (Address, District, Property Type, Tenure, Floor Area, Listing Type, Status, Price, PSF).
2. WHILE the viewport width is between 768px and 1023px, THE List_View SHALL display the following columns: Address, District, Property Type, Listing Type, Status, Price, and PSF, hiding the Tenure and Floor Area columns.
3. WHILE the viewport width is below 768px, THE Listings_Page SHALL display the Card_View layout instead of the List_View table layout without requiring a page reload.
4. WHILE the viewport width is between 768px and 1023px, IF the total column content width exceeds the available viewport width, THEN THE List_View SHALL enable horizontal scrolling to access overflowing columns.
5. WHEN the viewport width crosses a breakpoint boundary (768px or 1024px) due to browser resize or device orientation change, THE Listings_Page SHALL update the layout to match the new breakpoint within 200 milliseconds.
