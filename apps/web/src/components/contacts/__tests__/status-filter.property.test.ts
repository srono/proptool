import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterByStatus } from '../utils';
import type { ContactListItem, ContactStatus } from '../contacts-types';

// Feature: contacts-list-page, Property 5: Status filter returns only matching contacts

/**
 * Validates: Requirements 4.2, 4.3
 *
 * For any selected status filter value (other than "All") and any contact dataset,
 * every contact in the filtered results SHALL have a contact_status equal to the
 * selected filter value. When "All" is selected, contacts of any status SHALL be included.
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

// Generator for an array of contacts (0 to 80 to test beyond the 50 cap)
const arbContacts = fc.array(arbContact, { minLength: 0, maxLength: 80 });

describe('Feature: contacts-list-page, Property 5: Status filter returns only matching contacts', () => {
  it('every contact in filterByStatus output has matching contact_status when a specific status is selected', () => {
    fc.assert(
      fc.property(
        arbContacts,
        fc.constantFrom(...CONTACT_STATUSES),
        (contacts, status) => {
          const result = filterByStatus(contacts, status);

          // Every contact in the result must have the selected status
          for (const contact of result) {
            expect(contact.contact_status).toBe(status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when "all" is selected, filterByStatus returns all contacts regardless of status', () => {
    fc.assert(
      fc.property(arbContacts, (contacts) => {
        const result = filterByStatus(contacts, 'all');

        // All contacts should be included
        expect(result.length).toBe(contacts.length);

        // Every original contact should be present in the result
        for (const contact of contacts) {
          expect(result).toContain(contact);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('no contact matching the selected status is excluded from the result', () => {
    fc.assert(
      fc.property(
        arbContacts,
        fc.constantFrom(...CONTACT_STATUSES),
        (contacts, status) => {
          const result = filterByStatus(contacts, status);
          const resultIds = new Set(result.map((c) => c.id));

          // Every contact in the original list with the matching status must be in the result
          for (const contact of contacts) {
            if (contact.contact_status === status) {
              expect(resultIds.has(contact.id)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('contacts not matching the selected status are excluded from the result', () => {
    fc.assert(
      fc.property(
        arbContacts,
        fc.constantFrom(...CONTACT_STATUSES),
        (contacts, status) => {
          const result = filterByStatus(contacts, status);
          const resultIds = new Set(result.map((c) => c.id));

          // No contact with a different status should be in the result
          for (const contact of contacts) {
            if (contact.contact_status !== status) {
              expect(resultIds.has(contact.id)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
