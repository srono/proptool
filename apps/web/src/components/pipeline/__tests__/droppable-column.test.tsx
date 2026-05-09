import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DroppableColumn } from '../droppable-column';

// Mock @dnd-kit/core useDroppable hook
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

const defaultProps = {
  stageKey: 'new_inquiry',
  label: 'New Inquiry',
  count: 3,
  colorIndex: 0,
  isOver: false,
  isDragging: false,
};

describe('DroppableColumn', () => {
  it('renders highlight styles when isOver is true', () => {
    const { container } = render(
      <DroppableColumn {...defaultProps} isOver={true}>
        <div>Card</div>
      </DroppableColumn>
    );

    const column = container.firstElementChild as HTMLElement;
    expect(column.className).toContain('border-brand');
    expect(column.className).toContain('bg-brand/10');
  });

  it('renders dimming when isDragging is true and isOver is false', () => {
    const { container } = render(
      <DroppableColumn {...defaultProps} isDragging={true} isOver={false}>
        <div>Card</div>
      </DroppableColumn>
    );

    const column = container.firstElementChild as HTMLElement;
    expect(column.className).toContain('opacity-60');
  });

  it('renders without highlight or dimming classes when neither isOver nor isDragging', () => {
    const { container } = render(
      <DroppableColumn {...defaultProps} isDragging={false} isOver={false}>
        <div>Card</div>
      </DroppableColumn>
    );

    const column = container.firstElementChild as HTMLElement;
    expect(column.className).not.toContain('border-brand');
    expect(column.className).not.toContain('bg-brand/10');
    expect(column.className).not.toContain('opacity-60');
  });
});
