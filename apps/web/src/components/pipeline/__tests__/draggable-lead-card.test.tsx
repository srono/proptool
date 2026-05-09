import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DraggableLeadCard } from '../draggable-lead-card';

// Mock @dnd-kit/core useDraggable hook
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}));

const mockLead = {
  id: 'lead-1',
  status: 'new_inquiry' as const,
  deal_type: 'Buy',
  urgency: 'warm',
  source: 'website',
  intent_score: 3,
  verification_score: null,
  eligibility_risk: false,
  last_activity_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  contact: {
    full_name: 'John Smith',
    phone: '+44 7700 900000',
    email: 'john@example.com',
  },
  tasks: [],
};

describe('DraggableLeadCard', () => {
  it('renders with reduced opacity when isDragging is true', () => {
    const { container } = render(
      <DraggableLeadCard lead={mockLead} isDragging={true} />
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.opacity).toBe('0.5');
  });

  it('renders with full opacity when isDragging is false', () => {
    const { container } = render(
      <DraggableLeadCard lead={mockLead} isDragging={false} />
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.opacity).toBe('1');
  });

  it('renders the lead contact name', () => {
    render(<DraggableLeadCard lead={mockLead} isDragging={false} />);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });
});
