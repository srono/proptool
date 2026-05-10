// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineListView } from '../pipeline-list-view';
import { PipelineClientShell } from '../pipeline-client-shell';
import { PipelineViewToggle } from '../pipeline-view-toggle';
import type { PipelineStage } from '@agentos/shared';
import type { Breakpoint } from '@/components/listings/hooks/use-breakpoint';

// --- Mocks ---

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => '/pipeline',
}));

// Mock useBreakpoint — default to desktop
let mockBreakpoint: Breakpoint = 'desktop';
vi.mock('@/components/listings/hooks/use-breakpoint', () => ({
  useBreakpoint: () => mockBreakpoint,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock PipelineBoard (not under test)
vi.mock('../pipeline-board', () => ({
  PipelineBoard: ({ leads, stages }: any) => (
    <div data-testid="pipeline-board">Board: {leads.length} leads</div>
  ),
}));

// --- localStorage mock ---
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// --- Test Data Helpers ---

function createLead(overrides: Partial<{
  id: string;
  status: PipelineStage;
  deal_type: string;
  urgency: string;
  source: string;
  intent_score: number | null;
  verification_score: number | null;
  eligibility_risk: boolean;
  last_activity_at: string | null;
  created_at: string;
  contact: { full_name: string; phone: string; email: string | null } | null;
  tasks: any[];
}> = {}) {
  return {
    id: overrides.id ?? 'lead-1',
    status: (overrides.status ?? 'new_lead') as PipelineStage,
    deal_type: overrides.deal_type ?? 'sale',
    urgency: overrides.urgency ?? 'warm',
    source: overrides.source ?? 'referral',
    intent_score: ('intent_score' in overrides ? overrides.intent_score : 3) as number | null,
    verification_score: overrides.verification_score ?? null,
    eligibility_risk: overrides.eligibility_risk ?? false,
    last_activity_at: ('last_activity_at' in overrides ? overrides.last_activity_at : new Date().toISOString()) as string | null,
    created_at: overrides.created_at ?? '2024-01-15T00:00:00Z',
    contact: ('contact' in overrides ? overrides.contact : {
      full_name: 'John Doe',
      phone: '+65 9123 4567',
      email: 'john@example.com',
    }) as { full_name: string; phone: string; email: string | null } | null,
    tasks: (overrides.tasks ?? []) as { id: string; title: string; due_at: string; completed_at: string | null }[],
  };
}

const defaultSort = { column: 'last_activity' as const, direction: 'desc' as const };
const mockOnSort = vi.fn();

const stages = [
  { key: 'new_lead' as PipelineStage, label: 'New Lead', order: 1 },
  { key: 'contacted' as PipelineStage, label: 'Contacted', order: 2 },
  { key: 'qualified' as PipelineStage, label: 'Qualified', order: 3 },
  { key: 'viewing_booked' as PipelineStage, label: 'Viewing Booked', order: 4 },
  { key: 'viewing_done' as PipelineStage, label: 'Viewing Done', order: 5 },
  { key: 'negotiating' as PipelineStage, label: 'Negotiating', order: 6 },
  { key: 'otp_loi_issued' as PipelineStage, label: 'OTP / LOI Issued', order: 7 },
];

// --- Tests ---

describe('PipelineListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBreakpoint = 'desktop';
  });

  describe('Null/missing data rendering (Req 1.7, 1.8, 1.9)', () => {
    it('renders "Unknown" for contact name when contact is null', () => {
      const lead = createLead({ contact: null });
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('renders "—" for phone when contact is null', () => {
      const lead = createLead({ contact: null });
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );
      // Phone column shows "—" when contact is null
      const cells = screen.getAllByRole('cell');
      // Phone is the second cell (after Contact Name)
      const phoneCell = cells[1];
      expect(phoneCell).toHaveTextContent('—');
    });

    it('renders "—" for intent_score when null', () => {
      const lead = createLead({ intent_score: null });
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );
      // Intent Score column should show "—"
      const dashElements = screen.getAllByText('—');
      expect(dashElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders "—" for last_activity_at when null', () => {
      const lead = createLead({ last_activity_at: null });
      render(
        <PipelineListView
          leads={[lead] as any}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );
      // formatRelativeActivity(null) returns "—"
      const dashElements = screen.getAllByText('—');
      expect(dashElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Row interaction and navigation (Req 5.1, 5.6)', () => {
    it('navigates to /leads/{id} on row click', () => {
      const lead = createLead({ id: 'lead-abc' });
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      const row = screen.getByRole('link');
      fireEvent.click(row);
      expect(mockPush).toHaveBeenCalledWith('/leads/lead-abc');
    });

    it('navigates to /leads/{id} on Enter key', () => {
      const lead = createLead({ id: 'lead-enter' });
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      const row = screen.getByRole('link');
      fireEvent.keyDown(row, { key: 'Enter' });
      expect(mockPush).toHaveBeenCalledWith('/leads/lead-enter');
    });

    it('navigates to /leads/{id} on Space key', () => {
      const lead = createLead({ id: 'lead-space' });
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      const row = screen.getByRole('link');
      fireEvent.keyDown(row, { key: ' ' });
      expect(mockPush).toHaveBeenCalledWith('/leads/lead-space');
    });

    it('does not navigate on other keys', () => {
      const lead = createLead({ id: 'lead-tab' });
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      const row = screen.getByRole('link');
      fireEvent.keyDown(row, { key: 'Tab' });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Sort indicators (Req 3.7)', () => {
    it('default sort is last_activity descending', () => {
      const lead = createLead();
      render(
        <PipelineListView
          leads={[lead]}
          sort={{ column: 'last_activity', direction: 'desc' }}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      // The Last Activity column header should have aria-sort="descending"
      const lastActivityHeader = screen.getByText('Last Activity').closest('th');
      expect(lastActivityHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('sort indicator only on active column', () => {
      const lead = createLead();
      render(
        <PipelineListView
          leads={[lead]}
          sort={{ column: 'last_activity', direction: 'desc' }}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      // Active column should have descending
      const lastActivityHeader = screen.getByText('Last Activity').closest('th');
      expect(lastActivityHeader).toHaveAttribute('aria-sort', 'descending');

      // Other columns should have aria-sort="none"
      const contactHeader = screen.getByText('Contact Name').closest('th');
      expect(contactHeader).toHaveAttribute('aria-sort', 'none');

      const urgencyHeader = screen.getByText('Urgency').closest('th');
      expect(urgencyHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('clicking a column header calls onSort with that column', () => {
      const lead = createLead();
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      const contactHeader = screen.getByText('Contact Name').closest('th')!;
      fireEvent.click(contactHeader);
      expect(mockOnSort).toHaveBeenCalledWith('contact_name');
    });
  });

  describe('Responsive column visibility (Req 6.1, 6.2)', () => {
    it('at desktop breakpoint, all columns are visible (no hidden class without lg: prefix)', () => {
      const lead = createLead();
      const { container } = render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      // All column headers should be present in the DOM
      expect(screen.getByText('Contact Name')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Deal Type')).toBeInTheDocument();
      expect(screen.getByText('Urgency')).toBeInTheDocument();
      expect(screen.getByText('Stage')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(screen.getByText('Intent Score')).toBeInTheDocument();
      expect(screen.getByText('Last Activity')).toBeInTheDocument();
      expect(screen.getByText('Created Date')).toBeInTheDocument();
    });

    it('Source, Intent Score, Created Date, and Phone columns have hidden lg:table-cell class', () => {
      const lead = createLead();
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      // These columns should have the responsive hidden class
      const sourceHeader = screen.getByText('Source').closest('th');
      expect(sourceHeader?.className).toContain('hidden');
      expect(sourceHeader?.className).toContain('lg:table-cell');

      const intentHeader = screen.getByText('Intent Score').closest('th');
      expect(intentHeader?.className).toContain('hidden');
      expect(intentHeader?.className).toContain('lg:table-cell');

      const createdHeader = screen.getByText('Created Date').closest('th');
      expect(createdHeader?.className).toContain('hidden');
      expect(createdHeader?.className).toContain('lg:table-cell');

      const phoneHeader = screen.getByText('Phone').closest('th');
      expect(phoneHeader?.className).toContain('hidden');
      expect(phoneHeader?.className).toContain('lg:table-cell');
    });

    it('Contact Name, Deal Type, Urgency, Stage, Last Activity columns do NOT have hidden class', () => {
      const lead = createLead();
      render(
        <PipelineListView
          leads={[lead]}
          sort={defaultSort}
          onSort={mockOnSort}
          breakpoint="desktop"
        />
      );

      const contactHeader = screen.getByText('Contact Name').closest('th');
      expect(contactHeader?.className).not.toContain('hidden');

      const dealTypeHeader = screen.getByText('Deal Type').closest('th');
      expect(dealTypeHeader?.className).not.toContain('hidden');

      const urgencyHeader = screen.getByText('Urgency').closest('th');
      expect(urgencyHeader?.className).not.toContain('hidden');

      const stageHeader = screen.getByText('Stage').closest('th');
      expect(stageHeader?.className).not.toContain('hidden');

      const lastActivityHeader = screen.getByText('Last Activity').closest('th');
      expect(lastActivityHeader?.className).not.toContain('hidden');
    });
  });
});

describe('PipelineClientShell - Empty states (Req 1.13, 1.14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBreakpoint = 'desktop';
    localStorageMock.clear();
  });

  it('shows "No leads yet" empty state when no leads exist', () => {
    render(<PipelineClientShell leads={[]} stages={stages} />);
    expect(screen.getByText('No leads yet')).toBeInTheDocument();
    expect(screen.getByText('+ New lead')).toBeInTheDocument();
  });

  it('shows link to /leads/new in empty state', () => {
    render(<PipelineClientShell leads={[]} stages={stages} />);
    const link = screen.getByText('+ New lead').closest('a');
    expect(link).toHaveAttribute('href', '/leads/new');
  });

  it('shows "No leads match filters" when filters produce zero results', () => {
    // Provide leads but set a filter that matches nothing
    const lead = createLead({ urgency: 'warm' });
    render(<PipelineClientShell leads={[lead]} stages={stages} />);

    // Select urgency filter to "hot" which won't match our "warm" lead
    const urgencySelect = screen.getByLabelText('Filter by urgency');
    fireEvent.change(urgencySelect, { target: { value: 'hot' } });

    expect(screen.getByText('No leads match filters')).toBeInTheDocument();
    // There are two "Clear all filters" buttons: one in filter bar, one in empty state
    const clearButtons = screen.getAllByText('Clear all filters');
    expect(clearButtons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PipelineClientShell - View toggle (Req 2.1, 6.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBreakpoint = 'desktop';
    localStorageMock.clear();
  });

  it('renders view toggle with board as default active state', () => {
    const lead = createLead();
    render(<PipelineClientShell leads={[lead]} stages={stages} />);

    const boardButton = screen.getByLabelText('Board view');
    const listButton = screen.getByLabelText('List view');

    expect(boardButton).toHaveAttribute('aria-pressed', 'true');
    expect(listButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles to list view when list button is clicked', () => {
    const lead = createLead();
    render(<PipelineClientShell leads={[lead]} stages={stages} />);

    const listButton = screen.getByLabelText('List view');
    fireEvent.click(listButton);

    expect(listButton).toHaveAttribute('aria-pressed', 'true');
    const boardButton = screen.getByLabelText('Board view');
    expect(boardButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides view toggle on mobile breakpoint', () => {
    mockBreakpoint = 'mobile';
    const lead = createLead();
    render(<PipelineClientShell leads={[lead]} stages={stages} />);

    expect(screen.queryByLabelText('Board view')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('List view')).not.toBeInTheDocument();
  });

  it('shows view toggle on tablet breakpoint', () => {
    mockBreakpoint = 'tablet';
    const lead = createLead();
    render(<PipelineClientShell leads={[lead]} stages={stages} />);

    expect(screen.getByLabelText('Board view')).toBeInTheDocument();
    expect(screen.getByLabelText('List view')).toBeInTheDocument();
  });
});

describe('PipelineClientShell - Clear all filters (Req 4.15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBreakpoint = 'desktop';
    localStorageMock.clear();
  });

  it('clear all filters resets all state and shows leads again', () => {
    const lead = createLead({ urgency: 'warm' });
    render(<PipelineClientShell leads={[lead]} stages={stages} />);

    // Apply a filter that produces zero results
    const urgencySelect = screen.getByLabelText('Filter by urgency');
    fireEvent.change(urgencySelect, { target: { value: 'hot' } });

    // Verify empty state
    expect(screen.getByText('No leads match filters')).toBeInTheDocument();

    // Click the "Clear all filters" button in the empty state area (the one with aqua styling)
    const clearButtons = screen.getAllByText('Clear all filters');
    // Click the last one (the one in the empty state section)
    fireEvent.click(clearButtons[clearButtons.length - 1]);

    // Leads should be visible again (board view by default)
    expect(screen.queryByText('No leads match filters')).not.toBeInTheDocument();
  });
});

describe('PipelineViewToggle - active state rendering (Req 2.1)', () => {
  it('renders board button with active styling when viewMode is board', () => {
    const onToggle = vi.fn();
    render(<PipelineViewToggle viewMode="board" onToggle={onToggle} />);

    const boardButton = screen.getByLabelText('Board view');
    expect(boardButton).toHaveAttribute('aria-pressed', 'true');
    expect(boardButton.className).toContain('bg-aqua');
  });

  it('renders list button with active styling when viewMode is list', () => {
    const onToggle = vi.fn();
    render(<PipelineViewToggle viewMode="list" onToggle={onToggle} />);

    const listButton = screen.getByLabelText('List view');
    expect(listButton).toHaveAttribute('aria-pressed', 'true');
    expect(listButton.className).toContain('bg-aqua');
  });

  it('inactive button does not have active styling', () => {
    const onToggle = vi.fn();
    render(<PipelineViewToggle viewMode="board" onToggle={onToggle} />);

    const listButton = screen.getByLabelText('List view');
    expect(listButton).toHaveAttribute('aria-pressed', 'false');
    expect(listButton.className).not.toContain('bg-aqua');
  });
});
