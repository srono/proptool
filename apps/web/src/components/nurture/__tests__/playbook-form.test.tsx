import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlaybookForm, playbookFormSchema } from '../playbook-form';

describe('PlaybookForm', () => {
  it('renders all form fields', () => {
    render(<PlaybookForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trigger field \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target ad purpose/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty required fields', async () => {
    const onSubmit = vi.fn();
    render(<PlaybookForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /create playbook/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Trigger field is required')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn();
    render(<PlaybookForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/name \*/i), {
      target: { value: 'HDB MOP Nurture' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Nurture HDB owners approaching MOP' },
    });
    fireEvent.change(screen.getByLabelText(/trigger field \*/i), {
      target: { value: 'mop_date' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create playbook/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'HDB MOP Nurture',
        description: 'Nurture HDB owners approaching MOP',
        trigger_field: 'mop_date',
      });
    });
  });

  it('includes target_ad_purpose when provided', async () => {
    const onSubmit = vi.fn();
    render(<PlaybookForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/name \*/i), {
      target: { value: 'Test Playbook' },
    });
    fireEvent.change(screen.getByLabelText(/trigger field \*/i), {
      target: { value: 'owned_property_key_collection_date' },
    });
    fireEvent.change(screen.getByLabelText(/target ad purpose/i), {
      target: { value: 'property_sale' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create playbook/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ target_ad_purpose: 'property_sale' })
      );
    });
  });

  it('pre-fills form in edit mode and shows Save button', () => {
    render(
      <PlaybookForm
        onSubmit={vi.fn()}
        initialData={{
          name: 'Existing Playbook',
          description: 'Existing description',
          trigger_field: 'mop_date',
          target_ad_purpose: 'rental',
        }}
      />
    );

    expect(screen.getByLabelText(/name \*/i)).toHaveValue('Existing Playbook');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Existing description');
    expect(screen.getByLabelText(/trigger field \*/i)).toHaveValue('mop_date');
    expect(screen.getByLabelText(/target ad purpose/i)).toHaveValue('rental');
    expect(screen.getByRole('button', { name: /save playbook/i })).toBeInTheDocument();
  });

  it('disables fields and shows loading text when submitting', () => {
    render(<PlaybookForm onSubmit={vi.fn()} submitting />);

    expect(screen.getByLabelText(/name \*/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/trigger field \*/i)).toBeDisabled();
    expect(screen.getByLabelText(/target ad purpose/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled();
  });

  it('shows character count for name field', () => {
    render(<PlaybookForm onSubmit={vi.fn()} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/name \*/i), {
      target: { value: 'Hello' },
    });
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('shows character count for description field', () => {
    render(<PlaybookForm onSubmit={vi.fn()} />);
    expect(screen.getByText('0/500')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'A short desc' },
    });
    expect(screen.getByText('12/500')).toBeInTheDocument();
  });
});

describe('playbookFormSchema', () => {
  it('rejects name longer than 100 characters', () => {
    const result = playbookFormSchema.safeParse({
      name: 'a'.repeat(101),
      description: '',
      trigger_field: 'mop_date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description longer than 500 characters', () => {
    const result = playbookFormSchema.safeParse({
      name: 'Valid',
      description: 'a'.repeat(501),
      trigger_field: 'mop_date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty trigger_field', () => {
    const result = playbookFormSchema.safeParse({
      name: 'Valid',
      description: '',
      trigger_field: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid data without target_ad_purpose', () => {
    const result = playbookFormSchema.safeParse({
      name: 'Valid',
      description: 'Some description',
      trigger_field: 'mop_date',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid data with target_ad_purpose', () => {
    const result = playbookFormSchema.safeParse({
      name: 'Valid',
      description: '',
      trigger_field: 'owned_property_key_collection_date',
      target_ad_purpose: 'property_sale',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target_ad_purpose).toBe('property_sale');
    }
  });
});
