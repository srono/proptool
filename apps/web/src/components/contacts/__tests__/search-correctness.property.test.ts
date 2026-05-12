import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterBySearch } from '../utils';
import { normalizePhone } from '@/lib/services/contact-service';
import type { ContactListItem, ContactStatus } from '../contacts-types';

// Feature: contacts-list-page, Property 4: Search results match the search term

/**
 * Validates: Requirements 3.2
 *
 * For any non-empty search term and any contact dataset, every contact in the
 * filtered results SHALL have either its full_name (case-insensitive) or its
 * phone number (digits only, ignoring formatting) contain the search term as
 * a substring.
 */

const CONTACT_STATUSES: ContactStatus[] = ['active', 'inactive', 'archived', 'do_not_contact'];

const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2030-12-31T23:59:59Z').getTime();

const arbTimestamp = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

const arbNullableTimestamp = fc.option(arbTimestamp, { nil: null });

// Generator for phone numbers with realistic formatting characters
const arbPhone = fc
  .tuple(
    fc.constantFrom('+65', '+1', '+44', '+60', ''),
    fc.string({ minLength: 4, maxLength: 12, unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-', '(', ')') })
  )
  .map(([prefix, rest]) => prefix + rest);

// Generator for a ContactListItem
const arbContact: fc.Arbitrary<ContactListItem> = fc.record({
  id: fc.uuid(),
  full_name: fc.string({ minLength: 1, maxLength: 50 }),
  phone: arbPhone,
  contact_status: fc.constantFrom(...CONTACT_STATUSES),
  last_contacted_at: arbNullableTimestamp,
  last_inbound_at: arbNullableTimestamp,
  updated_at: arbTimestamp,
});

// Generator for a non-empty search term (trimmed)
const arbSearchTerm = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

describe('Feature: contacts-list-page, Property 4: Search results match the search term', () => {
  it('every contact in filterBySearch output matches the search term in full_name or normalized phone', () => {
    fc.assert(
      fc.property(
        fc.array(arbContact, { minLength: 0, maxLength: 30 }),
        arbSearchTerm,
        (contacts, term) => {
          const result = filterBySearch(contacts, term);
          const lowerTerm = term.toLowerCase();
          const digitTerm = term.replace(/\D/g, '');

          for (const contact of result) {
            const nameMatches = contact.full_name.toLowerCase().includes(lowerTerm);
            const phoneDigits = normalizePhone(contact.phone).replace(/\D/g, '');
            const phoneMatches = digitTerm.length > 0 && phoneDigits.includes(digitTerm);

            expect(nameMatches || phoneMatches).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterBySearch returns all contacts when search term is empty or whitespace', () => {
    fc.assert(
      fc.property(
        fc.array(arbContact, { minLength: 0, maxLength: 30 }),
        fc.constantFrom('', '   ', '\t'),
        (contacts, term) => {
          const result = filterBySearch(contacts, term);
          expect(result.length).toBe(contacts.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('contacts whose full_name contains the search term (case-insensitive) are always included', () => {
    // Generate contacts where at least one has a name containing the search term
    fc.assert(
      fc.property(
        fc.array(arbContact, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
        (contacts, term) => {
          // Inject the term into the first contact's name to guarantee a match
          const injectedContacts = [
            { ...contacts[0], full_name: `Prefix${term}Suffix` },
            ...contacts.slice(1),
          ];

          const result = filterBySearch(injectedContacts, term);
          const resultIds = result.map((c) => c.id);

          // The injected contact must be in the results
          expect(resultIds).toContain(injectedContacts[0].id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('contacts whose normalized phone digits contain the digit-only search term are included', () => {
    fc.assert(
      fc.property(
        fc.array(arbContact, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 5, unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9') }),
        (contacts, digitTerm) => {
          // Inject the digit term into the first contact's phone
          const injectedContacts = [
            { ...contacts[0], phone: `+65${digitTerm}1234`, full_name: 'NoMatchName' },
            ...contacts.slice(1),
          ];

          const result = filterBySearch(injectedContacts, digitTerm);
          const resultIds = result.map((c) => c.id);

          // The injected contact must be in the results (phone digits contain the term)
          expect(resultIds).toContain(injectedContacts[0].id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
