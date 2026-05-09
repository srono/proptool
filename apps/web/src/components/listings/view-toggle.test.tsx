import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ViewToggle } from './view-toggle';

describe('ViewToggle', () => {
  it('renders list and card view buttons', () => {
    render(<ViewToggle viewMode="list" onToggle={() => {}} />);
    expect(screen.getByLabelText('List view')).toBeInTheDocument();
    expect(screen.getByLabelText('Card view')).toBeInTheDocument();
  });

  it('highlights list button as active when viewMode is "list"', () => {
    render(<ViewToggle viewMode="list" onToggle={() => {}} />);
    const listBtn = screen.getByLabelText('List view');
    const cardBtn = screen.getByLabelText('Card view');
    expect(listBtn.className).toContain('bg-aqua');
    expect(listBtn.className).toContain('text-onyx');
    expect(cardBtn.className).toContain('text-gray-2');
  });

  it('highlights card button as active when viewMode is "card"', () => {
    render(<ViewToggle viewMode="card" onToggle={() => {}} />);
    const listBtn = screen.getByLabelText('List view');
    const cardBtn = screen.getByLabelText('Card view');
    expect(cardBtn.className).toContain('bg-aqua');
    expect(cardBtn.className).toContain('text-onyx');
    expect(listBtn.className).toContain('text-gray-2');
  });

  it('calls onToggle with "card" when card button is clicked', () => {
    const onToggle = vi.fn();
    render(<ViewToggle viewMode="list" onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Card view'));
    expect(onToggle).toHaveBeenCalledWith('card');
  });

  it('calls onToggle with "list" when list button is clicked', () => {
    const onToggle = vi.fn();
    render(<ViewToggle viewMode="card" onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('List view'));
    expect(onToggle).toHaveBeenCalledWith('list');
  });

  it('applies disabled styling and prevents interaction when disabled', () => {
    const onToggle = vi.fn();
    render(<ViewToggle viewMode="list" onToggle={onToggle} disabled />);
    const listBtn = screen.getByLabelText('List view');
    const cardBtn = screen.getByLabelText('Card view');
    expect(listBtn).toBeDisabled();
    expect(cardBtn).toBeDisabled();
    // Container should have opacity and pointer-events-none
    const container = listBtn.parentElement!;
    expect(container.className).toContain('opacity-50');
    expect(container.className).toContain('pointer-events-none');
  });

  it('sets aria-pressed correctly for active mode', () => {
    render(<ViewToggle viewMode="list" onToggle={() => {}} />);
    expect(screen.getByLabelText('List view')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Card view')).toHaveAttribute('aria-pressed', 'false');
  });
});
