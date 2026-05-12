// Feature: contacts-list-page, Property 3: Display is capped at 50 contacts

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterContacts } from '../utils';
import type { ContactListItem, ContactStatus } from '../contacts-types';

// --- Generators ---

const contactStatusArb: fc.Arbitrary<ContactStatus> = fc.constantFrom(
  'active',
  'inactive',
  'archived',
  'do_not_contact'
);

const statusFilterArb: fc.Arbitrary<ContactStatus | 'all'> = fc.constantFrom(
  'all',
  'active',
  'inactive',
  'archived',
  'do_not_contact'
);

const contactArb: fc.Arbitrary<ContactListItem> = fc.record({
  id: fc.uuid(),
  full_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  phone: fc.string({ minLength: 8, maxLength: 15 }).map((s) => s.replace(/[^0-9]/g, '5').slice(0, 10)),
  contact_status: contactStatusArb,
  last_contacted_at: fc.oneof(fc.constant(null), fc.constant('2024-06-15T10:00:00Z')),
  last_inbound_at: fc.oneof(fc.constant(null), fc.constant('2024-07-01T12:00:00Z')),
  updated_at: fc.constant('2024-08-01T00:00:00Z'),
});

const searchTermArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 20 })
);

/**
 * **Validates: Requirements 2.5, 4.5**
 *
 * Property 3: Display is capped at 50 contacts
 *
 * For any contact dataset of any size, after applying all filters,
 * the number of contacts displayed SHALL never exceed 50.
 */
describe('Feature: contacts-list-page, Property 3: Display is capped at 50 contacts', () => {
  it('filterContacts output length never exceeds 50 for any input size', () => {
    fc.assert(
      fc.property(
        fc.array(contactArb, { minLength: 0, maxLength: 200 }),
        searchTermArb,
        statusFilterArb,
        (contacts, searchTerm, statusFilter) => {
          const result = filterContacts(contacts, searchTerm, statusFilter);
          expect(result.length).toBeLessThanOrEqual(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterContacts caps at exactly 50 when more than 50 contacts match', () => {
    fc.assert(
      fc.property(
        fc.array(contactArb, { minLength: 51, maxLength: 200 }),
        (contacts) => {
          // Use empty search and "all" status to ensure all contacts pass filters
          const result = filterContacts(contacts, '', 'all');
          expect(result.length).toBe(50);
        }
      ),
      { numRuns: 100 }
    );
  });
});
