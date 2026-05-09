# Implementation Plan: AI Reply Suggestions

## Overview

This plan implements AI-powered reply suggestions for the PropAgent SG WhatsApp chat thread. The approach starts with foundational types and database schema, builds up utility modules (formatting, intent detection, calendar), then the suggestion engine and API route, and finally the UI components. Each task builds incrementally on previous work, ensuring no orphaned code.

## Tasks

- [x] 1. Set up shared types and database migration
  - [x] 1.1 Create shared suggestion types
    - Create `packages/shared/src/types/suggestion.ts` with `Suggestion`, `SuggestionCategory`, and `ConversationListingContext` types
    - Export the new types from the shared package index
    - _Requirements: 6.6, 10.4, 10.5_

  - [x] 1.2 Create database migration for conversation_listing_context table
    - Create SQL migration file with the `conversation_listing_context` table definition
    - Include UUID primary key, tenant_id, contact_id, listing_id foreign keys with CASCADE deletes
    - Add UNIQUE constraint on (tenant_id, contact_id)
    - Add indexes on tenant_id and (tenant_id, contact_id)
    - Enable RLS with tenant_isolation policy using `public.get_tenant_id()`
    - Add updated_at trigger
    - _Requirements: 5.3, 9.4_

- [x] 2. Implement utility modules
  - [x] 2.1 Implement price formatting utility
    - Create `apps/web/src/lib/ai/format-price.ts`
    - Implement `formatPrice(value: number): string` that formats as "S$" with thousand separators (e.g., S$1,800,000)
    - _Requirements: 4.7_

  - [x] 2.2 Write property test for price formatting (Property 13)
    - **Property 13: Price Formatting**
    - **Validates: Requirements 4.7**
    - Create `apps/web/src/lib/ai/__tests__/format-price.property.test.ts`
    - For any positive integer, output matches pattern `S$` followed by comma-separated digit groups

  - [x] 2.3 Implement chip text truncation utility
    - Create `apps/web/src/lib/ai/truncate.ts`
    - Implement `truncateChipText(text: string, maxLength?: number): string` that truncates at 80 chars with "…"
    - _Requirements: 2.1_

  - [x] 2.4 Write property test for chip truncation (Property 8)
    - **Property 8: Chip Text Truncation**
    - **Validates: Requirements 2.1**
    - Create `apps/web/src/components/messages/__tests__/chip-truncation.property.test.ts`
    - For any string ≤80 chars return unchanged; for >80 chars return first 80 + "…"

  - [x] 2.5 Implement listing snippet formatter
    - Create `apps/web/src/lib/ai/listing-snippet.ts`
    - Implement `formatListingSnippet(listing: Listing): string` with sale and rental formats
    - Include emoji-prefixed lines for property type/address, floor area/tenure, price, and description (truncated to 200 chars)
    - _Requirements: 4.3, 4.4, 4.7, 4.9_

  - [x] 2.6 Write property tests for listing snippet formatting (Properties 4, 5)
    - **Property 4: Listing Snippet Formatting (Sale)**
    - **Property 5: Listing Snippet Formatting (Rental)**
    - **Validates: Requirements 4.3, 4.4, 4.7, 4.9**
    - Create `apps/web/src/lib/ai/__tests__/listing-snippet.property.test.ts`
    - For sale listings: verify snippet contains property_type, address, district, sqft, tenure, formatted price, PSF
    - For rental listings: verify snippet contains property_type, address, district, sqft, tenure, formatted rental with "/mo"
    - Verify description truncation at 200 chars with "…"

  - [x] 2.7 Implement composer insertion utility
    - Create `apps/web/src/lib/ai/composer-utils.ts`
    - Implement `insertSnippetIntoComposer(existingText: string, snippet: string): string`
    - If existing text is empty/whitespace, return snippet alone; otherwise append with newline separator
    - _Requirements: 4.5, 4.6_

  - [x] 2.8 Write property test for composer insertion (Property 6)
    - **Property 6: Listing Snippet Insertion into Composer**
    - **Validates: Requirements 4.5, 4.6**
    - Create `apps/web/src/lib/ai/__tests__/composer-utils.property.test.ts`
    - For empty existing text: result equals snippet; for non-empty: result equals existing + "\n" + snippet

- [x] 3. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement scheduling intent detection and calendar availability
  - [x] 4.1 Implement scheduling intent detector
    - Create `apps/web/src/lib/ai/scheduling-intent.ts`
    - Implement `detectSchedulingIntent(message: string): boolean` with case-insensitive keyword matching
    - Include all keywords: viewing, view, appointment, meeting, available, availability, free, schedule, reschedule, what time, when can, slot, day names, tomorrow, today, next week, this week, morning, afternoon, evening
    - _Requirements: 7.1, 7.2, 7.6_

  - [x] 4.2 Write property test for scheduling intent detection (Property 2)
    - **Property 2: Scheduling Intent Detection**
    - **Validates: Requirements 3.1, 7.1, 7.2, 7.6**
    - Create `apps/web/src/lib/ai/__tests__/scheduling-intent.property.test.ts`
    - For any string containing a keyword → returns true; for any string without keywords → returns false

  - [x] 4.3 Implement getAvailableSlots in Google Calendar lib
    - Extend `apps/web/src/lib/google/calendar.ts` with `getAvailableSlots(accessToken: string, fromDate?: Date): Promise<AvailableSlot[]>`
    - Query Google Calendar FreeBusy API for next 7 days
    - Compute available slots during business hours (9:00–19:00 SGT, ≥60min, no overlap with busy periods)
    - Return up to 3 earliest slots with formatted date strings (en-SG locale)
    - Implement 5-second timeout with AbortController
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7_

  - [x] 4.4 Write property test for calendar slot computation (Property 3)
    - **Property 3: Calendar Available Slot Computation**
    - **Validates: Requirements 3.3, 3.4**
    - Create `apps/web/src/lib/google/__tests__/calendar-slots.property.test.ts`
    - For any set of busy periods: all slots within 9:00–19:00, ≥60min, no overlap with busy, ≤3 returned, chronological order

- [x] 5. Implement lead selection and context building
  - [x] 5.1 Implement active lead selector
    - Create `apps/web/src/lib/ai/lead-selector.ts`
    - Implement `selectActiveLead(leads: Lead[]): Lead | null`
    - Exclude leads with status closed_won, closed_lost, or nurture
    - From remaining, select the one with most recent last_activity_at
    - _Requirements: 8.2, 8.7_

  - [x] 5.2 Write property test for active lead selection (Property 9)
    - **Property 9: Active Lead Selection**
    - **Validates: Requirements 8.2**
    - Create `apps/web/src/lib/ai/__tests__/lead-selector.property.test.ts`
    - Verify exclusion of closed/nurture leads, selection of most recent active lead, null when no active leads

  - [x] 5.3 Implement conversation context builder
    - Create `apps/web/src/lib/ai/context-builder.ts`
    - Implement `buildConversationContext(messages: Message[], now?: Date): ConversationContextMessage[]`
    - Select up to 20 most recent messages ordered by sent_at descending
    - Include direction, body, and computed relative time string for each
    - _Requirements: 1.1, 1.3, 6.5_

  - [x] 5.4 Write property test for conversation context message limit (Property 12)
    - **Property 12: Conversation Context Message Limit**
    - **Validates: Requirements 1.1, 1.3, 6.5**
    - Create `apps/web/src/lib/ai/__tests__/context-builder.property.test.ts` (add to prompt-builder test file)
    - For any N messages: exactly min(N, 20) selected, each has direction, body, non-empty relativeTime

  - [x] 5.5 Implement first-name greeting detection
    - Create `apps/web/src/lib/ai/greeting-detection.ts`
    - Implement `shouldUseFirstName(messages: Message[]): boolean`
    - Return true if most recent inbound is first message OR gap ≥24h since last outbound
    - _Requirements: 8.5_

  - [x] 5.6 Write property test for first-name greeting detection (Property 11)
    - **Property 11: First-Name Greeting Detection**
    - **Validates: Requirements 8.5**
    - Create `apps/web/src/lib/ai/__tests__/greeting-detection.property.test.ts` (add to prompt-builder test file)
    - Verify flag is true when first message or ≥24h gap, false otherwise

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement LLM prompt builder and response parser
  - [x] 7.1 Implement LLM prompt builder
    - Create `apps/web/src/lib/ai/prompt-builder.ts`
    - Implement `buildSuggestionPrompt(input: PromptBuilderInput): BuiltPrompt`
    - System prompt: Singapore property agent reply assistant role, WhatsApp tone, SG terminology, JSON output format
    - User prompt: Conversation History section (always), Contact & Lead section (always, omit null fields), Calendar Availability section (only if slots provided), Listing Context section (only if listing data provided)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 7.2 Write property test for prompt section structure (Property 10)
    - **Property 10: Prompt Section Structure**
    - **Validates: Requirements 1.3, 8.1, 8.4, 10.3**
    - Create `apps/web/src/lib/ai/__tests__/prompt-builder.property.test.ts`
    - For any combination of inputs: always has Conversation History + Contact sections; Calendar section iff slots non-empty; Listing section iff listing data non-null; only non-null lead fields included

  - [x] 7.3 Implement LLM response parser
    - Create `apps/web/src/lib/ai/response-parser.ts`
    - Implement `parseSuggestionResponse(raw: string): Suggestion[]`
    - Parse JSON, validate each suggestion object (text required, non-empty, ≤300 chars)
    - Strip invalid category values, exclude malformed suggestions
    - Return empty array if <2 valid suggestions, cap at 4
    - _Requirements: 1.5, 1.8, 6.6, 10.6, 10.8_

  - [x] 7.4 Write property test for LLM response validation (Property 1)
    - **Property 1: LLM Response Validation Pipeline**
    - **Validates: Requirements 1.5, 1.8, 6.6, 10.6, 10.8**
    - Create `apps/web/src/lib/ai/__tests__/response-parser.property.test.ts`
    - Test invalid JSON → empty array; missing/empty text → excluded; >300 chars → excluded; invalid category → stripped; <2 valid → empty; >4 valid → first 4

- [x] 8. Implement suggestion engine and API route
  - [x] 8.1 Install OpenAI SDK dependency
    - Add `openai` package to `apps/web/package.json`
    - Add `OPENAI_API_KEY` to `.env.example`
    - _Requirements: 10.7_

  - [x] 8.2 Implement suggestion engine
    - Create `apps/web/src/lib/ai/suggestion-engine.ts`
    - Implement `generateSuggestions(input: SuggestionEngineInput): Promise<Suggestion[]>`
    - Orchestrate: fetch messages, fetch contact/lead, detect scheduling intent, fetch calendar slots (if applicable), fetch follow-up context, build prompt, call OpenAI, parse response
    - Use GPT-4o-mini with temperature 0.7
    - Implement 10-second timeout on LLM call with AbortController
    - Return empty array on any failure (graceful degradation)
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 3.1, 5.1, 5.2, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.6, 9.7_

  - [x] 8.3 Implement POST /api/messages/suggestions route
    - Create `apps/web/src/app/api/messages/suggestions/route.ts`
    - Validate auth (401), validate contact_id presence (400), validate tenant ownership (403)
    - Call suggestion engine with validated inputs
    - Implement 15-second overall timeout returning empty suggestions
    - Return 200 with suggestions array (0–4 items)
    - Handle invalid listing_context_id gracefully (ignore, generate without)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8, 9.1, 9.5_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement listing search and follow-up context
  - [x] 10.1 Implement listing search filter utility
    - Create `apps/web/src/lib/ai/listing-search.ts`
    - Implement `filterListings(listings: Listing[], query: string): Listing[]`
    - Only include listings with status "live"
    - Apply case-insensitive substring match on address, district, or property_type when query ≥2 chars
    - _Requirements: 4.2, 4.10_

  - [x] 10.2 Write property test for listing search filtering (Property 7)
    - **Property 7: Listing Search Filtering**
    - **Validates: Requirements 4.2**
    - Create `apps/web/src/lib/ai/__tests__/listing-search.property.test.ts`
    - For query <2 chars: all live listings returned; for query ≥2: only live listings matching address/district/property_type; never non-live listings

  - [x] 10.3 Implement follow-up context persistence
    - Add upsert/fetch/delete functions for `conversation_listing_context` table in the suggestion engine or a dedicated module
    - Implement `upsertFollowUpContext(tenantId, contactId, listingId)` — inserts or replaces
    - Implement `getFollowUpContext(tenantId, contactId)` — fetches current listing context
    - Implement `clearFollowUpContext(tenantId, contactId)` — removes context
    - Verify listing still exists and belongs to tenant before returning context
    - _Requirements: 4.8, 5.3, 5.4, 5.7, 9.6_

- [x] 11. Implement UI components
  - [x] 11.1 Implement SuggestionPanel component
    - Create `apps/web/src/components/messages/suggestion-panel.tsx`
    - Accept props: contactId, messages, onInsertText, onSendMessage
    - Fetch suggestions from `/api/messages/suggestions` on mount when last message is inbound
    - Re-fetch when new inbound message arrives (detect via messages prop change)
    - Display suggestion chips (horizontally wrapping) with truncated text (80 chars)
    - On chip tap: call onInsertText with full suggestion text
    - Include refresh button (disabled while loading), dismiss button (close icon)
    - Show loading indicator while fetching
    - Hide panel when no suggestions or dismissed
    - Clear suggestions when message is sent
    - _Requirements: 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [x] 11.2 Implement ListingSearchModal component
    - Create `apps/web/src/components/messages/listing-search-modal.tsx`
    - Accept props: isOpen, onClose, onSelectListing, tenantId
    - Fetch live listings from Supabase on open
    - Client-side search filtering with 2-char minimum input
    - Display matching listings with key details
    - On selection: format snippet using `formatListingSnippet`, call onSelectListing with snippet and listingId
    - Show empty state when no results match
    - _Requirements: 4.1, 4.2, 4.10_

  - [x] 11.3 Integrate SuggestionPanel into ChatThread
    - Modify `apps/web/src/components/messages/chat-thread.tsx`
    - Remove the hardcoded mock "SUGGESTED REPLY" section
    - Add SuggestionPanel between messages area and composer
    - Wire onInsertText to set inputValue and place cursor at end
    - Wire onSendMessage to handleSend
    - Add "Insert Listing" button to SuggestionPanel that opens ListingSearchModal
    - Handle listing selection: insert snippet into composer using `insertSnippetIntoComposer`, persist follow-up context via API
    - _Requirements: 2.2, 2.3, 4.1, 4.5, 4.6, 4.8_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The OpenAI SDK is the only new dependency; all other integrations use existing libraries
- The `OPENAI_API_KEY` environment variable must be configured before testing the suggestion engine
- The existing mock suggestion in chat-thread.tsx is replaced in task 11.3

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "2.3", "2.7"] },
    { "id": 1, "tasks": ["2.2", "2.4", "2.5", "2.8", "4.1", "5.1", "5.3", "5.5"] },
    { "id": 2, "tasks": ["2.6", "4.2", "4.3", "5.2", "5.4", "5.6"] },
    { "id": 3, "tasks": ["4.4", "7.1", "7.3", "10.1"] },
    { "id": 4, "tasks": ["7.2", "7.4", "10.2", "8.1"] },
    { "id": 5, "tasks": ["8.2", "10.3"] },
    { "id": 6, "tasks": ["8.3"] },
    { "id": 7, "tasks": ["11.1", "11.2"] },
    { "id": 8, "tasks": ["11.3"] }
  ]
}
```
