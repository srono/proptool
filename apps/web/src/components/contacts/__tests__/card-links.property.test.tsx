// Feature: contacts-list-page, Property 7: Contact cards link to correct profile with accessible name

import React from 'react';
import { render, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ContactCard } from '../contact-card';
import type { ContactListItem, ContactStatus } from '../contacts-types';

// Mock next/link to render a plain <a> that passes through all props
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// --- Generators ---

const contactStatusArb: fc.Arbitrary<ContactStatus> = fc.constantFrom(
  'active',
  'inactive',
  'archived',
  'do_not_contact'
);

// Generate realistic full names (letters and spaces, no leading/trailing whitespace)
const fullNameArb = fc
  .tuple(
    fc.stringMatching(/^[A-Za-z]+$/),
    fc.stringMatching(/^[A-Za-z]+$/)
  )
  .map(([first, last]) => `${first} ${last}`)
  .filter((s) => s.length >= 3 && s.length <= 80);

const contactArb: fc.Arbitrary<ContactListItem> = fc.record({
  id: fc.uuid(),
  full_name: fullNameArb,
  phone: fc
    .string({ minLength: 8, maxLength: 15 })
    .map((s) => s.replace(/[^0-9]/g, '5').slice(0, 10)),
  contact_status: contactStatusArb,
  last_contacted_at: fc.oneof(fc.constant(null), fc.constant('2024-06-15T10:00:00Z')),
  last_inbound_at: fc.oneof(fc.constant(null), fc.constant('2024-07-01T12:00:00Z')),
  updated_at: fc.constant('2024-08-01T00:00:00Z'),
});

/**
 * **Validates: Requirements 5.1, 5.2**
 *
 * Property 7: Contact cards link to correct profile with accessible name
 *
 * For any contact displayed in the list, the rendered card SHALL link to
 * `/contacts/{contact.id}` and SHALL have an accessible name that contains
 * the contact's `full_name`.
 */
describe('Feature: contacts-list-page, Property 7: Contact cards link to correct profile with accessible name', () => {
  it('rendered card links to /contacts/{contact.id} and has accessible name containing full_name', () => {
    fc.assert(
      fc.property(contactArb, (contact) => {
        const { container, unmount } = render(<ContactCard contact={contact} />);

        const link = within(container).getByRole('link');

        // Verify href points to the correct profile URL
        expect(link).toHaveAttribute('href', `/contacts/${contact.id}`);

        // Verify accessible name contains the contact's full_name
        const accessibleName = link.getAttribute('aria-label') ?? '';
        expect(accessibleName).toContain(contact.full_name);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
