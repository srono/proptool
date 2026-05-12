import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterBar } from '../filter-bar';
import type { FilterBarProps } from '../filter-bar';

describe('FilterBar', () => {
  const defaultProps: FilterBarProps = {
    activePill: 'all',
    onPillChange: vi.fn(),
    playbookFilter: '',
    onPlaybookFilterChange: vi.fn(),
    consentFilter: '',
    onConsentFilterChange: vi.fn(),
    myTasksOnly: false,
    onMyTasksToggle: vi.fn(),
    taskCount: 42,
    playbooks: [
      { id: 'pb-1', name: 'New Leads' },
      { id: 'pb-2', name: 'Follow Up' },
    ],
  };

  it('renders all five pill tabs in correct order', () => {
    render(<FilterBar {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveTextContent('All');
    expect(tabs[1]).toHaveTextContent('Overdue');
    expect(tabs[2]).toHaveTextContent('Today');
    expect(tabs[3]).toHaveTextContent('Upcoming');
    expect(tabs[4]).toHaveTextContent('Snoozed');
  });

  it('marks the active pill tab with aria-selected=true', () => {
    render(<FilterBar {...defaultProps} activePill="overdue" />);
    const overdueTab = screen.getByRole('tab', { name: /Filter by Overdue/i });
    expect(overdueTab).toHaveAttribute('aria-selected', 'true');

    const allTab = screen.getByRole('tab', { name: /Filter by All/i });
    expect(allTab).toHaveAttribute('aria-selected', 'false');
  });

  it('applies active color class for overdue pill', () => {
    render(<FilterBar {...defaultProps} activePill="overdue" />);
    const overdueTab = screen.getByRole('tab', { name: /Filter by Overdue/i });
    expect(overdueTab.className).toContain('bg-status-red');
  });

  it('applies active color class for today pill', () => {
    render(<FilterBar {...defaultProps} activePill="today" />);
    const todayTab = screen.getByRole('tab', { name: /Filter by Today/i });
    expect(todayTab.className).toContain('bg-status-amber');
  });

  it('applies active color class for all pill (brand blue)', () => {
    render(<FilterBar {...defaultProps} activePill="all" />);
    const allTab = screen.getByRole('tab', { name: /Filter by All/i });
    expect(allTab.className).toContain('bg-brand');
  });

  it('applies inactive styling with border for non-active pills', () => {
    render(<FilterBar {...defaultProps} activePill="all" />);
    const overdueTab = screen.getByRole('tab', { name: /Filter by Overdue/i });
    expect(overdueTab.className).toContain('border-onyx-line');
    expect(overdueTab.className).toContain('bg-transparent');
  });

  it('calls onPillChange when a pill tab is clicked', () => {
    const onPillChange = vi.fn();
    render(<FilterBar {...defaultProps} onPillChange={onPillChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /Filter by Overdue/i }));
    expect(onPillChange).toHaveBeenCalledWith('overdue');
  });

  it('renders playbook dropdown with "All Playbooks" default and playbook entries', () => {
    render(<FilterBar {...defaultProps} />);
    const select = screen.getByLabelText('Filter by playbook');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('All Playbooks')).toBeInTheDocument();
    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('Follow Up')).toBeInTheDocument();
  });

  it('calls onPlaybookFilterChange when playbook dropdown changes', () => {
    const onPlaybookFilterChange = vi.fn();
    render(<FilterBar {...defaultProps} onPlaybookFilterChange={onPlaybookFilterChange} />);

    const select = screen.getByLabelText('Filter by playbook');
    fireEvent.change(select, { target: { value: 'pb-1' } });
    expect(onPlaybookFilterChange).toHaveBeenCalledWith('pb-1');
  });

  it('renders consent dropdown with all options', () => {
    render(<FilterBar {...defaultProps} />);
    const select = screen.getByLabelText('Filter by consent status');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('All Consent')).toBeInTheDocument();
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('No Consent')).toBeInTheDocument();
  });

  it('calls onConsentFilterChange when consent dropdown changes', () => {
    const onConsentFilterChange = vi.fn();
    render(<FilterBar {...defaultProps} onConsentFilterChange={onConsentFilterChange} />);

    const select = screen.getByLabelText('Filter by consent status');
    fireEvent.change(select, { target: { value: 'green' } });
    expect(onConsentFilterChange).toHaveBeenCalledWith('green');
  });

  it('renders My Tasks toggle in off state by default', () => {
    render(<FilterBar {...defaultProps} myTasksOnly={false} />);
    const toggle = screen.getByRole('switch', { name: /Show only my tasks/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onMyTasksToggle when toggle is clicked', () => {
    const onMyTasksToggle = vi.fn();
    render(<FilterBar {...defaultProps} onMyTasksToggle={onMyTasksToggle} />);

    const toggle = screen.getByRole('switch', { name: /Show only my tasks/i });
    fireEvent.click(toggle);
    expect(onMyTasksToggle).toHaveBeenCalledWith(true);
  });

  it('renders task count label', () => {
    render(<FilterBar {...defaultProps} taskCount={42} />);
    expect(screen.getByText('42 tasks')).toBeInTheDocument();
  });

  it('renders singular "task" for count of 1', () => {
    render(<FilterBar {...defaultProps} taskCount={1} />);
    expect(screen.getByText('1 task')).toBeInTheDocument();
  });

  it('renders toolbar with accessible label', () => {
    render(<FilterBar {...defaultProps} />);
    const toolbar = screen.getByRole('toolbar', { name: 'Task filters' });
    expect(toolbar).toBeInTheDocument();
  });
});
