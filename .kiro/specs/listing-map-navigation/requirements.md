# Requirements Document

## Introduction

This feature adds external map navigation links to the listing detail page in PropAgent SG. Property agents need to quickly navigate to Google Maps or OneMap (Singapore's official mapping service) to view the property location, get directions, or share location details with clients. The feature provides icon links displayed inline next to the listing address in the page header, opening the respective map services in new browser tabs.

## Glossary

- **Listing_Detail_Page**: The page displaying full details of a single property listing, located at `/listings/[id]`
- **Map_Navigation_Links**: Icon links displayed inline next to the listing address in the page header
- **Google_Maps_Link**: An icon link that opens Google Maps in a new browser tab showing the property location
- **OneMap_Link**: An icon link that opens OneMap (Singapore's national map service) in a new browser tab showing the property location
- **Postal_Code**: A 6-digit Singapore postal code stored in the listings table that uniquely identifies a building or location

## Requirements

### Requirement 1: Display Map Navigation Links

**User Story:** As a property agent, I want to see map navigation icons next to the listing address, so that I can quickly access the property location on external map services.

#### Acceptance Criteria

1. WHEN a listing detail page is loaded, THE Map_Navigation_Links SHALL display inline next to the listing address in the page header
2. THE Map_Navigation_Links SHALL display a Google_Maps_Link and a OneMap_Link as separate clickable icon links
3. WHILE the listing has a non-empty address string and a 6-digit Postal_Code, THE Map_Navigation_Links SHALL render both icons in a clickable state
4. IF the listing address is empty or the Postal_Code is missing or not a 6-digit string, THEN THE Map_Navigation_Links SHALL not render (component returns null)

### Requirement 2: Navigate to Google Maps

**User Story:** As a property agent, I want to open Google Maps showing the property location, so that I can view the surroundings, get directions, or share the location with clients.

#### Acceptance Criteria

1. WHEN the agent clicks the Google_Maps_Link, THE Listing_Detail_Page SHALL open a new browser tab with the URL `https://www.google.com/maps/search/?api=1&query={address}+Singapore+{postal_code}`
2. THE Google_Maps_Link SHALL construct the URL using the listing address and Postal_Code from the listing record
3. THE Google_Maps_Link SHALL percent-encode the address component per RFC 3986 (using `encodeURIComponent` or equivalent) so that spaces become `%20` and special characters are escaped

### Requirement 3: Navigate to OneMap

**User Story:** As a property agent, I want to open OneMap showing the property location, so that I can view Singapore-specific planning and land information.

#### Acceptance Criteria

1. WHEN the agent clicks the OneMap_Link, THE Listing_Detail_Page SHALL open a new browser tab with the URL `https://www.onemap.gov.sg/v2/?postal={postal_code}` where postal_code is the listing's 6-digit postal code

### Requirement 4: Accessibility and UX Standards

**User Story:** As a property agent, I want the map links to be clearly identifiable and accessible, so that I can use them efficiently on any device.

#### Acceptance Criteria

1. THE Google_Maps_Link SHALL include an `aria-label` attribute containing the service name "Google Maps" and the listing address
2. THE OneMap_Link SHALL include an `aria-label` attribute containing the service name "OneMap" and the listing address
3. THE Google_Maps_Link and OneMap_Link SHALL include `target="_blank"` and `rel="noopener noreferrer"` attributes
4. THE Google_Maps_Link and OneMap_Link SHALL each display a visual icon identifying the map service
5. THE Google_Maps_Link and OneMap_Link SHALL be keyboard-focusable and operable via Enter key press
