import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterContacts } from '../utils';
import type { ContactListItem, ContactStatus } from '../contacts-types';

// Feature: contacts-list-page, Property 1: Contacts are ordered by descending updated_at

/**
 * Validates: Requirements 2.1
 *
 * For any list of contacts passed to the filtering/display logic,
 * the output order SHALL always be sorted by updated_at in descending order
 * (most recent first). The server provides pre-sorted data, and filterContacts
 * must preserve that ordering.
 */

const CONTACT_STATUSES: ContactStatus[] = ['active', 'inactive', 'archived', 'do_not_contact'];

// Generator for ISO timestamp strings within a reasonable range
const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2030-12-31T23:59:59Z').getTime();

const arbTimestamp = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

const arbNullableTimestamp = fc.option(arbTimestamp, { nil: null });

// Generator for a ContactListItem
const arbContact: fc.Arbitrary<ContactListItem> = fc.record({
  id: fc.uuid(),
  full_name: fc.string({ minLength: 1, maxLength: 50 }),
  phone: fc.string({ minLength: 5, maxLength: 20 }),
  contact_status: fc.constantFrom(...CONTACT_STATUSES),
  last_contacted_at: arbNullableTimestamp,
  last_inbound_at: arbNullableTimestamp,
  updated_at: arbTimestamp,
});

/**
 * Generates an array of contacts pre-sorted by updated_at descending,
 * simulating the server-provided ordering.
 */
const arbSortedContacts = fc
  .array(arbContact, { minLength: 0, maxLength: 80 })
  .map((contacts) =>
    [...contacts].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  );

describe('Feature: contacts-list-page, Property 1: Contacts are ordered by descending updated_at', () => {
  it('filterContacts preserves descending updated_at order when no filters are applied', () => {
    fc.assert(
      fc.property(arbSortedContacts, (sortedContacts) => {
        const result = filterContacts(sortedContacts, '', 'all');

        // Verify the output maintains descending updated_at order
        for (let i = 1; i < result.length; i++) {
          const prevTime = new Date(result[i - 1].updated_at).getTime();
          const currTime = new Date(result[i].updated_at).getTime();
          expect(prevTime).toBeGreaterThanOrEqual(currTime);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('filterContacts preserves descending updated_at order when status filter is applied', () => {
    fc.assert(
      fc.property(
        arbSortedContacts,
        fc.constantFrom(...CONTACT_STATUSES),
        (sortedContacts, status) => {
          const result = filterContacts(sortedContacts, '', status);

          // Verify the output maintains descending updated_at order
          for (let i = 1; i < result.length; i++) {
            const prevTime = new Date(result[i - 1].updated_at).getTime();
            const currTime = new Date(result[i].updated_at).getTime();
            expect(prevTime).toBeGreaterThanOrEqual(currTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterContacts preserves descending updated_at order when search term is applied', () => {
    fc.assert(
      fc.property(
        arbSortedContacts,
        fc.string({ minLength: 1, maxLength: 10 }),
        (sortedContacts, searchTerm) => {
          const result = filterContacts(sortedContacts, searchTerm, 'all');

          // Verify the output maintains descending updated_at order
          for (let i = 1; i < result.length; i++) {
            const prevTime = new Date(result[i - 1].updated_at).getTime();
            const currTime = new Date(result[i].updated_at).getTime();
            expect(prevTime).toBeGreaterThanOrEqual(currTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterContacts preserves descending updated_at order when both search and status filter are applied', () => {
    fc.assert(
      fc.property(
        arbSortedContacts,
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.constantFrom(...CONTACT_STATUSES),
        (sortedContacts, searchTerm, status) => {
          const result = filterContacts(sortedContacts, searchTerm, status);

          // Verify the output maintains descending updated_at order
          for (let i = 1; i < result.length; i++) {
            const prevTime = new Date(result[i - 1].updated_at).getTime();
            const currTime = new Date(result[i].updated_at).getTime();
            expect(prevTime).toBeGreaterThanOrEqual(currTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
