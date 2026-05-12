// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DetailPanel, type DetailPanelProps } from '../detail-panel';

const mockContact: DetailPanelProps['contact'] = {
  id: 'contact-1',
  full_name: 'Alice Tan',
  phone: '+6591234567',
  email: 'alice@example.com',
  consent_badge: 'green',
  consent: {
    whatsapp_optin: true,
    consent_given_at: '2024-01-15T08:00:00Z',
    consent_source: 'web_form',
    ad_purpose: 'property_sale',
    data_retention_expiry: '2025-01-15T00:00:00Z',
    channel_preference: 'whatsapp',
  },
  owned_property: {
    owned_property_type: 'hdb',
    owned_property_label: 'Blk 123 Ang Mo Kio Ave 3',
    owned_property_town: 'Ang Mo Kio',
    owned_property_flat_type: '4-room',
    mop_date: '2026-06-15',
  },
};

const mockTimelines: DetailPanelProps['playbookTimelines'] = [
  {
    playbook_id: 'pb-1',
    playbook_name: 'HDB MOP Nurture',
    steps: [
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
    ],
  },
  {
    playbook_id: 'pb-2',
    playbook_name: 'Upgrade Nurture',
    steps: [
      {
        id: 'step-3',
        title: 'Upgrade intro',
        channel: 'email',
        offset_days: 0,
        status: 'future',
        due_at: '2024-07-01T00:00:00Z',
      },
    ],
  },
];

const mockActivePlaybooks = [
  { id: 'pb-1', name: 'HDB MOP Nurture' },
  { id: 'pb-2', name: 'Upgrade Nurture' },
];

function renderPanel(overrides: Partial<DetailPanelProps> = {}) {
  const defaultProps: DetailPanelProps = {
    open: true,
    onClose: vi.fn(),
    contact: mockContact,
    playbookTimelines: mockTimelines,
    activePlaybooks: mockActivePlaybooks,
    onCreateAdHocTask: vi.fn(),
    ...overrides,
  };
  return render(<DetailPanel {...defaultProps} />);
}

describe('DetailPanel', () => {
  it('renders nothing when open is false', () => {
    const { container } = renderPanel({ open: false });
    expect(container.innerHTML).toBe('');
  });

  it('renders contact name in the header', () => {
    renderPanel();
    expect(screen.getByText('Alice Tan')).toBeInTheDocument();
  });

  it('displays consent badge with correct label', () => {
    renderPanel();
    expect(screen.getByText('Valid consent')).toBeInTheDocument();
  });

  it('displays yellow consent badge', () => {
    renderPanel({
      contact: { ...mockContact, consent_badge: 'yellow' },
    });
    expect(screen.getByText('Partial consent')).toBeInTheDocument();
  });

  it('displays red consent badge', () => {
    renderPanel({
      contact: { ...mockContact, consent_badge: 'red' },
    });
    expect(screen.getByText('No consent')).toBeInTheDocument();
  });

  describe('Owned Property Summary (Req 7.5)', () => {
    it('displays property type', () => {
      renderPanel();
      expect(screen.getByText('HDB')).toBeInTheDocument();
    });

    it('displays property label', () => {
      renderPanel();
      expect(screen.getByText('Blk 123 Ang Mo Kio Ave 3')).toBeInTheDocument();
    });

    it('displays property town', () => {
      renderPanel();
      expect(screen.getByText('Ang Mo Kio')).toBeInTheDocument();
    });

    it('displays flat type', () => {
      renderPanel();
      expect(screen.getByText('4-room')).toBeInTheDocument();
    });

    it('displays MOP date', () => {
      renderPanel();
      expect(screen.getByText('15 Jun 2026')).toBeInTheDocument();
    });
  });

  describe('Consent Details (Req 7.3)', () => {
    it('displays WhatsApp opt-in status', () => {
      renderPanel();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('displays consent given date', () => {
      renderPanel();
      expect(screen.getByText('15 Jan 2024')).toBeInTheDocument();
    });

    it('displays consent source', () => {
      renderPanel();
      expect(screen.getByText('web_form')).toBeInTheDocument();
    });

    it('displays ad purpose', () => {
      renderPanel();
      expect(screen.getByText('property_sale')).toBeInTheDocument();
    });

    it('displays channel preference', () => {
      renderPanel();
      expect(screen.getByText('whatsapp')).toBeInTheDocument();
    });
  });

  describe('Playbook Timelines (Req 7.2)', () => {
    it('renders separate timeline per playbook', () => {
      renderPanel();
      expect(screen.getByText('HDB MOP Nurture')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Nurture')).toBeInTheDocument();
    });

    it('renders step titles within timelines', () => {
      renderPanel();
      expect(screen.getByText('Initial outreach')).toBeInTheDocument();
      expect(screen.getByText('Follow-up call')).toBeInTheDocument();
      expect(screen.getByText('Upgrade intro')).toBeInTheDocument();
    });

    it('shows empty state when no playbook timelines', () => {
      renderPanel({ playbookTimelines: [] });
      expect(screen.getByText('Not enrolled in any playbooks')).toBeInTheDocument();
    });
  });

  describe('Ad-Hoc Task Creation (Req 7.4)', () => {
    it('shows create ad-hoc task button', () => {
      renderPanel();
      expect(screen.getByRole('button', { name: 'Create Ad-Hoc Task' })).toBeInTheDocument();
    });

    it('shows form when button is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Create Ad-Hoc Task' }));
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Channel')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Playbook')).toBeInTheDocument();
    });

    it('validates title is required', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Create Ad-Hoc Task' }));
      fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('validates due date is required', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Create Ad-Hoc Task' }));
      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test task' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));
      expect(screen.getByText('Due date is required')).toBeInTheDocument();
    });

    it('calls onCreateAdHocTask with correct payload', () => {
      const onCreateAdHocTask = vi.fn();
      renderPanel({ onCreateAdHocTask });
      fireEvent.click(screen.getByRole('button', { name: 'Create Ad-Hoc Task' }));

      // Use a date far in the future to avoid test flakiness
      const futureDate = '2099-12-01';

      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Follow up' } });
      fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'call' } });
      fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: futureDate } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));

      expect(onCreateAdHocTask).toHaveBeenCalledWith({
        contact_id: 'contact-1',
        playbook_id: 'pb-1',
        channel: 'call',
        due_at: expect.any(String),
        title: 'Follow up',
      });
    });

    it('hides form when cancel is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Create Ad-Hoc Task' }));
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    });
  });

  describe('Close behavior (Req 7.1)', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderPanel({ onClose });
      fireEvent.click(screen.getByLabelText('Close panel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      renderPanel({ onClose });
      // The backdrop is the first div with bg-black/50
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (backdrop) fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('has accessible dialog role', () => {
    renderPanel();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
