import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DetailPanel } from '../detail-panel';
import type { EnrichedNurtureTask, PlaybookStepStatus } from '@/lib/nurture/types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<EnrichedNurtureTask> = {}): EnrichedNurtureTask {
  return {
    id: 'task-1',
    contact_id: 'contact-1',
    contact_name: 'Alice Tan',
    contact_phone: '91234567',
    owned_property_summary: 'HDB · Ang Mo Kio',
    owned_property_label: 'Blk 123 Ang Mo Kio Ave 3',
    owned_property_town: 'Ang Mo Kio',
    owned_property_type: 'hdb',
    owned_property_flat_type: '4-room',
    mop_date: '2026-06-15',
    segment_tags: ['hdb-owner'],
    next_action_title: 'Follow-up call',
    due_at: '2024-12-01T08:00:00Z',
    last_activity_date: '2024-11-28T10:00:00Z',
    consent_badge: 'green',
    channel: 'whatsapp',
    playbook_name: 'HDB MOP Nurture',
    status: 'pending',
    playbook_steps: [
      { step_number: 1, title: 'Initial outreach', channel: 'whatsapp', status: 'done' },
      { step_number: 2, title: 'Follow-up call', channel: 'call', status: 'pending' },
      { step_number: 3, title: 'Property valuation', channel: 'email', status: 'upcoming' },
    ],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DetailPanel', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  // ─── Slide Transition (Req 6.1) ─────────────────────────────────────────

  describe('Slide transition', () => {
    it('renders with translate-x-0 when task is provided (visible)', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      const panel = screen.getByRole('dialog');
      expect(panel.className).toContain('translate-x-0');
      expect(panel.className).not.toContain('translate-x-full');
    });

    it('renders with translate-x-full when task is null (hidden)', () => {
      render(<DetailPanel task={null} onClose={vi.fn()} />);
      const panel = screen.getByRole('dialog', { hidden: true });
      expect(panel.className).toContain('translate-x-full');
      expect(panel.className).not.toContain('translate-x-0');
    });

    it('has 300ms transition duration class', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      const panel = screen.getByRole('dialog');
      expect(panel.className).toContain('duration-300');
    });
  });

  // ─── Contact Header (Req 6.1) ───────────────────────────────────────────

  describe('Contact header', () => {
    it('renders avatar with initials from contact name', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByText('AT')).toBeInTheDocument();
    });

    it('renders single initial for single-word name', () => {
      render(<DetailPanel task={makeTask({ contact_name: 'Madonna' })} onClose={vi.fn()} />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('renders contact name', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByText('Alice Tan')).toBeInTheDocument();
    });

    it('renders consent chip with correct label for green consent', () => {
      render(<DetailPanel task={makeTask({ consent_badge: 'green' })} onClose={vi.fn()} />);
      expect(screen.getByText('Valid consent')).toBeInTheDocument();
    });

    it('renders consent chip with correct label for yellow consent', () => {
      render(<DetailPanel task={makeTask({ consent_badge: 'yellow' })} onClose={vi.fn()} />);
      expect(screen.getByText('Partial consent')).toBeInTheDocument();
    });

    it('renders consent chip with correct label for red consent', () => {
      render(<DetailPanel task={makeTask({ consent_badge: 'red' })} onClose={vi.fn()} />);
      expect(screen.getByText('No consent')).toBeInTheDocument();
    });
  });

  // ─── Quick Actions (Req 6.10) ───────────────────────────────────────────

  describe('Quick Actions', () => {
    it('renders WhatsApp and Call buttons', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Call/i })).toBeInTheDocument();
    });

    it('WhatsApp button navigates to message thread on click', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /WhatsApp/i }));
      expect(mockPush).toHaveBeenCalledWith('/messages/contact-1?nurture_task=task-1');
    });

    it('disables WhatsApp and Call buttons for red consent (Req 6.10)', () => {
      render(<DetailPanel task={makeTask({ consent_badge: 'red' })} onClose={vi.fn()} />);
      const whatsappBtn = screen.getByRole('button', { name: /WhatsApp/i });
      const callBtn = screen.getByRole('button', { name: /Call/i });
      expect(whatsappBtn).toBeDisabled();
      expect(callBtn).toBeDisabled();
    });

    it('does not navigate when WhatsApp is clicked with red consent', () => {
      render(<DetailPanel task={makeTask({ consent_badge: 'red' })} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /WhatsApp/i }));
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ─── Contact Info (Req 6.13) ────────────────────────────────────────────

  describe('Contact Info', () => {
    it('renders phone number formatted', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByText('+65 9123 4567')).toBeInTheDocument();
    });

    it('renders email when present', () => {
      render(
        <DetailPanel
          task={makeTask()}
          onClose={vi.fn()}
        />
      );
      // The component casts to EnrichedNurtureTaskWithEmail and uses .email
      // When no email field exists, it shows "–"
      expect(screen.getByText('–')).toBeInTheDocument();
    });

    it('renders "–" when email is missing (Req 6.13)', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      // The email field is not part of EnrichedNurtureTask, so it defaults to "–"
      const emailSection = screen.getByText('Email').closest('div');
      expect(emailSection?.parentElement).toHaveTextContent('–');
    });
  });

  // ─── Owned Property (Req 6.11) ─────────────────────────────────────────

  describe('Owned Property section', () => {
    it('renders when property data exists', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByText('Owned Property')).toBeInTheDocument();
      expect(screen.getByText('HDB')).toBeInTheDocument();
      expect(screen.getByText('Blk 123 Ang Mo Kio Ave 3')).toBeInTheDocument();
      expect(screen.getByText('Ang Mo Kio')).toBeInTheDocument();
      expect(screen.getByText('4-room')).toBeInTheDocument();
    });

    it('is hidden when property type is "none" and all fields are null (Req 6.11)', () => {
      render(
        <DetailPanel
          task={makeTask({
            owned_property_type: 'none',
            owned_property_label: null,
            owned_property_town: null,
            owned_property_flat_type: null,
            mop_date: null,
          })}
          onClose={vi.fn()}
        />
      );
      expect(screen.queryByText('Owned Property')).not.toBeInTheDocument();
    });

    it('is shown when property type is "none" but label exists', () => {
      render(
        <DetailPanel
          task={makeTask({
            owned_property_type: 'none',
            owned_property_label: 'Some label',
            owned_property_town: null,
            owned_property_flat_type: null,
            mop_date: null,
          })}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('Owned Property')).toBeInTheDocument();
    });

    it('renders MOP date formatted', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByText('15 Jun 2026')).toBeInTheDocument();
    });
  });

  // ─── Playbook Progress (Req 6.12) ──────────────────────────────────────

  describe('Playbook Progress section', () => {
    it('renders timeline when steps exist', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByText('Playbook Progress')).toBeInTheDocument();
      expect(screen.getByText('Initial outreach')).toBeInTheDocument();
      expect(screen.getByText('Follow-up call')).toBeInTheDocument();
      expect(screen.getByText('Property valuation')).toBeInTheDocument();
    });

    it('shows "No active playbook" when no steps (Req 6.12)', () => {
      render(
        <DetailPanel
          task={makeTask({ playbook_steps: null })}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('No active playbook')).toBeInTheDocument();
    });

    it('shows "No active playbook" when steps array is empty', () => {
      render(
        <DetailPanel
          task={makeTask({ playbook_steps: [] })}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('No active playbook')).toBeInTheDocument();
    });

    it('renders timeline with accessible label', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByLabelText('Playbook progress timeline')).toBeInTheDocument();
    });
  });

  // ─── Create Ad-Hoc Task Button ─────────────────────────────────────────

  describe('Create Ad-Hoc Task button', () => {
    it('renders "+ Create Ad-Hoc Task" button', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Create Ad-Hoc Task/i })).toBeInTheDocument();
    });

    it('calls onCreateAdHocTask when clicked', () => {
      const onCreateAdHocTask = vi.fn();
      render(
        <DetailPanel task={makeTask()} onClose={vi.fn()} onCreateAdHocTask={onCreateAdHocTask} />
      );
      fireEvent.click(screen.getByRole('button', { name: /Create Ad-Hoc Task/i }));
      expect(onCreateAdHocTask).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Close Behavior ────────────────────────────────────────────────────

  describe('Close behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<DetailPanel task={makeTask()} onClose={onClose} />);
      fireEvent.click(screen.getByLabelText('Close panel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<DetailPanel task={makeTask()} onClose={onClose} />);
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has accessible dialog role', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal=true', () => {
      render(<DetailPanel task={makeTask()} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-hidden=true when panel is closed', () => {
      render(<DetailPanel task={null} onClose={vi.fn()} />);
      const panel = screen.getByRole('dialog', { hidden: true });
      expect(panel).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
