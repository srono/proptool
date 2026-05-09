import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildSuggestionPrompt,
  type PromptBuilderInput,
  type ConversationContext,
  type TimeSlot,
  type ListingContextData,
} from '../prompt-builder';

/**
 * Feature: ai-reply-suggestions, Property 10: Prompt Section Structure
 *
 * Validates: Requirements 1.3, 8.1, 8.4, 10.3
 *
 * For any combination of context inputs (calendar slots present/absent, listing context
 * present/absent, lead present/absent), the built user prompt SHALL:
 * (a) always contain a "Conversation History" section;
 * (b) always contain a "Contact" section with the contact's full name;
 * (c) contain a "Calendar Availability" section if and only if calendar slots are provided (non-empty array);
 * (d) contain a "Listing Context" section if and only if listing context data is provided (non-null);
 * (e) include only non-null lead fields in the contact/lead section.
 */

// --- Generators ---

const arbDirection = fc.constantFrom('inbound' as const, 'outbound' as const);

const arbMessage = fc.record({
  direction: arbDirection,
  body: fc.string({ minLength: 1, maxLength: 200 }),
  relativeTime: fc.constantFrom('1 hour ago', '2 hours ago', '5 minutes ago', 'just now', '3 days ago'),
});

const arbContact = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
});

const arbTimeSlot: fc.Arbitrary<TimeSlot> = fc.record({
  start: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map((d) => d.toISOString()),
  end: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map((d) => d.toISOString()),
  formatted: fc.string({ minLength: 5, maxLength: 50 }),
});

const arbLead = fc.record({
  dealType: fc.string({ minLength: 1, maxLength: 30 }),
  budgetMin: fc.option(fc.integer({ min: 100000, max: 10000000 }), { nil: null }),
  budgetMax: fc.option(fc.integer({ min: 100000, max: 10000000 }), { nil: null }),
  preferredDistricts: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 5 }),
  propertyTypes: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
});

const arbListingContext: fc.Arbitrary<ListingContextData> = fc.record({
  listingId: fc.uuid(),
  address: fc.string({ minLength: 1, maxLength: 100 }),
  district: fc.string({ minLength: 1, maxLength: 10 }),
  propertyType: fc.string({ minLength: 1, maxLength: 30 }),
  tenure: fc.string({ minLength: 1, maxLength: 30 }),
  floorAreaSqft: fc.integer({ min: 100, max: 50000 }),
  askingPrice: fc.option(fc.integer({ min: 100000, max: 50000000 }), { nil: null }),
  askingRental: fc.option(fc.integer({ min: 500, max: 50000 }), { nil: null }),
  psf: fc.option(fc.integer({ min: 100, max: 10000 }), { nil: null }),
  floor: fc.option(fc.string({ minLength: 1, maxLength: 5 }), { nil: null }),
  unitNumber: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
  completionYear: fc.option(fc.integer({ min: 1960, max: 2030 }), { nil: null }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
});

// Generator for ConversationContext with all optional fields
function arbConversationContext(options: {
  withCalendarSlots: 'present' | 'absent' | 'random';
  withListingContext: 'present' | 'absent' | 'random';
  withLead: 'present' | 'absent' | 'random';
}): fc.Arbitrary<ConversationContext> {
  const calendarSlotsArb =
    options.withCalendarSlots === 'present'
      ? fc.array(arbTimeSlot, { minLength: 1, maxLength: 3 })
      : options.withCalendarSlots === 'absent'
        ? fc.constant(undefined as TimeSlot[] | undefined)
        : fc.oneof(
            fc.array(arbTimeSlot, { minLength: 1, maxLength: 3 }),
            fc.constant(undefined as TimeSlot[] | undefined),
            fc.constant([] as TimeSlot[])
          );

  const listingContextArb =
    options.withListingContext === 'present'
      ? arbListingContext
      : options.withListingContext === 'absent'
        ? fc.constant(undefined as ListingContextData | undefined)
        : fc.option(arbListingContext, { nil: undefined });

  const leadArb =
    options.withLead === 'present'
      ? arbLead
      : options.withLead === 'absent'
        ? fc.constant(undefined as ConversationContext['lead'] | undefined)
        : fc.option(arbLead, { nil: undefined });

  return fc.record({
    messages: fc.array(arbMessage, { minLength: 1, maxLength: 10 }),
    contact: arbContact,
    lead: leadArb,
    calendarSlots: calendarSlotsArb,
    listingContext: listingContextArb,
  });
}

// Generator for full PromptBuilderInput
function arbPromptBuilderInput(contextOptions: {
  withCalendarSlots: 'present' | 'absent' | 'random';
  withListingContext: 'present' | 'absent' | 'random';
  withLead: 'present' | 'absent' | 'random';
}): fc.Arbitrary<PromptBuilderInput> {
  return fc.record({
    conversationContext: arbConversationContext(contextOptions),
    hasSchedulingIntent: fc.boolean(),
  });
}

describe('Feature: ai-reply-suggestions, Property 10: Prompt Section Structure', () => {
  it('(a) always contains a "Conversation History" section', () => {
    fc.assert(
      fc.property(
        arbPromptBuilderInput({ withCalendarSlots: 'random', withListingContext: 'random', withLead: 'random' }),
        (input) => {
          const result = buildSuggestionPrompt(input);
          expect(result.userPrompt).toContain('## Conversation History');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(b) always contains a "Contact" section with the contact\'s full name', () => {
    fc.assert(
      fc.property(
        arbPromptBuilderInput({ withCalendarSlots: 'random', withListingContext: 'random', withLead: 'random' }),
        (input) => {
          const result = buildSuggestionPrompt(input);
          const { firstName, lastName } = input.conversationContext.contact;

          // Must contain the Contact & Lead Context section header
          expect(result.userPrompt).toContain('## Contact & Lead Context');

          // Must contain the full name
          expect(result.userPrompt).toContain(`Name: ${firstName} ${lastName}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(c) contains a "Calendar Availability" section if and only if calendar slots are non-empty', () => {
    fc.assert(
      fc.property(
        arbPromptBuilderInput({ withCalendarSlots: 'random', withListingContext: 'random', withLead: 'random' }),
        (input) => {
          const result = buildSuggestionPrompt(input);
          const slots = input.conversationContext.calendarSlots;
          const hasNonEmptySlots = slots !== undefined && slots.length > 0;

          if (hasNonEmptySlots) {
            expect(result.userPrompt).toContain('## Calendar Availability');
          } else {
            expect(result.userPrompt).not.toContain('## Calendar Availability');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(d) contains a "Listing Context" section if and only if listing context data is non-null', () => {
    fc.assert(
      fc.property(
        arbPromptBuilderInput({ withCalendarSlots: 'random', withListingContext: 'random', withLead: 'random' }),
        (input) => {
          const result = buildSuggestionPrompt(input);
          const hasListing = input.conversationContext.listingContext !== undefined;

          if (hasListing) {
            expect(result.userPrompt).toContain('## Listing Context');
          } else {
            expect(result.userPrompt).not.toContain('## Listing Context');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('(e) includes only non-null lead fields in the contact/lead section', () => {
    fc.assert(
      fc.property(
        arbPromptBuilderInput({ withCalendarSlots: 'random', withListingContext: 'random', withLead: 'random' }),
        (input) => {
          const result = buildSuggestionPrompt(input);
          const lead = input.conversationContext.lead;

          if (!lead) {
            // No lead: should not contain lead-specific fields
            expect(result.userPrompt).not.toContain('Deal type:');
            expect(result.userPrompt).not.toContain('Budget:');
            expect(result.userPrompt).not.toContain('Preferred districts:');
            expect(result.userPrompt).not.toContain('Property types:');
          } else {
            // Lead present: check each field individually

            // dealType is always a non-empty string in our generator, so it should be present
            if (lead.dealType) {
              expect(result.userPrompt).toContain(`Deal type: ${lead.dealType}`);
            }

            // budgetMin/budgetMax: only included if at least one is non-null
            if (lead.budgetMin === null && lead.budgetMax === null) {
              expect(result.userPrompt).not.toContain('Budget:');
            } else {
              expect(result.userPrompt).toContain('Budget:');
            }

            // preferredDistricts: only included if non-empty array
            if (lead.preferredDistricts.length === 0) {
              expect(result.userPrompt).not.toContain('Preferred districts:');
            } else {
              expect(result.userPrompt).toContain('Preferred districts:');
            }

            // propertyTypes: only included if non-empty array
            if (lead.propertyTypes.length === 0) {
              expect(result.userPrompt).not.toContain('Property types:');
            } else {
              expect(result.userPrompt).toContain('Property types:');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
