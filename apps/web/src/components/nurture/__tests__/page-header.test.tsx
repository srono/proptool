import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageHeader } from '../page-header';

// Mock next/link to render as a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('PageHeader', () => {
  it('renders the title with correct styling', () => {
    render(<PageHeader title="Nurture" subtitle="Manage outreach tasks across your active playbooks" />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Nurture' });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('font-display');
    expect(heading.className).toContain('font-bold');
    expect(heading.className).toContain('text-[26px]');
    expect(heading.className).toContain('text-white');
  });

  it('renders the subtitle with correct styling', () => {
    render(<PageHeader title="Nurture" subtitle="Manage outreach tasks across your active playbooks" />);
    const subtitle = screen.getByText('Manage outreach tasks across your active playbooks');
    expect(subtitle).toBeInTheDocument();
    expect(subtitle.className).toContain('text-[13px]');
    expect(subtitle.className).toContain('text-gray-2');
  });

  it('renders the Playbooks ghost button linking to /nurture/playbooks', () => {
    render(<PageHeader title="Nurture" subtitle="Manage outreach tasks" />);
    const playbooksLink = screen.getByRole('link', { name: 'Playbooks' });
    expect(playbooksLink).toBeInTheDocument();
    expect(playbooksLink).toHaveAttribute('href', '/nurture/playbooks');
    expect(playbooksLink.className).toContain('border');
    expect(playbooksLink.className).toContain('bg-transparent');
  });

  it('renders the + New Playbook primary button linking to /nurture/playbooks/new', () => {
    render(<PageHeader title="Nurture" subtitle="Manage outreach tasks" />);
    const newPlaybookLink = screen.getByRole('link', { name: '+ New Playbook' });
    expect(newPlaybookLink).toBeInTheDocument();
    expect(newPlaybookLink).toHaveAttribute('href', '/nurture/playbooks/new');
    expect(newPlaybookLink.className).toContain('bg-aqua');
    expect(newPlaybookLink.className).toContain('text-onyx');
  });

  it('renders buttons with 14px border-radius', () => {
    render(<PageHeader title="Nurture" subtitle="Manage outreach tasks" />);
    const playbooksLink = screen.getByRole('link', { name: 'Playbooks' });
    const newPlaybookLink = screen.getByRole('link', { name: '+ New Playbook' });
    expect(playbooksLink.className).toContain('rounded-[14px]');
    expect(newPlaybookLink.className).toContain('rounded-[14px]');
  });

  it('renders title and subtitle directly stacked with no elements between them', () => {
    render(<PageHeader title="Nurture" subtitle="Manage outreach tasks" />);
    const heading = screen.getByRole('heading', { level: 1 });
    const subtitle = screen.getByText('Manage outreach tasks');
    // Subtitle should be the next sibling of the heading
    expect(heading.nextElementSibling).toBe(subtitle);
  });
});
