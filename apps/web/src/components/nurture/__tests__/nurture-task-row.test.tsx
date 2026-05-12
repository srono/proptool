import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NurtureTaskRowComponent } from '../nurture-task-row';
import type { EnrichedNurtureTask } from '@/lib/nurture/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<EnrichedNurtureTask> = {}): EnrichedNurtureTask {
  return {
    id: 'task-1',
    contact_id: 'contact-1',
    contact_name: 'John Doe',
    owned_property_summary: 'Condo · Tampines',
    segment_tags: ['buyer'],
    next_action_title: 'Send follow-up WhatsApp',
    due_at: '2025-01-15T08:00:00.000Z',
    last_activity_date: '2025-01-14T10:00:00.000Z',
    consent_badge: 'green',
    channel: 'whatsapp',
    playbook_name: 'New Buyer Nurture',
    status: 'pending',
    contact_phone: '91234567',
    owned_property_label: 'Tampines GreenView',
    owned_property_town: 'Tampines',
    owned_property_type: 'Condo',
    owned_property_flat_type: null,
    mop_date: null,
    playbook_steps: null,
    ...overrides,
  };
}

function defaultProps(overrides: Partial<Parameters<typeof NurtureTaskRowComponent>[0]> = {}) {
  return {
    task: makeTask(),
    density: 'comfortable' as const,
    showLastActivity: true,
    onOpenWhatsApp: vi.fn(),
    onCall: vi.fn(),
    onSnooze: vi.fn(),
    onMarkDone: vi.fn(),
    onRowClick: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NurtureTaskRowComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set system time to 2025-01-15 12:00 SGT (04:00 UTC)
    // This makes due_at '2025-01-15T08:00:00.000Z' classify as "today" in SGT
    vi.setSystemTime(new Date('2025-01-15T04:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Urgency Color Bar ───────────────────────────────────────────────────

  describe('urgency color bar', () => {
    it('renders red (#EF4444) color bar for overdue tasks', () => {
      // due_at before start of current day in SGT (Jan 15 midnight SGT = Jan 14 16:00 UTC)
      const task = makeTask({ due_at: '2025-01-14T00:00:00.000Z' });
      const { container } = render(<NurtureTaskRowComponent {...defaultProps({ task })} />);

      const colorBar = container.querySelector('[aria-hidden="true"].absolute.left-0');
      expect(colorBar).toHaveStyle({ backgroundColor: '#EF4444' });
    });

    it('renders amber (#F59E0B) color bar for today tasks', () => {
      // due_at within current day in SGT
      const task = makeTask({ due_at: '2025-01-15T08:00:00.000Z' });
      const { container } = render(<NurtureTaskRowComponent {...defaultProps({ task })} />);

      const colorBar = container.querySelector('[aria-hidden="true"].absolute.left-0');
      expect(colorBar).toHaveStyle({ backgroundColor: '#F59E0B' });
    });

    it('renders gray (#6B7280) color bar for upcoming tasks', () => {
      // due_at after end of current day in SGT (Jan 16 midnight SGT = Jan 15 16:00 UTC)
      const task = makeTask({ due_at: '2025-01-16T16:00:00.000Z' });
      const { container } = render(<NurtureTaskRowComponent {...defaultProps({ task })} />);

      const colorBar = container.querySelector('[aria-hidden="true"].absolute.left-0');
      expect(colorBar).toHaveStyle({ backgroundColor: '#6B7280' });
    });
  });

  // ─── Density Modes ─────────────────────────────────────────────────────────

  describe('density modes', () => {
    it('applies py-4 padding and text-sm for comfortable density', () => {
      const { container } = render(
        <NurtureTaskRowComponent {...defaultProps({ density: 'comfortable' })} />
      );

      const row = container.querySelector('[role="row"]');
      expect(row?.className).toContain('py-4');

      // Contact name should have text-sm class
      const contactName = screen.getByTitle('John Doe');
      expect(contactName.className).toContain('text-sm');
    });

    it('applies py-2 padding and text-[13px] for compact density', () => {
      const { container } = render(
        <NurtureTaskRowComponent {...defaultProps({ density: 'compact' })} />
      );

      const row = container.querySelector('[role="row"]');
      expect(row?.className).toContain('py-2');

      // Contact name should have text-[13px] class
      const contactName = screen.getByTitle('John Doe');
      expect(contactName.className).toContain('text-[13px]');
    });
  });

  // ─── Consent-Disabled States ───────────────────────────────────────────────

  describe('consent-disabled states (red badge)', () => {
    it('disables primary channel button when consent is red', () => {
      const task = makeTask({ consent_badge: 'red' });
      render(<NurtureTaskRowComponent {...defaultProps({ task })} />);

      const primaryBtn = screen.getByLabelText('Action disabled — consent required');
      expect(primaryBtn).toBeDisabled();
      expect(primaryBtn.className).toContain('disabled:opacity-40');
      expect(primaryBtn.className).toContain('disabled:cursor-not-allowed');
    });

    it('disables mark-done button when consent is red', () => {
      const task = makeTask({ consent_badge: 'red' });
      render(<NurtureTaskRowComponent {...defaultProps({ task })} />);

      const markDoneBtn = screen.getByLabelText('Mark done disabled — consent required');
      expect(markDoneBtn).toBeDisabled();
      expect(markDoneBtn.className).toContain('disabled:opacity-40');
      expect(markDoneBtn.className).toContain('disabled:cursor-not-allowed');
    });

    it('keeps snooze button enabled when consent is red', () => {
      const task = makeTask({ consent_badge: 'red' });
      render(<NurtureTaskRowComponent {...defaultProps({ task })} />);

      const snoozeBtn = screen.getByLabelText('Snooze task');
      expect(snoozeBtn).not.toBeDisabled();
    });

    it('does not call onOpenWhatsApp when primary channel button is clicked with red consent', () => {
      const onOpenWhatsApp = vi.fn();
      const task = makeTask({ consent_badge: 'red', channel: 'whatsapp' });
      render(<NurtureTaskRowComponent {...defaultProps({ task, onOpenWhatsApp })} />);

      const primaryBtn = screen.getByLabelText('Action disabled — consent required');
      fireEvent.click(primaryBtn);
      expect(onOpenWhatsApp).not.toHaveBeenCalled();
    });

    it('does not call onMarkDone when mark-done button is clicked with red consent', () => {
      const onMarkDone = vi.fn();
      const task = makeTask({ consent_badge: 'red' });
      render(<NurtureTaskRowComponent {...defaultProps({ task, onMarkDone })} />);

      const markDoneBtn = screen.getByLabelText('Mark done disabled — consent required');
      fireEvent.click(markDoneBtn);
      expect(onMarkDone).not.toHaveBeenCalled();
    });
  });

  // ─── Text Truncation ───────────────────────────────────────────────────────

  describe('text truncation', () => {
    it('applies truncate class to contact name', () => {
      render(<NurtureTaskRowComponent {...defaultProps()} />);
      const contactName = screen.getByTitle('John Doe');
      expect(contactName.className).toContain('truncate');
    });

    it('applies truncate class to property summary', () => {
      render(<NurtureTaskRowComponent {...defaultProps()} />);
      const propertySummary = screen.getByTitle('Condo · Tampines');
      expect(propertySummary.className).toContain('truncate');
    });

    it('applies truncate class to action title', () => {
      render(<NurtureTaskRowComponent {...defaultProps()} />);
      const actionTitle = screen.getByTitle('Send follow-up WhatsApp');
      expect(actionTitle.className).toContain('truncate');
    });

    it('has title attribute on contact name for tooltip', () => {
      render(<NurtureTaskRowComponent {...defaultProps()} />);
      const contactName = screen.getByTitle('John Doe');
      expect(contactName).toHaveAttribute('title', 'John Doe');
    });

    it('has title attribute on property summary for tooltip', () => {
      render(<NurtureTaskRowComponent {...defaultProps()} />);
      const propertySummary = screen.getByTitle('Condo · Tampines');
      expect(propertySummary).toHaveAttribute('title', 'Condo · Tampines');
    });

    it('has title attribute on action title for tooltip', () => {
      render(<NurtureTaskRowComponent {...defaultProps()} />);
      const actionTitle = screen.getByTitle('Send follow-up WhatsApp');
      expect(actionTitle).toHaveAttribute('title', 'Send follow-up WhatsApp');
    });
  });

  // ─── Row Click ─────────────────────────────────────────────────────────────

  describe('row click', () => {
    it('triggers onRowClick callback when row is clicked', () => {
      const onRowClick = vi.fn();
      const task = makeTask();
      const { container } = render(
        <NurtureTaskRowComponent {...defaultProps({ task, onRowClick })} />
      );

      const row = container.querySelector('[role="row"]')!;
      fireEvent.click(row);
      expect(onRowClick).toHaveBeenCalledWith(task);
    });

    it('does not trigger onRowClick when action button area is clicked', () => {
      const onRowClick = vi.fn();
      const task = makeTask();
      render(<NurtureTaskRowComponent {...defaultProps({ task, onRowClick })} />);

      const snoozeBtn = screen.getByLabelText('Snooze task');
      fireEvent.click(snoozeBtn);
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  // ─── Show/Hide Last Activity ───────────────────────────────────────────────

  describe('showLastActivity prop', () => {
    it('shows last activity when showLastActivity is true', () => {
      // Set time so that last_activity_date is "18h ago" (within 24h)
      vi.setSystemTime(new Date('2025-01-15T04:00:00.000Z'));
      const task = makeTask({ last_activity_date: '2025-01-15T03:00:00.000Z' });
      render(
        <NurtureTaskRowComponent {...defaultProps({ task, showLastActivity: true })} />
      );

      // Should render some relative time text
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('hides last activity when showLastActivity is false', () => {
      const task = makeTask({ last_activity_date: '2025-01-14T10:00:00.000Z' });
      render(
        <NurtureTaskRowComponent {...defaultProps({ task, showLastActivity: false })} />
      );

      // Should not render any relative time text
      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    });
  });
});
