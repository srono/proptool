// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlaybookTimeline, type TimelineStep } from '../playbook-timeline';

describe('PlaybookTimeline', () => {
  const baseSteps: TimelineStep[] = [
    {
      id: 'step-1',
      title: 'Initial outreach',
      channel: 'whatsapp',
      offset_days: -30,
      status: 'done',
      completed_at: '2024-06-01T10:00:00Z',
      due_at: '2024-06-01T00:00:00Z',
    },
    {
      id: 'step-2',
      title: 'Follow-up call',
      channel: 'call',
      offset_days: -14,
      status: 'pending',
      due_at: '2024-06-15T00:00:00Z',
    },
    {
      id: 'step-3',
      title: 'MOP reminder',
      channel: 'whatsapp',
      offset_days: 0,
      status: 'future',
      due_at: '2024-07-01T00:00:00Z',
    },
    {
      id: 'step-4',
      title: 'Final check-in',
      channel: 'email',
      offset_days: 14,
      status: 'future',
      due_at: null,
    },
  ];

  it('renders the playbook name as heading', () => {
    render(<PlaybookTimeline playbookName="HDB MOP Nurture" steps={baseSteps} />);
    expect(screen.getByText('HDB MOP Nurture')).toBeInTheDocument();
  });

  it('renders all step titles', () => {
    render(<PlaybookTimeline playbookName="Test" steps={baseSteps} />);
    expect(screen.getByText('Initial outreach')).toBeInTheDocument();
    expect(screen.getByText('Follow-up call')).toBeInTheDocument();
    expect(screen.getByText('MOP reminder')).toBeInTheDocument();
    expect(screen.getByText('Final check-in')).toBeInTheDocument();
  });

  it('shows completion date for completed steps', () => {
    render(<PlaybookTimeline playbookName="Test" steps={baseSteps} />);
    expect(screen.getByText('Completed 1 Jun 2024')).toBeInTheDocument();
  });

  it('shows due date for pending steps', () => {
    render(<PlaybookTimeline playbookName="Test" steps={baseSteps} />);
    expect(screen.getByText('Due 15 Jun 2024')).toBeInTheDocument();
  });

  it('shows scheduled date for future steps with due_at', () => {
    render(<PlaybookTimeline playbookName="Test" steps={baseSteps} />);
    expect(screen.getByText('Scheduled 1 Jul 2024')).toBeInTheDocument();
  });

  it('shows offset days for future steps without due_at', () => {
    render(<PlaybookTimeline playbookName="Test" steps={baseSteps} />);
    expect(screen.getByText('Day +14')).toBeInTheDocument();
  });

  it('renders channel labels', () => {
    render(<PlaybookTimeline playbookName="Test" steps={baseSteps} />);
    const whatsappLabels = screen.getAllByText('WhatsApp');
    expect(whatsappLabels.length).toBe(2);
    expect(screen.getByText('Call')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders empty state when no steps', () => {
    render(<PlaybookTimeline playbookName="Empty" steps={[]} />);
    expect(screen.getByText('No steps in this playbook')).toBeInTheDocument();
  });

  it('shows snoozed indicator for snoozed steps', () => {
    const snoozedSteps: TimelineStep[] = [
      {
        id: 'step-1',
        title: 'Snoozed step',
        channel: 'whatsapp',
        offset_days: 0,
        status: 'snoozed',
        due_at: '2024-07-10T00:00:00Z',
      },
    ];
    render(<PlaybookTimeline playbookName="Test" steps={snoozedSteps} />);
    expect(screen.getByText('(snoozed)')).toBeInTheDocument();
  });

  it('shows skipped status for skipped steps', () => {
    const skippedSteps: TimelineStep[] = [
      {
        id: 'step-1',
        title: 'Skipped step',
        channel: 'call',
        offset_days: -7,
        status: 'skipped',
        completed_at: '2024-06-05T10:00:00Z',
      },
    ];
    render(<PlaybookTimeline playbookName="Test" steps={skippedSteps} />);
    expect(screen.getByText('Skipped 5 Jun 2024')).toBeInTheDocument();
  });

  it('has accessible timeline label', () => {
    render(<PlaybookTimeline playbookName="HDB Nurture" steps={baseSteps} />);
    expect(screen.getByLabelText('Timeline for HDB Nurture')).toBeInTheDocument();
  });
});
