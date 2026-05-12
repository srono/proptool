import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterContacts } from '../utils';
import { normalizePhone } from '@/lib/services/contact-service';
import type { ContactListItem, ContactStatus } from '../contacts-types';

// Feature: contacts-list-page, Property 6: Combined filter satisfies both constraints

/**
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * For any combination of a non-empty search term and a status filter (other than "All"),
 * every contact in the filtered results SHALL satisfy both the search match condition
 * (Property 4) AND the status match condition (Property 5) simultaneously.
 */

const CONTACT_STATUSES: ContactStatus[] = ['active', 'inactive', 'archived', 'do_not_contact'];

// Generator for ISO timestamp strings within a reasonable range
const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2030-12-31T23:59:59Z').getTime();

const arbTimestamp = fc
  .integer({ min: MIN_TS, max: MAX_TS })
  .map((ms) => new Date(ms).toISOString());

const arbNullableTimestamp = fc.option(arbTimestamp, { nil: null });

// Generator for a ContactListItem with realistic phone numbers
const arbPhone = fc
  .integer({ min: 80000000, max: 99999999 })
  .map((n) => `+65 ${String(n).slice(0, 4)} ${String(n).slice(4)}`);

const arbContact: fc.Arbitrary<ContactListItem> = fc.record({
  id: fc.uuid(),
  full_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  phone: arbPhone,
  contact_status: fc.constantFrom(...CONTACT_STATUSES),
  last_contacted_at: arbNullableTimestamp,
  last_inbound_at: arbNullableTimestamp,
  updated_at: arbTimestamp,
});

// Generator for an array of contacts (0 to 80 to test beyond the 50 cap)
const arbContacts = fc.array(arbContact, { minLength: 0, maxLength: 80 });

// Generator for a non-empty search term
const arbSearchTerm = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

/**
 * Helper: checks if a contact matches the search term (same logic as filterBySearch)
 */
function matchesSearch(contact: ContactListItem, term: string): boolean {
  const lowerTerm = term.toLowerCase();
  const digitTerm = term.replace(/\D/g, '');

  if (contact.full_name.toLowerCase().includes(lowerTerm)) {
    return true;
  }

  if (digitTerm) {
    const normalizedDigits = normalizePhone(contact.phone).replace(/\D/g, '');
    if (normalizedDigits.includes(digitTerm)) {
      return true;
    }
  }

  return false;
}

describe('Feature: contacts-list-page, Property 6: Combined filter satisfies both constraints', () => {
  it('every contact in filterContacts output satisfies both search and status predicates simultaneously', () => {
    fc.assert(
      fc.property(
        arbContacts,
        arbSearchTerm,
        fc.constantFrom(...CONTACT_STATUSES),
        (contacts, searchTerm, status) => {
          const result = filterContacts(contacts, searchTerm, status);

          for (const contact of result) {
            // Must satisfy status predicate
            expect(contact.contact_status).toBe(status);

            // Must satisfy search predicate
            expect(matchesSearch(contact, searchTerm)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when status is "all", every contact in output still satisfies the search predicate', () => {
    fc.assert(
      fc.property(
        arbContacts,
        arbSearchTerm,
        (contacts, searchTerm) => {
          const result = filterContacts(contacts, searchTerm, 'all');

          for (const contact of result) {
            expect(matchesSearch(contact, searchTerm)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when search is empty, every contact in output still satisfies the status predicate', () => {
    fc.assert(
      fc.property(
        arbContacts,
        fc.constantFrom(...CONTACT_STATUSES),
        (contacts, status) => {
          const result = filterContacts(contacts, '', status);

          for (const contact of result) {
            expect(contact.contact_status).toBe(status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no contact satisfying both predicates is excluded (up to the 50 cap)', () => {
    fc.assert(
      fc.property(
        arbContacts,
        arbSearchTerm,
        fc.constantFrom(...CONTACT_STATUSES),
        (contacts, searchTerm, status) => {
          const result = filterContacts(contacts, searchTerm, status);
          const resultIds = new Set(result.map((c) => c.id));

          // Find all contacts that satisfy both predicates
          const expectedMatches = contacts.filter(
            (c) => c.contact_status === status && matchesSearch(c, searchTerm)
          );

          // The result should contain all matches up to the 50 cap (in order)
          const expectedCapped = expectedMatches.slice(0, 50);
          expect(result.length).toBe(expectedCapped.length);

          for (const contact of expectedCapped) {
            expect(resultIds.has(contact.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
