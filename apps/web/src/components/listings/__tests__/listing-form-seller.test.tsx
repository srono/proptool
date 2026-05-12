import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListingForm } from '../listing-form';

// --- Mocks ---

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: mockBack,
  }),
}));

const mockAddToast = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const mockAttachSeller = vi.fn();
const mockRemoveSeller = vi.fn();
const mockChangeSeller = vi.fn();
vi.mock('@/lib/services/seller-service', () => ({
  attachSeller: (...args: any[]) => mockAttachSeller(...args),
  removeSeller: (...args: any[]) => mockRemoveSeller(...args),
  changeSeller: (...args: any[]) => mockChangeSeller(...args),
}));

// Mock SellerContactPicker as a simple component that exposes onChange
let mockPickerOnChange: ((contact: any) => void) | null = null;
let mockPickerValue: any = null;

vi.mock('../seller-contact-picker', () => ({
  SellerContactPicker: ({ value, onChange }: { value: any; onChange: (c: any) => void }) => {
    mockPickerOnChange = onChange;
    mockPickerValue = value;
    return (
      <div data-testid="seller-contact-picker">
        {value && <span data-testid="picker-value">{value.full_name}</span>}
        <button
          data-testid="select-seller"
          type="button"
          onClick={() => onChange({ id: 'seller-1', full_name: 'John Seller', phone: '+6591111111' })}
        >
          Select Seller
        </button>
        <button
          data-testid="clear-seller"
          type="button"
          onClick={() => onChange(null)}
        >
          Clear Seller
        </button>
        <button
          data-testid="change-seller"
          type="button"
          onClick={() => onChange({ id: 'seller-2', full_name: 'Jane New', phone: '+6592222222' })}
        >
          Change Seller
        </button>
      </div>
    );
  },
}));

// Supabase mock helpers
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSelectSingle = vi.fn();
const mockGetUser = vi.fn();
const mockContactSelectResult = vi.fn();

function createMockSupabase() {
  return {
    from: (table: string) => {
      if (table === 'listings') {
        return {
          insert: (payload: any) => mockInsert(payload),
          update: (payload: any) => {
            mockUpdate(payload);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'contacts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockContactSelectResult(),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
    },
    auth: {
      getUser: () => mockGetUser(),
    },
  };
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createMockSupabase(),
}));

// --- Helpers ---

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '123 Test St' } });
  fireEvent.change(screen.getByLabelText(/postal code/i), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText(/property type/i), { target: { value: 'condo' } });
  fireEvent.change(screen.getByLabelText(/tenure/i), { target: { value: 'freehold' } });
  fireEvent.change(screen.getByLabelText(/floor area/i), { target: { value: '1000' } });
}

// --- Tests ---

describe('ListingForm seller integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPickerOnChange = null;
    mockPickerValue = null;
    // Default mock behaviors
    mockSelectSingle.mockResolvedValue({ data: { id: 'listing-new-1' }, error: null });
    mockInsert.mockReturnValue({ select: () => ({ single: () => mockSelectSingle() }) });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'tenant-1' } } });
    mockContactSelectResult.mockResolvedValue({ data: null });
    mockAttachSeller.mockResolvedValue({ success: true, sellerLead: null, leadCreationError: null });
    mockRemoveSeller.mockResolvedValue(undefined);
    mockChangeSeller.mockResolvedValue({ success: true, sellerLead: null, leadCreationError: null });
  });

  describe('saving with seller_contact_id', () => {
    it('includes seller_contact_id in payload when seller is selected', async () => {
      render(<ListingForm />);

      fillRequiredFields();

      // Select a seller via the mocked picker
      fireEvent.click(screen.getByTestId('select-seller'));

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /create listing/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_contact_id: 'seller-1',
          })
        );
      });
    });

    it('saves without seller_contact_id when no seller is selected', async () => {
      render(<ListingForm />);

      fillRequiredFields();

      // Do NOT select a seller — leave it null
      fireEvent.click(screen.getByRole('button', { name: /create listing/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            seller_contact_id: null,
          })
        );
      });
    });
  });

  describe('seller service calls on save', () => {
    it('calls attachSeller when a new seller is selected on a new listing', async () => {
      render(<ListingForm />);

      fillRequiredFields();
      fireEvent.click(screen.getByTestId('select-seller'));

      fireEvent.click(screen.getByRole('button', { name: /create listing/i }));

      await waitFor(() => {
        expect(mockAttachSeller).toHaveBeenCalledWith(
          expect.anything(), // supabase client
          'listing-new-1',   // listing id from insert response
          'seller-1',        // contact id
          'tenant-1'         // tenant id from getUser
        );
      });
    });

    it('calls changeSeller when seller is changed from initial to different contact', async () => {
      const initialData = {
        id: 'listing-edit-1',
        address: '456 Edit St',
        postal_code: '654321',
        property_type: 'condo' as const,
        tenure: 'freehold' as const,
        floor_area_sqft: 1200,
        listing_type: 'sale' as const,
        seller_contact_id: 'seller-1',
      };

      // Mock the contact fetch for initial seller
      mockContactSelectResult.mockResolvedValue({
        data: { id: 'seller-1', full_name: 'John Seller', phone: '+6591111111' },
      });

      render(<ListingForm initialData={initialData} />);

      // Wait for the initial seller contact to be fetched and set
      await waitFor(() => {
        expect(screen.getByTestId('picker-value')).toHaveTextContent('John Seller');
      });

      // Change to a different seller
      fireEvent.click(screen.getByTestId('change-seller'));

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockChangeSeller).toHaveBeenCalledWith(
          expect.anything(),
          'listing-edit-1',
          'seller-2',
          'tenant-1'
        );
      });
    });

    it('calls removeSeller when seller is cleared from an existing listing', async () => {
      const initialData = {
        id: 'listing-edit-2',
        address: '789 Remove St',
        postal_code: '789012',
        property_type: 'hdb' as const,
        tenure: '99yr' as const,
        floor_area_sqft: 900,
        listing_type: 'sale' as const,
        seller_contact_id: 'seller-1',
      };

      mockContactSelectResult.mockResolvedValue({
        data: { id: 'seller-1', full_name: 'John Seller', phone: '+6591111111' },
      });

      render(<ListingForm initialData={initialData} />);

      await waitFor(() => {
        expect(screen.getByTestId('picker-value')).toHaveTextContent('John Seller');
      });

      // Clear the seller
      fireEvent.click(screen.getByTestId('clear-seller'));

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockRemoveSeller).toHaveBeenCalledWith(
          expect.anything(),
          'listing-edit-2'
        );
      });
    });
  });

  describe('error handling', () => {
    it('shows error toast when lead creation fails but still saves listing', async () => {
      mockAttachSeller.mockResolvedValue({
        success: true,
        sellerLead: null,
        leadCreationError: 'Failed to create seller lead: DB error',
      });

      render(<ListingForm />);

      fillRequiredFields();
      fireEvent.click(screen.getByTestId('select-seller'));

      fireEvent.click(screen.getByRole('button', { name: /create listing/i }));

      await waitFor(() => {
        // Listing should still be saved (insert was called)
        expect(mockInsert).toHaveBeenCalled();
        // Error toast should be shown
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.stringContaining('seller lead could not be created'),
          'error'
        );
      });

      // Should still navigate away (listing was saved)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/listings');
      });
    });

    it('shows error toast when changeSeller returns leadCreationError', async () => {
      mockChangeSeller.mockResolvedValue({
        success: true,
        sellerLead: null,
        leadCreationError: 'Failed to create seller lead: timeout',
      });

      const initialData = {
        id: 'listing-edit-3',
        address: '100 Error St',
        postal_code: '100100',
        property_type: 'landed' as const,
        tenure: 'freehold' as const,
        floor_area_sqft: 2000,
        listing_type: 'sale' as const,
        seller_contact_id: 'seller-1',
      };

      mockContactSelectResult.mockResolvedValue({
        data: { id: 'seller-1', full_name: 'John Seller', phone: '+6591111111' },
      });

      render(<ListingForm initialData={initialData} />);

      await waitFor(() => {
        expect(screen.getByTestId('picker-value')).toHaveTextContent('John Seller');
      });

      // Change seller
      fireEvent.click(screen.getByTestId('change-seller'));

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.stringContaining('seller lead could not be created'),
          'error'
        );
      });
    });

    it('shows generic error toast when seller service throws an exception', async () => {
      mockAttachSeller.mockRejectedValue(new Error('Network failure'));

      render(<ListingForm />);

      fillRequiredFields();
      fireEvent.click(screen.getByTestId('select-seller'));

      fireEvent.click(screen.getByRole('button', { name: /create listing/i }));

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.stringContaining('issue updating the seller'),
          'error'
        );
      });

      // Should still navigate (listing was saved, seller error is non-blocking)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/listings');
      });
    });
  });
});
