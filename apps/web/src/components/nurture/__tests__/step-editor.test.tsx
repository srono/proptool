import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StepEditor } from '../step-editor';
import type { PlaybookStep } from '@/lib/nurture/types';

function makeStep(overrides: Partial<PlaybookStep> = {}): PlaybookStep {
  return {
    id: crypto.randomUUID(),
    offset_days: 0,
    channel: 'whatsapp',
    template_id: null,
    create_task: true,
    title: 'Test step',
    ...overrides,
  };
}

describe('StepEditor', () => {
  it('renders empty state when no steps', () => {
    render(<StepEditor value={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/no steps yet/i)).toBeInTheDocument();
    expect(screen.getByText('(0/50)')).toBeInTheDocument();
  });

  it('renders steps with their titles', () => {
    const steps = [makeStep({ title: 'First step' }), makeStep({ title: 'Second step' })];
    render(<StepEditor value={steps} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('First step')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Second step')).toBeInTheDocument();
    expect(screen.getByText('(2/50)')).toBeInTheDocument();
  });

  it('calls onChange with a new step when Add Step is clicked', () => {
    const onChange = vi.fn();
    render(<StepEditor value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /add step/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newSteps = onChange.mock.calls[0][0];
    expect(newSteps).toHaveLength(1);
    expect(newSteps[0].title).toBe('');
    expect(newSteps[0].offset_days).toBe(0);
    expect(newSteps[0].channel).toBe('whatsapp');
    expect(newSteps[0].template_id).toBeNull();
  });

  it('calls onChange without the removed step when remove is clicked', () => {
    const step1 = makeStep({ title: 'Keep' });
    const step2 = makeStep({ title: 'Remove' });
    const onChange = vi.fn();
    render(<StepEditor value={[step1, step2]} onChange={onChange} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove step/i });
    fireEvent.click(removeButtons[1]);

    expect(onChange).toHaveBeenCalledWith([step1]);
  });

  it('moves a step up when move up is clicked', () => {
    const step1 = makeStep({ title: 'First' });
    const step2 = makeStep({ title: 'Second' });
    const onChange = vi.fn();
    render(<StepEditor value={[step1, step2]} onChange={onChange} />);

    const moveUpButtons = screen.getAllByRole('button', { name: /move step.*up/i });
    fireEvent.click(moveUpButtons[1]);

    expect(onChange).toHaveBeenCalledWith([step2, step1]);
  });

  it('moves a step down when move down is clicked', () => {
    const step1 = makeStep({ title: 'First' });
    const step2 = makeStep({ title: 'Second' });
    const onChange = vi.fn();
    render(<StepEditor value={[step1, step2]} onChange={onChange} />);

    const moveDownButtons = screen.getAllByRole('button', { name: /move step.*down/i });
    fireEvent.click(moveDownButtons[0]);

    expect(onChange).toHaveBeenCalledWith([step2, step1]);
  });

  it('disables move up for first step and move down for last step', () => {
    const steps = [makeStep({ title: 'Only' })];
    render(<StepEditor value={steps} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /move step 1 up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move step 1 down/i })).toBeDisabled();
  });

  it('updates offset_days when input changes', () => {
    const step = makeStep({ offset_days: 5 });
    const onChange = vi.fn();
    render(<StepEditor value={[step]} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '30' } });

    const updated = onChange.mock.calls[0][0];
    expect(updated[0].offset_days).toBe(30);
  });

  it('updates channel when selector changes', () => {
    const step = makeStep({ channel: 'whatsapp' });
    const onChange = vi.fn();
    render(<StepEditor value={[step]} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('WhatsApp'), { target: { value: 'call' } });

    const updated = onChange.mock.calls[0][0];
    expect(updated[0].channel).toBe('call');
    expect(updated[0].template_id).toBeNull();
  });

  it('shows template selector only for whatsapp and email channels', () => {
    const templates = [{ id: 't1', name: 'Template 1', channel: 'whatsapp' as const }];
    const whatsappStep = makeStep({ channel: 'whatsapp' });
    const callStep = makeStep({ channel: 'call' });

    const { rerender } = render(
      <StepEditor value={[whatsappStep]} onChange={vi.fn()} templates={templates} />
    );
    expect(screen.getByText('Template 1')).toBeInTheDocument();

    rerender(<StepEditor value={[callStep]} onChange={vi.fn()} templates={templates} />);
    expect(screen.queryByText('Template 1')).not.toBeInTheDocument();
  });

  it('shows inline validation error for offset_days out of range', () => {
    const step = makeStep({ offset_days: 400 });
    render(<StepEditor value={[step]} onChange={vi.fn()} />);

    expect(screen.getByText(/must be between -365 and 365/i)).toBeInTheDocument();
  });

  it('shows inline validation error for empty title', () => {
    const step = makeStep({ title: '' });
    render(<StepEditor value={[step]} onChange={vi.fn()} />);

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows inline validation error for title exceeding 80 chars', () => {
    const step = makeStep({ title: 'a'.repeat(81) });
    render(<StepEditor value={[step]} onChange={vi.fn()} />);

    expect(screen.getByText(/must be 80 characters or fewer/i)).toBeInTheDocument();
  });

  it('shows max steps warning when 50 steps reached', () => {
    const steps = Array.from({ length: 50 }, (_, i) => makeStep({ title: `Step ${i + 1}` }));
    render(<StepEditor value={steps} onChange={vi.fn()} />);

    expect(screen.getByText(/maximum of 50 steps reached/i)).toBeInTheDocument();
  });

  it('disables add step button when 50 steps reached', () => {
    const steps = Array.from({ length: 50 }, (_, i) => makeStep({ title: `Step ${i + 1}` }));
    render(<StepEditor value={steps} onChange={vi.fn()} />);

    const addButtons = screen.getAllByRole('button', { name: /add step/i });
    addButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('disables all inputs when disabled prop is true', () => {
    const step = makeStep({ title: 'Test' });
    render(<StepEditor value={[step]} onChange={vi.fn()} disabled />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => expect(input).toBeDisabled());

    const spinbuttons = screen.getAllByRole('spinbutton');
    spinbuttons.forEach((input) => expect(input).toBeDisabled());
  });

  it('filters templates by step channel', () => {
    const templates = [
      { id: 't1', name: 'WA Template', channel: 'whatsapp' as const },
      { id: 't2', name: 'Email Template', channel: 'email' as const },
    ];
    const step = makeStep({ channel: 'email' });
    render(<StepEditor value={[step]} onChange={vi.fn()} templates={templates} />);

    expect(screen.getByText('Email Template')).toBeInTheDocument();
    expect(screen.queryByText('WA Template')).not.toBeInTheDocument();
  });
});
