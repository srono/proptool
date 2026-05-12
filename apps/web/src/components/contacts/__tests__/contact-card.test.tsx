import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContactCard } from '../contact-card';
import type { ContactListItem } from '../contacts-types';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function makeContact(overrides: Partial<ContactListItem> = {}): ContactListItem {
  return {
    id: 'contact-abc-123',
    full_name: 'Jane Smith',
    phone: '+1 (555) 123-4567',
    contact_status: 'active',
    last_contacted_at: '2025-01-15T10:00:00Z',
    last_inbound_at: '2025-01-10T08:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
    ...overrides,
  };
}

describe('ContactCard', () => {
  describe('Navigation link (Req 5.1, 5.2)', () => {
    it('renders a link with href /contacts/{id}', () => {
      render(<ContactCard contact={makeContact({ id: 'xyz-789' })} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/contacts/xyz-789');
    });

    it('has an accessible name derived from full_name', () => {
      render(<ContactCard contact={makeContact({ full_name: 'Alice Johnson' })} />);
      const link = screen.getByRole('link', { name: 'Alice Johnson' });
      expect(link).toBeInTheDocument();
    });
  });

  describe('Last activity display (Req 2.2, 2.3)', () => {
    it('displays "—" when both activity dates are null', () => {
      render(
        <ContactCard
          contact={makeContact({
            last_contacted_at: null,
            last_inbound_at: null,
          })}
        />
      );
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('displays formatted date when last_contacted_at is present', () => {
      render(
        <ContactCard
          contact={makeContact({
            last_contacted_at: '2025-01-15T10:00:00Z',
            last_inbound_at: null,
          })}
        />
      );
      expect(screen.getByText('15 Jan 2025')).toBeInTheDocument();
    });
  });

  describe('Hover border highlight (Req 5.3)', () => {
    it('has hover:border-brand/50 class on the link', () => {
      render(<ContactCard contact={makeContact()} />);
      const link = screen.getByRole('link');
      expect(link.className).toContain('hover:border-brand/50');
    });

    it('has transition-colors class for smooth hover effect', () => {
      render(<ContactCard contact={makeContact()} />);
      const link = screen.getByRole('link');
      expect(link.className).toContain('transition-colors');
    });
  });

  describe('Status badge (Req 5.2)', () => {
    it('renders active status with green color class', () => {
      render(<ContactCard contact={makeContact({ contact_status: 'active' })} />);
      const badge = screen.getByText('Active');
      expect(badge.className).toContain('text-status-green');
    });

    it('renders inactive status with gray color class', () => {
      render(<ContactCard contact={makeContact({ contact_status: 'inactive' })} />);
      const badge = screen.getByText('Inactive');
      expect(badge.className).toContain('text-gray-2');
    });

    it('renders archived status with amber color class', () => {
      render(<ContactCard contact={makeContact({ contact_status: 'archived' })} />);
      const badge = screen.getByText('Archived');
      expect(badge.className).toContain('text-status-amber');
    });

    it('renders do_not_contact status with red color class', () => {
      render(<ContactCard contact={makeContact({ contact_status: 'do_not_contact' })} />);
      const badge = screen.getByText('Do Not Contact');
      expect(badge.className).toContain('text-status-red');
    });
  });
});
