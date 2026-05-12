import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatsStrip } from '../stats-strip';

describe('StatsStrip', () => {
  const defaultProps = {
    overdueCount: 5,
    todayCount: 12,
    upcomingCount: 30,
    activeFilter: null as null,
    onFilterChange: vi.fn(),
  };

  it('renders three stat tiles with correct labels', () => {
    render(<StatsStrip {...defaultProps} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('renders correct counts for each tile', () => {
    render(<StatsStrip {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('displays "999+" for counts exceeding 999', () => {
    render(
      <StatsStrip
        {...defaultProps}
        overdueCount={1000}
        todayCount={999}
        upcomingCount={5000}
      />
    );
    // 1000 and 5000 should show as "999+"
    const plusLabels = screen.getAllByText('999+');
    expect(plusLabels).toHaveLength(2);
    // 999 should show as "999"
    expect(screen.getByText('999')).toBeInTheDocument();
  });

  it('calls onFilterChange with filter key when inactive tile is clicked', () => {
    const onFilterChange = vi.fn();
    render(<StatsStrip {...defaultProps} onFilterChange={onFilterChange} />);

    const overdueButton = screen.getByRole('button', { name: /Overdue/i });
    fireEvent.click(overdueButton);
    expect(onFilterChange).toHaveBeenCalledWith('overdue');
  });

  it('calls onFilterChange with null when active tile is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <StatsStrip
        {...defaultProps}
        activeFilter="overdue"
        onFilterChange={onFilterChange}
      />
    );

    const overdueButton = screen.getByRole('button', { name: /Overdue/i });
    fireEvent.click(overdueButton);
    expect(onFilterChange).toHaveBeenCalledWith(null);
  });

  it('activates today filter when Due Today tile is clicked', () => {
    const onFilterChange = vi.fn();
    render(<StatsStrip {...defaultProps} onFilterChange={onFilterChange} />);

    const todayButton = screen.getByRole('button', { name: /Due Today/i });
    fireEvent.click(todayButton);
    expect(onFilterChange).toHaveBeenCalledWith('today');
  });

  it('activates upcoming filter when Upcoming tile is clicked', () => {
    const onFilterChange = vi.fn();
    render(<StatsStrip {...defaultProps} onFilterChange={onFilterChange} />);

    const upcomingButton = screen.getByRole('button', { name: /Upcoming/i });
    fireEvent.click(upcomingButton);
    expect(onFilterChange).toHaveBeenCalledWith('upcoming');
  });

  it('sets aria-pressed=true on the active tile', () => {
    render(<StatsStrip {...defaultProps} activeFilter="today" />);
    const todayButton = screen.getByRole('button', { name: /Due Today/i });
    expect(todayButton).toHaveAttribute('aria-pressed', 'true');

    const overdueButton = screen.getByRole('button', { name: /Overdue/i });
    expect(overdueButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('applies highlighted border on active tile', () => {
    render(<StatsStrip {...defaultProps} activeFilter="overdue" />);
    const overdueButton = screen.getByRole('button', { name: /Overdue/i });
    // jsdom normalizes hex to rgb
    expect(overdueButton.style.border).toBe('2px solid rgb(239, 68, 68)');
  });

  it('applies onyx-line border on inactive tiles', () => {
    render(<StatsStrip {...defaultProps} activeFilter="overdue" />);
    const todayButton = screen.getByRole('button', { name: /Due Today/i });
    expect(todayButton.style.border).toBe('2px solid rgb(42, 42, 42)');
  });

  it('renders with role group and accessible label', () => {
    render(<StatsStrip {...defaultProps} />);
    const group = screen.getByRole('group', { name: 'Task urgency stats' });
    expect(group).toBeInTheDocument();
  });
});
