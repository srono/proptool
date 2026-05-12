import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskGroup } from '../task-group';

describe('TaskGroup', () => {
  it('renders header with group name in bold and count in parentheses', () => {
    render(
      <TaskGroup title="Overdue" count={3}>
        <p>Task content</p>
      </TaskGroup>
    );

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('renders children when expanded (default)', () => {
    render(
      <TaskGroup title="Due Today" count={2}>
        <p>Child content</p>
      </TaskGroup>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('returns null when count is 0', () => {
    const { container } = render(
      <TaskGroup title="Overdue" count={0}>
        <p>Should not render</p>
      </TaskGroup>
    );

    expect(container.firstChild).toBeNull();
  });

  it('collapses content when header is clicked', () => {
    render(
      <TaskGroup title="Upcoming" count={5}>
        <p>Collapsible content</p>
      </TaskGroup>
    );

    const header = screen.getByRole('button');
    expect(header).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(header);

    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands content when collapsed header is clicked', () => {
    render(
      <TaskGroup title="Overdue" count={3} defaultExpanded={false}>
        <p>Content</p>
      </TaskGroup>
    );

    const header = screen.getByRole('button');
    expect(header).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(header);

    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('respects defaultExpanded=false prop', () => {
    render(
      <TaskGroup title="Overdue" count={2} defaultExpanded={false}>
        <p>Content</p>
      </TaskGroup>
    );

    const header = screen.getByRole('button');
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('defaults to expanded when defaultExpanded is not provided', () => {
    render(
      <TaskGroup title="Overdue" count={2}>
        <p>Content</p>
      </TaskGroup>
    );

    const header = screen.getByRole('button');
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });
});
