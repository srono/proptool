# Implementation Plan: Listing Seller Management

## Overview

This plan implements seller-contact association on listings, including database schema changes, a service layer for seller lead management, UI components for seller selection and display, and integration with existing messaging and viewing systems. Tasks are ordered so each step builds on the previous, starting with schema and types, then service logic, then UI components, and finally wiring everything together.

## Tasks

- [x] 1. Database migration and shared types
  - [x] 1.1 Create database migration for seller management schema changes
    - Create a new Supabase migration file that adds `seller_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL` to the `listings` table
    - Add index `idx_listings_seller` on `listings(seller_contact_id)`
    - Add `seller_updated_at TIMESTAMPTZ` column to the `viewings` table
    - Create the `handle_viewing_completion()` trigger function that resets `seller_updated` to false and `seller_updated_at` to NULL when a viewing transitions to `completed` status
    - Create the `viewing_completion_seller_reset` trigger on the `viewings` table
    - _Requirements: 1.4, 1.7, 6.1_

  - [x] 1.2 Update shared TypeScript types for Listing and Viewing
    - Add `seller_contact_id: string | null` to the `Listing` interface in `packages/shared/src/types/listing.ts`
    - Create `ListingWithSeller` extended interface that includes `seller_contact: { id: string; full_name: string; phone: string } | null`
    - Add `seller_updated_at: string | null` to the `Viewing` interface in `packages/shared/src/types/viewing.ts`
    - _Requirements: 1.4, 6.3_

- [x] 2. Seller service layer
  - [x] 2.1 Create seller-service.ts with core business logic
    - Create `apps/web/src/lib/services/seller-service.ts`
    - Implement `attachSeller(supabase, listingId, contactId, tenantId)` that checks for an existing active seller lead (matching `contact_id`, `origin_listing_id`, `is_active=true`) and creates a new lead with `lead_category='seller'`, `status='new_lead'` if none exists
    - Implement `removeSeller(supabase, listingId)` that sets `seller_contact_id` to null on the listing without modifying any leads
    - Implement `changeSeller(supabase, listingId, newContactId, tenantId)` that clears the old seller and attaches the new one (retaining old lead, creating new)
    - Implement `searchContacts(supabase, query)` that queries contacts with `ilike` on `full_name` and `phone`, limited to 20 results
    - Implement `markViewingSellerUpdated(supabase, viewingId)` that sets `seller_updated=true` and `seller_updated_at=now()`
    - Implement `getPendingSellerUpdateCount(supabase, listingId)` that counts completed viewings where `seller_updated=false`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.4, 6.1, 6.3_

  - [x] 2.2 Write unit tests for seller-service
    - Create `apps/web/src/lib/services/__tests__/seller-service.test.ts`
    - Test `attachSeller` creates a new lead when none exists
    - Test `attachSeller` reuses existing active lead for same listing
    - Test `removeSeller` clears seller_contact_id without modifying leads
    - Test `changeSeller` retains old lead and creates new one
    - Test `searchContacts` returns max 20 results matching name or phone
    - Test `markViewingSellerUpdated` sets correct fields
    - Test `getPendingSellerUpdateCount` returns correct count
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 6.3_

- [x] 3. Checkpoint - Ensure schema and service layer are solid
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Seller contact picker component
  - [x] 4.1 Create SellerContactPicker component
    - Create `apps/web/src/components/listings/seller-contact-picker.tsx`
    - Implement debounced search input (300ms delay) that calls `searchContacts` after 1+ characters entered
    - Display up to 20 matching results showing full_name and phone
    - Support selecting a contact (calls `onChange` with contact object)
    - Support clearing the selection (calls `onChange` with null)
    - Support inline "Create new contact" option that collects full_name and phone at minimum
    - Display selected contact's full_name and phone as confirmation
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 5.4_

  - [x] 4.2 Write unit tests for SellerContactPicker
    - Test search triggers after 1+ characters with 300ms debounce
    - Test displays up to 20 results
    - Test selecting a contact calls onChange with correct data
    - Test clearing selection calls onChange with null
    - Test inline create contact flow
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 5. Seller card and listing detail integration
  - [x] 5.1 Create SellerCard component
    - Create `apps/web/src/components/listings/seller-card.tsx`
    - Display seller's full_name, phone, and email (omit email if null)
    - Display link to seller's contact profile page (`/contacts/{id}`)
    - Display pipeline stage label when seller has an active seller lead for the listing
    - Display "Message Seller" action that navigates to `/messages/{contact_id}` with lead query param if applicable
    - Disable "Message Seller" if seller has no phone number, showing indicator that phone is required
    - When no seller is attached, display a CTA to initiate seller attachment
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2_

  - [x] 5.2 Create SellerUpdateReminder component
    - Create `apps/web/src/components/listings/seller-update-reminder.tsx`
    - Display badge with count of completed viewings pending seller update
    - Only render when count > 0 and listing has a seller attached
    - _Requirements: 6.4, 6.5_

  - [x] 5.3 Create ViewingSellerStatus component
    - Create `apps/web/src/components/viewings/viewing-seller-status.tsx`
    - Display toggle button for marking completed viewings as seller-updated
    - Show timestamp when viewing is marked as seller-updated
    - Call `markViewingSellerUpdated` service function on toggle
    - _Requirements: 6.2, 6.3_

  - [x] 5.4 Write unit tests for SellerCard, SellerUpdateReminder, and ViewingSellerStatus
    - Test SellerCard renders seller info correctly, omits email when null
    - Test SellerCard shows CTA when no seller
    - Test SellerCard disables message action when no phone
    - Test SellerUpdateReminder shows correct count
    - Test ViewingSellerStatus toggle behavior and timestamp display
    - _Requirements: 3.1, 3.3, 4.2, 6.2, 6.4_

- [x] 6. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate seller into listing form
  - [x] 7.1 Add SellerContactPicker to ListingForm
    - Modify `apps/web/src/components/listings/listing-form.tsx`
    - Add a "Seller" card section containing the `SellerContactPicker`
    - Include `seller_contact_id` in the form save payload
    - On save, call `attachSeller` from seller-service when a seller is selected
    - On save, call `removeSeller` when seller is cleared
    - On save, call `changeSeller` when seller is changed to a different contact
    - Handle lead creation errors gracefully (show error toast but still save listing)
    - Allow listing to be saved without a seller contact
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.4, 2.5_

  - [x] 7.2 Write unit tests for ListingForm seller integration
    - Test form saves with seller_contact_id when seller selected
    - Test form saves without seller_contact_id when no seller
    - Test form calls attachSeller on new seller selection
    - Test form calls changeSeller when seller is changed
    - Test form calls removeSeller when seller is cleared
    - Test error handling when lead creation fails
    - _Requirements: 1.3, 1.6, 2.4_

- [x] 8. Integrate seller into listing detail page
  - [x] 8.1 Add seller data fetching and components to ListingDetailPage
    - Modify `apps/web/src/app/(dashboard)/listings/[id]/page.tsx`
    - Fetch seller contact data via Supabase join: `seller_contact:contacts!seller_contact_id(id, full_name, phone, email)`
    - Fetch seller lead data: query leads where `contact_id`, `origin_listing_id`, `lead_category='seller'`, `is_active=true`
    - Fetch pending seller update count via `getPendingSellerUpdateCount`
    - Render `SellerCard` in the right column with fetched data
    - Render `SellerUpdateReminder` with pending count
    - Render `ViewingSellerStatus` on each completed viewing in the viewings section
    - Only show seller update UI elements when listing has a seller attached
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 6.2, 6.4, 6.5_

- [x] 9. Integrate seller into listings list views
  - [x] 9.1 Add seller column to ListingsTable and seller name to ListingsCardGrid
    - Modify `apps/web/src/app/(dashboard)/listings/page.tsx` to join seller contact data in the listings query: `*, seller_contact:contacts!seller_contact_id(id, full_name, phone)`
    - Modify `apps/web/src/components/listings/listings-table/listings-table.tsx` to add a "Seller" column header
    - Modify `apps/web/src/components/listings/listings-table/listing-row.tsx` to display seller full_name (truncated with ellipsis, min 12 chars visible), clickable link to `/contacts/{id}`, or dash ("—") if no seller
    - Modify `apps/web/src/components/listings/listings-card-grid.tsx` to display seller full_name on each card (clickable link to contact profile), or dash if no seller
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 9.2 Write unit tests for listings list seller display
    - Test table shows seller name when present
    - Test table shows dash when no seller
    - Test name truncation with ellipsis
    - Test seller name links to contact profile
    - Test card grid shows seller name
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Message seller integration
  - [x] 10.1 Wire "Message Seller" navigation with lead context
    - Ensure `SellerCard` "Message Seller" action navigates to `/messages/{contact_id}?lead={lead_id}` when seller has an active seller lead
    - Ensure navigation goes to `/messages/{contact_id}` without lead param when no active seller lead exists
    - Verify the existing messaging page handles the `lead` query param to associate messages with the seller lead
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [x] 11. Final checkpoint - Ensure all tests pass and integration is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design has no Correctness Properties section, so property-based tests are not included
- Unit tests validate specific examples and edge cases
- The existing `seller_updated` boolean on viewings is already present; only `seller_updated_at` timestamp is new
- The messaging system already exists; this feature only adds navigation to it with lead context

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "7.1", "9.1"] },
    { "id": 5, "tasks": ["7.2", "8.1", "9.2", "10.1"] }
  ]
}
```
