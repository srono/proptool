import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContactsClientShell } from '../contacts-client-shell';
import type { ContactListItem } from '../contacts-types';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function makeContact(overrides: Partial<ContactListItem> = {}): ContactListItem {
  return {
    id: 'contact-1',
    full_name: 'Jane Smith',
    phone: '+1 (555) 123-4567',
    contact_status: 'active',
    last_contacted_at: '2025-01-15T10:00:00Z',
    last_inbound_at: '2025-01-10T08:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
    ...overrides,
  };
}

describe('ContactsClientShell', () => {
  describe('Search input (Req 3.1, 3.4)', () => {
    it('has maxLength=100', () => {
      render(<ContactsClientShell contacts={[makeContact()]} />);
      const input = screen.getByLabelText('Search contacts');
      expect(input).toHaveAttribute('maxLength', '100');
    });

    it('has aria-label "Search contacts"', () => {
      render(<ContactsClientShell contacts={[makeContact()]} />);
      const input = screen.getByLabelText('Search contacts');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Status filter tabs (Req 4.1, 4.4)', () => {
    it('defaults to "All" tab selected on initial load', () => {
      render(<ContactsClientShell contacts={[makeContact()]} />);
      const allTab = screen.getByRole('button', { name: 'All' });
      expect(allTab.className).toContain('bg-aqua');
    });

    it('renders all 5 status tabs', () => {
      render(<ContactsClientShell contacts={[makeContact()]} />);
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Inactive' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Archived' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Do Not Contact' })).toBeInTheDocument();
    });
  });

  describe('Empty states (Req 2.4, 7.2)', () => {
    it('displays "No contacts yet" when contacts array is empty', () => {
      render(<ContactsClientShell contacts={[]} />);
      expect(screen.getByText('No contacts yet')).toBeInTheDocument();
    });

    it('displays "No contacts match your filters" when filters produce no results', () => {
      render(<ContactsClientShell contacts={[makeContact({ full_name: 'Jane Smith' })]} />);

      const input = screen.getByLabelText('Search contacts');
      fireEvent.change(input, { target: { value: 'zzzznonexistent' } });

      expect(screen.getByText('No contacts match your filters')).toBeInTheDocument();
    });
  });

  describe('Controls visibility in empty filter state (Req 7.4)', () => {
    it('keeps search and filter controls visible when filters produce no results', () => {
      render(<ContactsClientShell contacts={[makeContact({ full_name: 'Jane Smith' })]} />);

      const input = screen.getByLabelText('Search contacts');
      fireEvent.change(input, { target: { value: 'zzzznonexistent' } });

      // Search input should still be visible
      expect(screen.getByLabelText('Search contacts')).toBeInTheDocument();
      // Status filter tabs should still be visible
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    });
  });
});
