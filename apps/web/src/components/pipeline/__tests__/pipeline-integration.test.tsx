// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PipelineClientShell } from '../pipeline-client-shell';
import { PIPELINE_VIEW_MODE_STORAGE_KEY } from '../hooks/use-pipeline-view-mode';
import type { PipelineStage } from '@agentos/shared';
import type { Breakpoint } from '@/components/listings/hooks/use-breakpoint';

// --- Mocks ---

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => '/pipeline',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock useBreakpoint — we control the returned breakpoint via a module-level variable
let mockBreakpoint: Breakpoint = 'desktop';
vi.mock('@/components/listings/hooks/use-breakpoint', () => ({
  useBreakpoint: () => mockBreakpoint,
}));

// Mock PipelineBoard (not under test — renders a simple stub showing lead names)
vi.mock('../pipeline-board', () => ({
  PipelineBoard: ({ leads }: any) => (
    <div data-testid="pipeline-board">
      {leads.map((lead: any) => (
        <span key={lead.id} data-testid={`board-lead-${lead.id}`}>
          {lead.contact?.full_name ?? 'Unknown'}
        </span>
      ))}
    </div>
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

// --- Test Data ---

const stages = [
  { key: 'new_lead' as PipelineStage, label: 'New Lead', order: 1 },
  { key: 'contacted' as PipelineStage, label: 'Contacted', order: 2 },
  { key: 'qualified' as PipelineStage, label: 'Qualified', order: 3 },
  { key: 'viewing_booked' as PipelineStage, label: 'Viewing Booked', order: 4 },
  { key: 'viewing_done' as PipelineStage, label: 'Viewing Done', order: 5 },
  { key: 'negotiating' as PipelineStage, label: 'Negotiating', order: 6 },
  { key: 'otp_loi_issued' as PipelineStage, label: 'OTP / LOI Issued', order: 7 },
];

function createLead(overrides: Partial<{
  id: string;
  status: PipelineStage;
  contactName: string;
  phone: string;
  urgency: string;
  dealType: string;
  source: string;
  intentScore: number | null;
}> = {}) {
  return {
    id: overrides.id ?? 'lead-1',
    status: overrides.status ?? ('new_lead' as PipelineStage),
    deal_type: overrides.dealType ?? 'sale',
    urgency: overrides.urgency ?? 'warm',
    source: overrides.source ?? 'referral',
    intent_score: overrides.intentScore !== undefined ? overrides.intentScore : 3,
    verification_score: null,
    eligibility_risk: false,
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    contact: {
      full_name: overrides.contactName ?? 'John Doe',
      phone: overrides.phone ?? '+65 9123 4567',
      email: 'john@example.com',
    },
    tasks: [],
  };
}

// --- Tests ---

describe('Pipeline Integration: View mode and filter persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockBreakpoint = 'desktop';
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Board view receives same filtered leads as list view (Req 2.4, 4.17)', () => {
    it('applies the same filter to both board and list views', async () => {
      const leads = [
        createLead({ id: 'lead-hot', contactName: 'Alice Hot', urgency: 'hot' }),
        createLead({ id: 'lead-warm', contactName: 'Bob Warm', urgency: 'warm' }),
        createLead({ id: 'lead-cold', contactName: 'Charlie Cold', urgency: 'cold' }),
      ];

      const { rerender } = render(
        <PipelineClientShell leads={leads} stages={stages} />
      );

      // Default is board view — all leads should be visible
      expect(screen.getByText('Alice Hot')).toBeInTheDocument();
      expect(screen.getByText('Bob Warm')).toBeInTheDocument();
      expect(screen.getByText('Charlie Cold')).toBeInTheDocument();

      // Apply urgency filter to 'hot'
      const urgencySelect = screen.getByLabelText('Filter by urgency');
      fireEvent.change(urgencySelect, { target: { value: 'hot' } });

      // In board view, only hot lead should be visible
      await waitFor(() => {
        expect(screen.getByText('Alice Hot')).toBeInTheDocument();
        expect(screen.queryByText('Bob Warm')).not.toBeInTheDocument();
        expect(screen.queryByText('Charlie Cold')).not.toBeInTheDocument();
      });

      // Count display should show "Showing 1 of 3 leads"
      expect(screen.getByText('Showing 1 of 3 leads')).toBeInTheDocument();

      // Switch to list view
      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      // Same filter should be applied — only hot lead visible
      await waitFor(() => {
        expect(screen.getByText('Alice Hot')).toBeInTheDocument();
        expect(screen.queryByText('Bob Warm')).not.toBeInTheDocument();
        expect(screen.queryByText('Charlie Cold')).not.toBeInTheDocument();
      });

      // Count should still show the same
      expect(screen.getByText('Showing 1 of 3 leads')).toBeInTheDocument();
    });

    it('preserves text search filter when toggling from list to board', async () => {
      vi.useFakeTimers();

      const leads = [
        createLead({ id: 'lead-1', contactName: 'Alice Smith' }),
        createLead({ id: 'lead-2', contactName: 'Bob Jones' }),
        createLead({ id: 'lead-3', contactName: 'Alice Johnson' }),
      ];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // Switch to list view first
      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      // Type in search
      const searchInput = screen.getByPlaceholderText('Search name or phone...');
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      // Advance past debounce (300ms)
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // Only Alice leads should be visible
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

      // Toggle back to board view
      const boardButton = screen.getByLabelText('Board view');
      fireEvent.click(boardButton);

      // Same filter should still be applied
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('preserves stage filter when toggling views', () => {
      const leads = [
        createLead({ id: 'lead-1', contactName: 'New Lead Person', status: 'new_lead' as PipelineStage }),
        createLead({ id: 'lead-2', contactName: 'Contacted Person', status: 'contacted' as PipelineStage }),
      ];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // Open stage filter and select 'new_lead'
      const stageButton = screen.getByLabelText('Filter by stage');
      fireEvent.click(stageButton);

      // Find and click the 'New Lead' checkbox
      const newLeadCheckbox = screen.getByRole('checkbox', { name: /New Lead/i });
      fireEvent.click(newLeadCheckbox);

      // Only new_lead should be visible
      expect(screen.getByText('New Lead Person')).toBeInTheDocument();
      expect(screen.queryByText('Contacted Person')).not.toBeInTheDocument();

      // Switch to list view
      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      // Same filter should be applied
      expect(screen.getByText('New Lead Person')).toBeInTheDocument();
      expect(screen.queryByText('Contacted Person')).not.toBeInTheDocument();
    });
  });

  describe('View mode persists across simulated page navigation (Req 2.6)', () => {
    it('persists list mode to localStorage when toggled', () => {
      const leads = [createLead()];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // Switch to list view
      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      // Verify localStorage was updated
      expect(localStorage.getItem(PIPELINE_VIEW_MODE_STORAGE_KEY)).toBe('list');
    });

    it('restores list mode from localStorage on mount', () => {
      // Pre-set localStorage to 'list'
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'list');

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // Should render in list view (table should be present)
      const listViewButton = screen.getByLabelText('List view');
      expect(listViewButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('restores board mode from localStorage on mount', () => {
      // Pre-set localStorage to 'board'
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'board');

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // Should render in board view
      const boardViewButton = screen.getByLabelText('Board view');
      expect(boardViewButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('defaults to board mode when localStorage has invalid value', () => {
      // Pre-set localStorage to an invalid value
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'invalid_value');

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // Should default to board view
      const boardViewButton = screen.getByLabelText('Board view');
      expect(boardViewButton).toHaveAttribute('aria-pressed', 'true');

      // Should overwrite the invalid value with 'board'
      expect(localStorage.getItem(PIPELINE_VIEW_MODE_STORAGE_KEY)).toBe('board');
    });

    it('simulates page navigation by unmounting and remounting with persisted state', () => {
      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      // First render — switch to list view
      const { unmount } = render(
        <PipelineClientShell leads={leads} stages={stages} />
      );

      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      expect(localStorage.getItem(PIPELINE_VIEW_MODE_STORAGE_KEY)).toBe('list');

      // Unmount (simulates navigation away)
      unmount();

      // Re-render (simulates navigation back)
      render(<PipelineClientShell leads={leads} stages={stages} />);

      // Should restore list view from localStorage
      const listViewButton = screen.getByLabelText('List view');
      expect(listViewButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Breakpoint transitions update layout without reload (Req 6.5, 6.7)', () => {
    it('forces board view on mobile regardless of stored preference', () => {
      // Set localStorage to 'list'
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'list');
      mockBreakpoint = 'mobile';

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // View toggle should be hidden on mobile
      expect(screen.queryByLabelText('Board view')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('List view')).not.toBeInTheDocument();

      // Board view should be rendered (DnD context is the board)
      expect(screen.getByTestId('pipeline-board')).toBeInTheDocument();

      // localStorage should NOT be overwritten
      expect(localStorage.getItem(PIPELINE_VIEW_MODE_STORAGE_KEY)).toBe('list');
    });

    it('shows list view on tablet when list mode is stored', () => {
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'list');
      mockBreakpoint = 'tablet';

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      render(<PipelineClientShell leads={leads} stages={stages} />);

      // View toggle should be visible
      expect(screen.getByLabelText('Board view')).toBeInTheDocument();
      expect(screen.getByLabelText('List view')).toBeInTheDocument();

      // List view should be active
      const listViewButton = screen.getByLabelText('List view');
      expect(listViewButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('transitions from mobile to desktop restores stored list preference', () => {
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'list');

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      // Start at mobile
      mockBreakpoint = 'mobile';
      const { rerender } = render(
        <PipelineClientShell leads={leads} stages={stages} />
      );

      // Board view forced on mobile, toggle hidden
      expect(screen.queryByLabelText('List view')).not.toBeInTheDocument();
      expect(screen.getByTestId('pipeline-board')).toBeInTheDocument();

      // Simulate breakpoint transition to desktop
      mockBreakpoint = 'desktop';
      rerender(<PipelineClientShell leads={leads} stages={stages} />);

      // View toggle should reappear
      expect(screen.getByLabelText('List view')).toBeInTheDocument();
      expect(screen.getByLabelText('Board view')).toBeInTheDocument();

      // List view should be restored from localStorage
      const listViewButton = screen.getByLabelText('List view');
      expect(listViewButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('transitions from desktop to mobile hides toggle and forces board', () => {
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'list');

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      // Start at desktop with list view
      mockBreakpoint = 'desktop';
      const { rerender } = render(
        <PipelineClientShell leads={leads} stages={stages} />
      );

      // List view should be active
      expect(screen.getByLabelText('List view')).toHaveAttribute('aria-pressed', 'true');

      // Simulate breakpoint transition to mobile
      mockBreakpoint = 'mobile';
      rerender(<PipelineClientShell leads={leads} stages={stages} />);

      // Toggle should be hidden
      expect(screen.queryByLabelText('List view')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Board view')).not.toBeInTheDocument();

      // Board view should be forced
      expect(screen.getByTestId('pipeline-board')).toBeInTheDocument();

      // localStorage should still have 'list' (not overwritten)
      expect(localStorage.getItem(PIPELINE_VIEW_MODE_STORAGE_KEY)).toBe('list');
    });

    it('transitions from mobile to tablet shows toggle and restores preference', () => {
      localStorage.setItem(PIPELINE_VIEW_MODE_STORAGE_KEY, 'board');

      const leads = [createLead({ id: 'lead-1', contactName: 'Test Lead' })];

      // Start at mobile
      mockBreakpoint = 'mobile';
      const { rerender } = render(
        <PipelineClientShell leads={leads} stages={stages} />
      );

      // Toggle hidden on mobile
      expect(screen.queryByLabelText('Board view')).not.toBeInTheDocument();

      // Simulate breakpoint transition to tablet
      mockBreakpoint = 'tablet';
      rerender(<PipelineClientShell leads={leads} stages={stages} />);

      // Toggle should reappear
      expect(screen.getByLabelText('Board view')).toBeInTheDocument();
      expect(screen.getByLabelText('List view')).toBeInTheDocument();

      // Board view should be active (from localStorage)
      const boardViewButton = screen.getByLabelText('Board view');
      expect(boardViewButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
