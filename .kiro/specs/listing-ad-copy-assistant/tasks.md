# Implementation Plan: Listing Ad Copy Assistant

## Overview

This plan implements an AI-powered ad copy generation feature for property listings. The implementation follows an incremental approach: database schema first, then core library modules (prompt builder, response parser, compliance checker), followed by the API route, UI components, and finally integration wiring. Property-based tests validate correctness properties defined in the design document.

## Tasks

- [x] 1. Set up database schema and shared types
  - [x] 1.1 Create the `listing_marketing_assets` database migration
    - Create a new Supabase migration file with the `listing_marketing_assets` table DDL
    - Include indexes (`idx_marketing_assets_listing`, `idx_marketing_assets_tenant`)
    - Enable RLS and create the tenant isolation policy
    - _Requirements: 9.2, 10.2, 11.2_

  - [x] 1.2 Define TypeScript interfaces and types for ad copy feature
    - Create `src/lib/ai/ad-copy-types.ts` with all interfaces: `GenerationParams`, `CopyVariant`, `GenerationResponse`, `ComplianceWarning`, `ComplianceResult`, `GenerateAdCopyRequest`, `GenerateAdCopyResponse`, `GenerateAdCopyErrorResponse`, `MarketingAssetRecord`
    - Define union types: `AdPlatform`, `AdTone`, `AdLength`, `CtaStyle`, `TargetAudience`, `CopyVariantType`, `ComplianceCategory`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.7, 9.2_

- [x] 2. Implement core library modules
  - [x] 2.1 Implement the listing picker filter function
    - Create `src/lib/ai/listing-picker-filter.ts`
    - Implement case-insensitive filtering by address, project name, or status
    - Enforce minimum 2-character query requirement (return empty for shorter)
    - Limit results to 20, ordered by `created_at` descending
    - _Requirements: 2.3, 2.4_

  - [x] 2.2 Write property test for listing picker search correctness
    - **Property 1: Listing Picker Search Correctness**
    - **Validates: Requirements 2.3, 2.4**
    - Create `src/lib/ai/__tests__/listing-picker-filter.property.test.ts`
    - Generate arbitrary listing arrays and query strings with fast-check
    - Assert: results only contain matches, max 20 results, ordered by created_at desc, empty for <2 char queries

  - [x] 2.3 Implement generation form validation logic
    - Create `src/lib/ai/generation-form-validation.ts`
    - Validate that all four required fields (platform, tone, length, CTA style) have values
    - Validate mandatory listing fields (address, property_type, listing_type, price/rental)
    - Return structured validation result with missing field names
    - _Requirements: 3.9, 4.3_

  - [x] 2.4 Write property test for generation form validation correctness
    - **Property 2: Generation Form Validation Correctness**
    - **Validates: Requirements 3.9, 4.3**
    - Create `src/lib/ai/__tests__/generation-form-validation.property.test.ts`
    - Generate arbitrary form field combinations with fast-check
    - Assert: form valid iff all required fields present; generate blocked iff mandatory listing fields missing

  - [x] 2.5 Implement the ad copy prompt builder
    - Create `src/lib/ai/ad-copy-prompt-builder.ts`
    - Build system prompt with platform constraints, tone instructions, length limits
    - Build user prompt from listing data, including all non-null fields and omitting null ones
    - Always include mandatory fields (address, property_type, listing_type, price/rental)
    - Include agent attribution and CEA number when tenant config requires it
    - _Requirements: 4.1, 4.2, 4.9, 4.10_

  - [x] 2.6 Write property tests for prompt builder
    - **Property 3: Prompt Builder Field Inclusion**
    - **Property 4: Prompt Builder Agent and Tenant Attribution**
    - **Validates: Requirements 4.1, 4.2, 4.9, 4.10**
    - Create `src/lib/ai/__tests__/ad-copy-prompt-builder.property.test.ts`
    - Generate arbitrary listing objects with mix of null/non-null optional fields
    - Assert: all non-null fields appear in prompt, no null fields referenced, mandatory fields always present
    - Assert: CEA number included when tenant has it, agent name/phone included when required, omitted otherwise

  - [x] 2.7 Implement the ad copy response parser
    - Create `src/lib/ai/ad-copy-response-parser.ts`
    - Parse JSON response from LLM into typed `CopyVariant[]`
    - Validate each variant type exists and content respects max character limits
    - Validate hashtag count (5–15) when hashtags are included
    - Return structured error when parsing fails
    - _Requirements: 4.7, 4.8_

  - [x] 2.8 Write property test for response parser variant completeness
    - **Property 5: Response Parser Variant Completeness**
    - **Validates: Requirements 4.7, 4.8**
    - Create `src/lib/ai/__tests__/ad-copy-response-parser.property.test.ts`
    - Generate valid JSON responses with all required variant types
    - Assert: parser produces exactly the required variant types with correct max lengths
    - Assert: hashtag count validated between 5 and 15 inclusive

  - [x] 2.9 Implement the compliance checker
    - Create `src/lib/ai/compliance-checker.ts`
    - Scan for unsupported superlatives (best deal, guaranteed return, highest yield, number one, top performer)
    - Scan for misleading claims (appreciation rates, guaranteed returns, artificial scarcity)
    - Scan for discriminatory language targeting Meta housing ad protected categories
    - Scan for unverified factual claims (distance claims, yield percentages)
    - Return `ComplianceResult` with categorized warnings
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 2.10 Write property test for compliance checker detection accuracy
    - **Property 6: Compliance Checker Detection Accuracy**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - Create `src/lib/ai/__tests__/compliance-checker.property.test.ts`
    - Generate text strings containing known risky phrases and clean text
    - Assert: all risky phrases flagged with correct category, clean text returns zero warnings

  - [x] 2.11 Implement dirty state detection utility
    - Create `src/lib/ai/dirty-state.ts`
    - Compare current content_text against last saved or original generated version
    - Return boolean indicating whether content differs by at least one character
    - _Requirements: 8.3, 9.6_

  - [x] 2.12 Write property test for dirty state detection
    - **Property 7: Dirty State Detection**
    - **Validates: Requirements 8.3, 9.6**
    - Create `src/lib/ai/__tests__/dirty-state.property.test.ts`
    - Generate pairs of strings (original, modified) with fast-check
    - Assert: dirty iff strings differ by at least one character

  - [x] 2.13 Implement saved records retrieval function
    - Create `src/lib/ai/saved-records-query.ts`
    - Query `listing_marketing_assets` for a given listing_id
    - Return at most 50 records ordered by `created_at` descending
    - _Requirements: 11.2, 11.4_

  - [x] 2.14 Write property test for saved records retrieval ordering and limits
    - **Property 8: Saved Records Retrieval Ordering and Limits**
    - **Validates: Requirements 11.2, 11.4**
    - Create `src/lib/ai/__tests__/saved-records-query.property.test.ts`
    - Generate arrays of records with arbitrary created_at timestamps
    - Assert: at most 50 returned, ordered by created_at descending

- [x] 3. Checkpoint - Core library modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement API route
  - [x] 4.1 Create the `/api/ad-copy/generate` API route
    - Create `src/app/api/ad-copy/generate/route.ts`
    - Validate authentication (return 401 if no user)
    - Validate tenant membership and listing ownership (return 403 if mismatch)
    - Validate request body fields (return 400 for missing required fields)
    - Validate mandatory listing fields (return 400 if listing data incomplete)
    - Load listing, agent, and tenant data from Supabase
    - Call prompt builder to construct prompt
    - Call OpenAI with configured model (read `AD_COPY_MODEL` env var, fallback to default)
    - Parse response with response parser
    - Handle timeout (15s), rate limit, content policy, and auth errors with appropriate HTTP codes
    - Return `GenerateAdCopyResponse` on success
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 12.1, 12.2, 12.3, 12.4_

  - [x] 4.2 Write unit tests for the API route
    - Create `src/app/api/ad-copy/generate/__tests__/route.test.ts`
    - Test auth validation, tenant isolation, request validation, timeout handling, error responses
    - Mock Supabase and OpenAI clients
    - _Requirements: 4.5, 4.6, 12.4_

- [x] 5. Implement UI components - Generation side
  - [x] 5.1 Create the Marketing Section component for Listing Detail Page
    - Create `src/components/listings/marketing-section.tsx`
    - Display "Generate Ad Copy" button that navigates to `/tools/ad-copy/[listingId]`
    - Display disabled placeholder buttons for "Generate Flyer", "Copy Listing Link", "View Landing Page"
    - Disable "Generate Ad Copy" for draft listings with explanatory text
    - Display count of saved marketing assets for the listing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1_

  - [x] 5.2 Create the Listing Picker component
    - Create `src/components/ad-copy/listing-picker.tsx`
    - Implement search input with 2-character minimum before filtering
    - Display matching listings (max 20) using the listing picker filter function
    - Show "no results" message when search returns empty
    - Navigate to ad copy page on listing selection
    - Handle listing data load failure with retry option
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.3 Create the Generation Form component
    - Create `src/components/ad-copy/generation-form.tsx`
    - Implement platform selector (Facebook, Instagram, WhatsApp promo, Generic social)
    - Implement tone selector (Professional, Premium, Friendly, Urgency, Investor-focused, Family-focused)
    - Implement length selector (Short, Medium, Long)
    - Implement CTA style selector (Enquire now, WhatsApp now, Book a viewing, Request details)
    - Implement optional target audience angle selector
    - Implement "Avoid emojis" toggle (default off) and "Include hashtags" toggle (default on)
    - Pre-select defaults: Facebook, Professional, Medium, Enquire now
    - Disable generate button when required fields missing, show inline indication
    - Display required-field indicators on mandatory selectors
    - Remain visible and editable after generation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 8.1_

- [x] 6. Implement UI components - Output side
  - [x] 6.1 Create the Copy Output Panel component
    - Create `src/components/ad-copy/copy-output-panel.tsx`
    - Implement tabs: Facebook, Instagram, WhatsApp, Short Version
    - Display active tab based on selected platform (Generic → Facebook)
    - Render each variant in an editable text area (max 3000 chars) with type label
    - Display Pre_Publish_Reminder fixed at top of output area
    - Preserve edits when switching tabs
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 6.2 Create the Copy Variant Card component
    - Create `src/components/ad-copy/copy-variant-card.tsx`
    - Display variant content in editable text area with type label
    - Implement "Copy" button with clipboard API
    - Show "Copied!" confirmation for 2 seconds on success
    - Show inline error for 5 seconds on clipboard failure
    - Fall back to selectable text area when clipboard unavailable
    - Disable Copy button while variant is being generated
    - Implement "Save" button (disabled when not dirty or already saved)
    - Implement "Mark as Used" action (visible only for saved, unpublished variants)
    - Display "Used" badge for published variants
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.1, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4_

  - [x] 6.3 Create the Compliance Notes component
    - Create `src/components/ad-copy/compliance-notes.tsx`
    - Display warnings with flagged phrase and compliance rule category
    - Display "No compliance issues detected" when no warnings
    - Display fallback warning when compliance check fails
    - _Requirements: 6.5, 6.6, 6.7_

  - [x] 6.4 Create the Saved Copy Section component
    - Create `src/components/ad-copy/saved-copy-section.tsx`
    - List saved marketing asset records sorted by creation date descending
    - Display platform, tone, creation date, content_text, and "Used" badge
    - Show max 50 records
    - Display empty state message when no saved copy exists
    - _Requirements: 11.2, 11.3, 11.4, 11.5_

- [x] 7. Checkpoint - UI components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement page routes and orchestration
  - [x] 8.1 Create the Ad Copy Assistant page (Tools Menu entry)
    - Create `src/app/(dashboard)/tools/ad-copy/page.tsx`
    - Server component that renders the Listing Picker
    - Add "Ad Copy Assistant" item to Tools Menu after "Market Comparables"
    - _Requirements: 2.1, 2.2_

  - [x] 8.2 Create the Ad Copy Assistant page (Listing Detail entry)
    - Create `src/app/(dashboard)/tools/ad-copy/[listingId]/page.tsx`
    - Server component that loads listing data and passes to client shell
    - _Requirements: 1.2, 1.3_

  - [x] 8.3 Create the Ad Copy Client Shell orchestration component
    - Create `src/components/ad-copy/ad-copy-client-shell.tsx`
    - Manage state: generation params, generated variants, compliance results, loading states, dirty tracking
    - Handle POST to `/api/ad-copy/generate` with loading indicator and timeout UX
    - Run compliance checker on received variants
    - Handle regeneration with unsaved changes confirmation prompt
    - Handle save operations via Supabase client
    - Handle "Mark as Used" operations via Supabase client
    - Implement mobile responsive layout (single-column <768px, side-by-side ≥768px)
    - Ensure all interactive elements have minimum 44x44px touch targets
    - _Requirements: 4.4, 4.5, 4.6, 5.2, 6.7, 8.2, 8.3, 8.4, 8.5, 8.6, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 8.4 Integrate Marketing Section into Listing Detail Page
    - Add `MarketingSection` component to the listing detail page layout
    - Position as last item in left column, after Area Insight section
    - Pass listing ID and status for conditional rendering
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 9. Checkpoint - Integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Final integration tests and wiring
  - [x] 10.1 Write integration tests for save and mark-as-used flows
    - Test database record creation with correct fields
    - Test "Mark as Used" updates published_at timestamp
    - Test RLS enforcement (tenant isolation)
    - _Requirements: 9.2, 10.2_

  - [x] 10.2 Write unit tests for UI components
    - Create `src/components/ad-copy/__tests__/generation-form.test.tsx` - test defaults, required field indicators
    - Create `src/components/ad-copy/__tests__/copy-output-panel.test.tsx` - test tab rendering, variant labels
    - Create `src/components/listings/__tests__/marketing-section.test.tsx` - test button states, disabled for draft
    - Create `src/components/ad-copy/__tests__/compliance-notes.test.tsx` - test warning display, empty state
    - Create `src/components/ad-copy/__tests__/copy-variant-card.test.tsx` - test copy feedback, fallback
    - _Requirements: 3.8, 3.9, 5.1, 6.5, 6.6, 7.4, 7.5_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses `vitest` with `fast-check` for property-based testing (both already in devDependencies)
- All components follow existing project patterns (Supabase client-side calls for mutations, server components for data loading)
- The `AD_COPY_MODEL` environment variable should be added to `.env.example` and `.env.local`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "2.7", "2.9", "2.11", "2.13"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.8", "2.10", "2.12", "2.14"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 7, "tasks": ["10.1", "10.2"] }
  ]
}
```
