import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SellerCard } from '../seller-card';
import { SellerUpdateReminder } from '../seller-update-reminder';
import { ViewingSellerStatus } from '../../viewings/viewing-seller-status';

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─── SellerCard ──────────────────────────────────────────────────────────────

describe('SellerCard', () => {
  const baseSeller = {
    id: 'seller-1',
    full_name: 'Jane Smith',
    phone: '+6591234567',
    email: 'jane@example.com',
  };

  const baseSellerLead = {
    id: 'lead-1',
    status: 'new_lead' as const,
    is_active: true,
  };

  it('renders seller name, phone, and email when all fields present', () => {
    render(
      <SellerCard seller={baseSeller} sellerLead={baseSellerLead} listingId="listing-1" />
    );

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('+6591234567')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('omits email when seller email is null', () => {
    const sellerNoEmail = { ...baseSeller, email: null };
    render(
      <SellerCard seller={sellerNoEmail} sellerLead={baseSellerLead} listingId="listing-1" />
    );

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('+6591234567')).toBeInTheDocument();
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
  });

  it('renders contact profile link pointing to correct URL', () => {
    render(
      <SellerCard seller={baseSeller} sellerLead={baseSellerLead} listingId="listing-1" />
    );

    const link = screen.getByText('Jane Smith').closest('a');
    expect(link).toHaveAttribute('href', '/contacts/seller-1');
  });

  it('displays pipeline stage label when seller has active lead', () => {
    render(
      <SellerCard seller={baseSeller} sellerLead={baseSellerLead} listingId="listing-1" />
    );

    expect(screen.getByText('New Lead')).toBeInTheDocument();
  });

  it('omits pipeline stage when sellerLead is null', () => {
    render(
      <SellerCard seller={baseSeller} sellerLead={null} listingId="listing-1" />
    );

    expect(screen.queryByText('New Lead')).not.toBeInTheDocument();
  });

  it('omits pipeline stage when sellerLead is_active is false', () => {
    const inactiveLead = { ...baseSellerLead, is_active: false };
    render(
      <SellerCard seller={baseSeller} sellerLead={inactiveLead} listingId="listing-1" />
    );

    expect(screen.queryByText('New Lead')).not.toBeInTheDocument();
  });

  it('shows CTA with "Attach Seller" link when no seller', () => {
    render(
      <SellerCard seller={null} sellerLead={null} listingId="listing-42" />
    );

    expect(screen.getByText('No seller attached')).toBeInTheDocument();
    const attachLink = screen.getByText('Attach Seller');
    expect(attachLink).toBeInTheDocument();
    expect(attachLink.closest('a')).toHaveAttribute('href', '/listings/listing-42/edit');
  });

  it('renders "Message Seller" link when seller has phone', () => {
    render(
      <SellerCard seller={baseSeller} sellerLead={baseSellerLead} listingId="listing-1" />
    );

    const messageLink = screen.getByText('Message Seller');
    expect(messageLink.closest('a')).toHaveAttribute(
      'href',
      '/messages/seller-1?lead=lead-1'
    );
  });

  it('renders message link without lead param when sellerLead is null', () => {
    render(
      <SellerCard seller={baseSeller} sellerLead={null} listingId="listing-1" />
    );

    const messageLink = screen.getByText('Message Seller');
    expect(messageLink.closest('a')).toHaveAttribute('href', '/messages/seller-1');
  });

  it('renders message link without lead param when sellerLead is_active is false', () => {
    const inactiveLead = { ...baseSellerLead, is_active: false };
    render(
      <SellerCard seller={baseSeller} sellerLead={inactiveLead} listingId="listing-1" />
    );

    const messageLink = screen.getByText('Message Seller');
    expect(messageLink.closest('a')).toHaveAttribute('href', '/messages/seller-1');
  });

  it('disables message action and shows "Phone required" when seller has no phone', () => {
    const sellerNoPhone = { ...baseSeller, phone: '' };
    render(
      <SellerCard seller={sellerNoPhone} sellerLead={baseSellerLead} listingId="listing-1" />
    );

    // Should not have a clickable message link
    expect(screen.queryByText('Message Seller')?.closest('a')).not.toBeInTheDocument();
    // Should show disabled state with "Phone required" indicator
    expect(screen.getByText('Phone required')).toBeInTheDocument();
  });
});

// ─── SellerUpdateReminder ────────────────────────────────────────────────────

describe('SellerUpdateReminder', () => {
  it('renders correct count when pendingCount > 0', () => {
    render(<SellerUpdateReminder pendingCount={3} />);

    // The count appears in both the badge and the text body
    const countElements = screen.getAllByText('3');
    expect(countElements.length).toBe(2);
    expect(screen.getByText(/viewings pending seller update/)).toBeInTheDocument();
  });

  it('uses singular "viewing" when pendingCount is 1', () => {
    render(<SellerUpdateReminder pendingCount={1} />);

    expect(screen.getByText(/viewing pending seller update/)).toBeInTheDocument();
    expect(screen.queryByText(/viewings pending seller update/)).not.toBeInTheDocument();
  });

  it('uses plural "viewings" when pendingCount > 1', () => {
    render(<SellerUpdateReminder pendingCount={5} />);

    expect(screen.getByText(/viewings pending seller update/)).toBeInTheDocument();
  });

  it('renders nothing when pendingCount is 0', () => {
    const { container } = render(<SellerUpdateReminder pendingCount={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when pendingCount is negative', () => {
    const { container } = render(<SellerUpdateReminder pendingCount={-1} />);
    expect(container.innerHTML).toBe('');
  });
});

// ─── ViewingSellerStatus ─────────────────────────────────────────────────────

describe('ViewingSellerStatus', () => {
  it('renders "Mark seller updated" button when sellerUpdated is false', () => {
    const onToggle = vi.fn();
    render(
      <ViewingSellerStatus
        viewingId="v-1"
        sellerUpdated={false}
        sellerUpdatedAt={null}
        onToggle={onToggle}
      />
    );

    expect(screen.getByText('Mark seller updated')).toBeInTheDocument();
  });

  it('calls onToggle with viewingId and true when button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <ViewingSellerStatus
        viewingId="v-1"
        sellerUpdated={false}
        sellerUpdatedAt={null}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByText('Mark seller updated'));
    expect(onToggle).toHaveBeenCalledWith('v-1', true);
  });

  it('renders "Seller updated" status when sellerUpdated is true', () => {
    const onToggle = vi.fn();
    render(
      <ViewingSellerStatus
        viewingId="v-1"
        sellerUpdated={true}
        sellerUpdatedAt="2025-01-15T10:30:00.000Z"
        onToggle={onToggle}
      />
    );

    expect(screen.getByText('Seller updated')).toBeInTheDocument();
  });

  it('displays formatted timestamp when sellerUpdated is true and timestamp provided', () => {
    const onToggle = vi.fn();
    render(
      <ViewingSellerStatus
        viewingId="v-1"
        sellerUpdated={true}
        sellerUpdatedAt="2025-01-15T10:30:00.000Z"
        onToggle={onToggle}
      />
    );

    // date-fns format: 'd MMM yyyy, h:mm a'
    // 2025-01-15T10:30:00.000Z → depends on local timezone, but the format pattern is consistent
    // We check that some formatted date text is present
    const timestampEl = screen.getByText(/Jan 2025/);
    expect(timestampEl).toBeInTheDocument();
  });

  it('does not display timestamp when sellerUpdatedAt is null', () => {
    const onToggle = vi.fn();
    render(
      <ViewingSellerStatus
        viewingId="v-1"
        sellerUpdated={true}
        sellerUpdatedAt={null}
        onToggle={onToggle}
      />
    );

    expect(screen.getByText('Seller updated')).toBeInTheDocument();
    // No timestamp element should be present
    expect(screen.queryByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).not.toBeInTheDocument();
  });

  it('does not call onToggle when already marked as updated', () => {
    const onToggle = vi.fn();
    render(
      <ViewingSellerStatus
        viewingId="v-1"
        sellerUpdated={true}
        sellerUpdatedAt="2025-01-15T10:30:00.000Z"
        onToggle={onToggle}
      />
    );

    // When sellerUpdated is true, there's no button to click — it shows a status badge
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
