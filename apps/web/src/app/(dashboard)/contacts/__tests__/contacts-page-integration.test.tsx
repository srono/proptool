import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { metadata } from '../page';
import { Sidebar } from '@/components/layout/sidebar';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/navigation to simulate being on /contacts
vi.mock('next/navigation', () => ({
  usePathname: () => '/contacts',
}));

/**
 * Integration tests for the Contacts List Page.
 * Validates: Requirements 1.1, 1.2, 1.3
 */
describe('Contacts Page Integration', () => {
  describe('Metadata (Req 1.2)', () => {
    it('exports metadata with title "Contacts"', () => {
      expect(metadata).toBeDefined();
      expect(metadata.title).toBe('Contacts');
    });
  });

  describe('Sidebar navigation (Req 1.1, 1.3)', () => {
    it('renders a "Contacts" link with href="/contacts"', () => {
      render(<Sidebar />);
      const contactsLink = screen.getByRole('link', { name: /Contacts/i });
      expect(contactsLink).toBeInTheDocument();
      expect(contactsLink).toHaveAttribute('href', '/contacts');
    });

    it('marks "Contacts" link as active when pathname is /contacts', () => {
      render(<Sidebar />);
      const contactsLink = screen.getByRole('link', { name: /Contacts/i });
      // Active state applies bg-brand/[0.18] and border-brand/50 classes
      expect(contactsLink.className).toContain('bg-brand');
      expect(contactsLink.className).toContain('border-brand');
    });

    it('renders sidebar within the dashboard layout structure', () => {
      const { container } = render(<Sidebar />);
      // Sidebar renders as an <aside> element
      const aside = container.querySelector('aside');
      expect(aside).toBeInTheDocument();
      // Contains navigation with links
      const nav = aside?.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });
  });
});
