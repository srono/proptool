import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConsentBadge } from '../consent-badge';

describe('ConsentBadge', () => {
  it('renders green badge with correct emoji and accessible label', () => {
    render(<ConsentBadge value="green" />);
    const badge = screen.getByRole('img', { name: 'Valid consent' });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('🟢');
  });

  it('renders yellow badge with correct emoji and accessible label', () => {
    render(<ConsentBadge value="yellow" />);
    const badge = screen.getByRole('img', { name: 'Partial consent' });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('🟡');
  });

  it('renders red badge with correct emoji and accessible label', () => {
    render(<ConsentBadge value="red" />);
    const badge = screen.getByRole('img', { name: 'No consent' });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('🔴');
  });

  it('applies additional className when provided', () => {
    render(<ConsentBadge value="green" className="ml-2" />);
    const badge = screen.getByRole('img', { name: 'Valid consent' });
    expect(badge.className).toContain('ml-2');
  });

  it('renders without additional className', () => {
    render(<ConsentBadge value="green" />);
    const badge = screen.getByRole('img', { name: 'Valid consent' });
    expect(badge.className).not.toContain('undefined');
  });
});
