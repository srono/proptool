// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from '../sidebar';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockPathname = '/dashboard';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock fetch for badge counts
const mockBadges = {
  new_leads_count: 3,
  unread_messages_count: 5,
  overdue_tasks_count: 2,
};

beforeEach(() => {
  mockPathname = '/dashboard';
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(mockBadges),
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Sidebar', () => {
  describe('Grouped navigation renders all sections (Req 11.1)', () => {
    it('renders all four navigation group labels', () => {
      render(<Sidebar />);
      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('Clients')).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });

    it('renders all Daily group items', () => {
      render(<Sidebar />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Lead Inbox')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Nurture')).toBeInTheDocument();
    });

    it('renders all Clients group items', () => {
      render(<Sidebar />);
      expect(screen.getByText('Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Contacts')).toBeInTheDocument();
      expect(screen.getByText('Deals')).toBeInTheDocument();
    });

    it('renders all Properties group items', () => {
      render(<Sidebar />);
      expect(screen.getByText('Listings')).toBeInTheDocument();
      expect(screen.getByText('Viewings')).toBeInTheDocument();
    });

    it('renders all Tools group items', () => {
      render(<Sidebar />);
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    it('renders navigation items as links with correct hrefs', () => {
      render(<Sidebar />);
      expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
      expect(screen.getByText('Lead Inbox').closest('a')).toHaveAttribute('href', '/leads');
      expect(screen.getByText('Messages').closest('a')).toHaveAttribute('href', '/messages');
      expect(screen.getByText('Nurture').closest('a')).toHaveAttribute('href', '/nurture');
      expect(screen.getByText('Pipeline').closest('a')).toHaveAttribute('href', '/pipeline');
      expect(screen.getByText('Contacts').closest('a')).toHaveAttribute('href', '/contacts');
      expect(screen.getByText('Deals').closest('a')).toHaveAttribute('href', '/deals');
      expect(screen.getByText('Listings').closest('a')).toHaveAttribute('href', '/listings');
      expect(screen.getByText('Viewings').closest('a')).toHaveAttribute('href', '/viewings');
      expect(screen.getByText('Insights').closest('a')).toHaveAttribute('href', '/tools');
    });
  });

  describe('Active state styling (Req 11.5)', () => {
    it('applies brand-blue tinted background to active nav item', () => {
      mockPathname = '/dashboard';
      render(<Sidebar />);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toContain('bg-brand/[0.14]');
    });

    it('applies brand-blue border to active nav item', () => {
      mockPathname = '/dashboard';
      render(<Sidebar />);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toContain('border-brand/[0.38]');
    });

    it('applies white text to active nav item', () => {
      mockPathname = '/dashboard';
      render(<Sidebar />);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toContain('text-white');
    });

    it('does not apply active styling to inactive nav items', () => {
      mockPathname = '/dashboard';
      render(<Sidebar />);
      const messagesLink = screen.getByText('Messages').closest('a');
      expect(messagesLink?.className).not.toContain('bg-brand/[0.14]');
      expect(messagesLink?.className).toContain('text-gray-2');
    });

    it('applies active state to correct item when pathname changes', () => {
      mockPathname = '/nurture';
      render(<Sidebar />);
      const nurtureLink = screen.getByText('Nurture').closest('a');
      expect(nurtureLink?.className).toContain('bg-brand/[0.14]');

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).not.toContain('bg-brand/[0.14]');
    });

    it('matches sub-paths to parent nav item (startsWith matching)', () => {
      mockPathname = '/leads/some-lead-id';
      render(<Sidebar />);
      const leadInboxLink = screen.getByText('Lead Inbox').closest('a');
      expect(leadInboxLink?.className).toContain('bg-brand/[0.14]');
    });
  });

  describe('Badge count rendering (Req 11.6)', () => {
    it('renders badge counts when data is loaded', async () => {
      render(<Sidebar />);
      // Wait for badges to load from the mocked fetch
      const leadBadge = await screen.findByText('3');
      expect(leadBadge).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders badge with onyx-raised background for inactive items', async () => {
      mockPathname = '/nurture'; // Not on leads/messages/dashboard
      render(<Sidebar />);
      const badge = await screen.findByText('3');
      expect(badge.className).toContain('bg-onyx-raised');
      expect(badge.className).toContain('text-gray-2');
    });

    it('renders badge with aqua-tinted background for active items', async () => {
      mockPathname = '/leads';
      render(<Sidebar />);
      const badge = await screen.findByText('3');
      expect(badge.className).toContain('bg-aqua/20');
      expect(badge.className).toContain('text-aqua');
    });

    it('shows "99+" for badge counts exceeding 99', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            new_leads_count: 150,
            unread_messages_count: 100,
            overdue_tasks_count: 0,
          }),
      });
      render(<Sidebar />);
      const badges = await screen.findAllByText('99+');
      expect(badges.length).toBe(2);
    });

    it('does not render badge when count is 0', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            new_leads_count: 0,
            unread_messages_count: 0,
            overdue_tasks_count: 0,
          }),
      });
      render(<Sidebar />);
      // Wait for fetch to resolve
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Footer with settings gear (Req 11.8)', () => {
    it('renders user name in footer', () => {
      render(<Sidebar />);
      expect(screen.getByText('Agent')).toBeInTheDocument();
    });

    it('renders CEA number in footer', () => {
      render(<Sidebar />);
      expect(screen.getByText('CEA R0000000')).toBeInTheDocument();
    });

    it('renders settings gear icon button linking to /settings', () => {
      render(<Sidebar />);
      const settingsLink = screen.getByLabelText('Settings');
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });

    it('renders user avatar in footer', () => {
      const { container } = render(<Sidebar />);
      // The avatar is a 32px circular div with gradient - find it by its unique gradient class
      const avatar = container.querySelector('[class*="from-brand"]');
      expect(avatar).toBeInTheDocument();
      expect(avatar?.className).toContain('rounded-full');
    });
  });
});
