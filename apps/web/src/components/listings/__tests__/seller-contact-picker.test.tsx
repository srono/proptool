import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SellerContactPicker } from '../seller-contact-picker';

// --- Mocks ---

const mockSearchContacts = vi.fn();
vi.mock('@/lib/services/seller-service', () => ({
  searchContacts: (...args: any[]) => mockSearchContacts(...args),
}));

const mockInsertSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn<(values: any) => { select: typeof mockInsertSelect }>(() => ({ select: mockInsertSelect }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: (values: any) => mockInsert(values),
    }),
  }),
}));

// --- Test Data ---

function makeContacts(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `contact-${i + 1}`,
    full_name: `Contact ${i + 1}`,
    phone: `+6590000${String(i + 1).padStart(3, '0')}`,
    email: i % 2 === 0 ? `contact${i + 1}@test.com` : null,
  }));
}

// --- Tests ---

describe('SellerContactPicker', () => {
  beforeEach(() => {
    mockSearchContacts.mockReset();
    mockInsert.mockClear();
    mockInsertSelect.mockClear();
    mockInsertSingle.mockClear();
  });

  describe('search debounce behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not trigger search before 300ms', () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'Al' } });

      // Advance 200ms — search should NOT have been called yet
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockSearchContacts).not.toHaveBeenCalled();
    });

    it('triggers search after 300ms debounce with 1+ characters', () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'A' } });

      // Advance 300ms — search should fire
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockSearchContacts).toHaveBeenCalledTimes(1);
      expect(mockSearchContacts).toHaveBeenCalledWith(expect.anything(), 'A');
    });

    it('does not trigger search for empty query', () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: '' } });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockSearchContacts).not.toHaveBeenCalled();
    });

    it('debounces multiple rapid keystrokes', () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');

      // Type multiple characters rapidly
      fireEvent.change(input, { target: { value: 'A' } });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.change(input, { target: { value: 'Al' } });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.change(input, { target: { value: 'Ali' } });

      // Advance 300ms from last keystroke
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only have been called once with the final value
      expect(mockSearchContacts).toHaveBeenCalledTimes(1);
      expect(mockSearchContacts).toHaveBeenCalledWith(expect.anything(), 'Ali');
    });
  });

  describe('displaying results', () => {
    it('displays up to 20 results', async () => {
      const contacts = makeContacts(20);
      mockSearchContacts.mockResolvedValue(contacts);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'Contact' } });

      // Wait for debounce + async search to complete
      await waitFor(() => {
        expect(screen.getByText('Contact 1')).toBeInTheDocument();
      });

      // All 20 contacts should be displayed
      for (let i = 1; i <= 20; i++) {
        expect(screen.getByText(`Contact ${i}`)).toBeInTheDocument();
      }
    });

    it('shows "No contacts found" when search returns empty', async () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'zzz' } });

      await waitFor(() => {
        expect(screen.getByText('No contacts found')).toBeInTheDocument();
      });
    });
  });

  describe('selecting a contact', () => {
    it('calls onChange with correct contact data when a result is clicked', async () => {
      const contacts = [
        { id: 'c1', full_name: 'Alice Smith', phone: '+6591234567', email: 'alice@test.com' },
      ];
      mockSearchContacts.mockResolvedValue(contacts);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'Alice' } });

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Alice Smith'));

      expect(onChange).toHaveBeenCalledWith({
        id: 'c1',
        full_name: 'Alice Smith',
        phone: '+6591234567',
      });
    });

    it('displays selected contact name and phone as confirmation', () => {
      const onChange = vi.fn();
      const selectedContact = { id: 'c1', full_name: 'Alice Smith', phone: '+6591234567' };

      render(<SellerContactPicker value={selectedContact} onChange={onChange} />);

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('+6591234567')).toBeInTheDocument();
    });
  });

  describe('clearing selection', () => {
    it('calls onChange with null when clear button is clicked', () => {
      const onChange = vi.fn();
      const selectedContact = { id: 'c1', full_name: 'Alice Smith', phone: '+6591234567' };

      render(<SellerContactPicker value={selectedContact} onChange={onChange} />);

      const clearButton = screen.getByLabelText('Clear seller selection');
      fireEvent.click(clearButton);

      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('inline create contact flow', () => {
    it('shows create form when "Create new contact" is clicked', async () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'New' } });

      await waitFor(() => {
        expect(screen.getByText('Create new contact')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create new contact'));

      expect(screen.getByPlaceholderText('Full name *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Phone number *')).toBeInTheDocument();
      expect(screen.getByText('Create & Select')).toBeInTheDocument();
    });

    it('creates contact and calls onChange with new contact data', async () => {
      const newContact = { id: 'new-c1', full_name: 'New Person', phone: '+6599999999' };
      mockInsertSingle.mockResolvedValue({ data: newContact, error: null });
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      // Trigger search to open dropdown
      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'New' } });

      await waitFor(() => {
        expect(screen.getByText('Create new contact')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create new contact'));

      // Fill in the form
      const nameInput = screen.getByPlaceholderText('Full name *');
      const phoneInput = screen.getByPlaceholderText('Phone number *');

      fireEvent.change(nameInput, { target: { value: 'New Person' } });
      fireEvent.change(phoneInput, { target: { value: '+6599999999' } });

      // Submit the form
      fireEvent.click(screen.getByText('Create & Select'));

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          id: 'new-c1',
          full_name: 'New Person',
          phone: '+6599999999',
        });
      });
    });

    it('shows validation error when name is empty', async () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      // Trigger search to open dropdown
      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'x' } });

      await waitFor(() => {
        expect(screen.getByText('Create new contact')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create new contact'));

      // Only fill phone, leave name empty
      const phoneInput = screen.getByPlaceholderText('Phone number *');
      fireEvent.change(phoneInput, { target: { value: '+6599999999' } });

      fireEvent.click(screen.getByText('Create & Select'));

      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows validation error when phone is empty', async () => {
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      // Trigger search to open dropdown
      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'x' } });

      await waitFor(() => {
        expect(screen.getByText('Create new contact')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create new contact'));

      // Only fill name, leave phone empty
      const nameInput = screen.getByPlaceholderText('Full name *');
      fireEvent.change(nameInput, { target: { value: 'Test Person' } });

      fireEvent.click(screen.getByText('Create & Select'));

      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows error for duplicate phone number', async () => {
      mockInsertSingle.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      });
      mockSearchContacts.mockResolvedValue([]);
      const onChange = vi.fn();

      render(<SellerContactPicker value={null} onChange={onChange} />);

      // Trigger search to open dropdown
      const input = screen.getByPlaceholderText('Search by name or phone...');
      fireEvent.change(input, { target: { value: 'x' } });

      await waitFor(() => {
        expect(screen.getByText('Create new contact')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create new contact'));

      // Fill in the form
      const nameInput = screen.getByPlaceholderText('Full name *');
      const phoneInput = screen.getByPlaceholderText('Phone number *');
      fireEvent.change(nameInput, { target: { value: 'Duplicate Person' } });
      fireEvent.change(phoneInput, { target: { value: '+6511111111' } });

      fireEvent.click(screen.getByText('Create & Select'));

      await waitFor(() => {
        expect(
          screen.getByText('A contact with this phone number already exists. Search for them instead.')
        ).toBeInTheDocument();
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
