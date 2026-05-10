# Implementation Plan: Listing Map Navigation

## Overview

Add a Map Navigation Section to the listing detail page that provides external links to Google Maps and OneMap. Implementation follows the existing server component pattern: geocode the postal code at render time via the OneMap API, then pass results to a presentational `MapNavigationCard` component. Google Maps links render when address + postal code are valid; OneMap links render only when geocoding succeeds.

## Tasks

- [x] 1. Create URL builder utilities and validation
  - [x] 1.1 Create `src/lib/maps/url-builders.ts` with `buildGoogleMapsUrl`, `buildOneMapUrl`, `isValidPostalCode`, and `buildAriaLabel` functions
    - `buildGoogleMapsUrl(address, postalCode)` returns `https://www.google.com/maps/search/?api=1&query={encoded_address}+Singapore+{postalCode}`
    - `buildOneMapUrl(lat, lng)` returns `https://www.onemap.gov.sg/main/v2/landing/{lat}/{lng}`
    - `isValidPostalCode(postalCode)` returns true only for exactly 6-digit strings
    - `buildAriaLabel(serviceName, address)` returns a string containing both the service name and address
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 5.1, 5.2_

  - [x] 1.2 Write property tests for URL builders
    - Create `src/lib/maps/__tests__/map-url-properties.test.ts`
    - **Property 1: Google Maps URL Construction** — for any non-empty address and valid 6-digit postal code, URL starts with correct prefix and contains encoded address + Singapore + postal code
    - **Property 2: Address Percent-Encoding** — round-trip: `decodeURIComponent` of the encoded address portion returns the original address
    - **Property 3: OneMap URL Construction** — for any lat/lng strings, URL matches `https://www.onemap.gov.sg/main/v2/landing/{lat}/{lng}`
    - **Property 6: Aria-Label Format** — for any service name and address, result contains both
    - **Validates: Requirements 2.1, 2.2, 2.3, 3.1, 5.1, 5.2**

- [x] 2. Implement geocoding function
  - [x] 2.1 Create `src/lib/maps/geocode.ts` with `geocodePostalCode` function
    - Send GET request to `https://www.onemap.gov.sg/api/common/elastic/search?searchVal={postal_code}&returnGeom=Y&getAddrDetails=N`
    - Use `AbortController` with 5-second timeout
    - Extract `LATITUDE` and `LONGITUDE` from first result on success
    - Return `null` on any failure: network error, timeout, HTTP non-2xx, zero results, malformed JSON
    - Define `OneMapSearchResponse` interface for type safety
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.2 Write property test for OneMap API response parsing
    - **Property 4: OneMap API Response Parsing** — for any valid response with at least one result containing non-empty LATITUDE and LONGITUDE, function extracts first result coordinates; for zero results or missing fields, returns null
    - **Validates: Requirements 4.2**

  - [x] 2.3 Write unit tests for geocodePostalCode
    - Mock fetch to test: successful response returns coordinates, empty results returns null, network error returns null, timeout returns null, malformed JSON returns null
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create MapNavigationCard component
  - [x] 4.1 Create `src/components/listings/map-navigation-card.tsx`
    - Accept props: `address`, `postalCode`, `coordinates` (lat/lng or null)
    - Validate inputs using `isValidPostalCode` and non-empty address check
    - Render Google Maps link when address is non-empty and postal code is valid
    - Render OneMap link only when coordinates are non-null (in addition to valid address/postal code)
    - Each link: `target="_blank"`, `rel="noopener noreferrer"`, proper `aria-label` via `buildAriaLabel`
    - Each link: display service name as visible text with a visual icon
    - Minimum touch target size of 44×44 CSS pixels
    - Links must be keyboard-focusable (use `<a>` elements)
    - Card styling: `rounded-2xl`, `bg-onyx-card`, `border border-onyx-line`, padding matching other cards
    - Section heading identifying it as map navigation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 4.2 Write property test for link visibility logic
    - **Property 5: Link Visibility Based on Input Validity** — Google Maps link renders iff address is non-empty AND postal code is 6 digits; OneMap link renders iff same conditions hold AND coordinates are non-null
    - **Validates: Requirements 1.4, 1.5, 2.4**

  - [x] 4.3 Write unit tests for MapNavigationCard
    - Test: renders both links with valid props and coordinates
    - Test: hides OneMap link when coordinates are null
    - Test: hides both links when address is empty
    - Test: hides both links when postal code is invalid
    - Test: links have correct `target`, `rel`, and `aria-label` attributes
    - Test: card uses correct CSS classes
    - _Requirements: 1.2, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4_

- [x] 5. Integrate MapNavigationCard into listing detail page
  - [x] 5.1 Update `apps/web/src/app/(dashboard)/listings/[id]/page.tsx`
    - Import `geocodePostalCode` from `@/lib/maps/geocode`
    - Import `MapNavigationCard` from `@/components/listings/map-navigation-card`
    - Call `geocodePostalCode(listing.postal_code)` in the existing `Promise.all` block (or parallel to it)
    - Render `<MapNavigationCard>` in the left column below `<AreaInsightHero>`, passing `address`, `postalCode`, and `coordinates`
    - Ensure geocoding failure does not break page render (already handled by null return)
    - _Requirements: 1.1, 3.4, 4.4_

  - [x] 5.2 Write integration tests for listing detail page with map navigation
    - Mock OneMap API fetch and verify MapNavigationCard renders with both links on success
    - Mock OneMap API failure and verify only Google Maps link renders
    - Verify page still renders fully when geocoding fails
    - _Requirements: 4.3, 4.4_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations use TypeScript
- No database changes are needed; the feature uses existing `address` and `postal_code` fields from the listings table
- `fast-check` is already available as a dev dependency

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
