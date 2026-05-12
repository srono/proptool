import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TemplateForm } from '../template-form';

describe('TemplateForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders all form fields', () => {
    render(<TemplateForm {...defaultProps} />);

    expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Message Body')).toBeInTheDocument();
  });

  it('renders placeholder insertion buttons for all supported placeholders', () => {
    render(<TemplateForm {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Insert Contact Name placeholder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Property Label placeholder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Property Town placeholder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert MOP Date placeholder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Agent Name placeholder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insert Trigger Date placeholder/i })).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', async () => {
    render(<TemplateForm {...defaultProps} />);

    const bodyInput = screen.getByLabelText('Message Body');
    fireEvent.change(bodyInput, { target: { value: 'Hello {{contact_name}}' } });

    const form = screen.getByRole('button', { name: /Create Template/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Template name is required')).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when body is empty on submit', async () => {
    render(<TemplateForm {...defaultProps} />);

    const nameInput = screen.getByLabelText('Template Name');
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });

    const form = screen.getByRole('button', { name: /Create Template/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Template body is required')).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for unsupported placeholders', async () => {
    render(<TemplateForm {...defaultProps} />);

    const nameInput = screen.getByLabelText('Template Name');
    const bodyInput = screen.getByLabelText('Message Body');

    fireEvent.change(nameInput, { target: { value: 'Test Template' } });
    fireEvent.change(bodyInput, { target: { value: 'Hello {{invalid_field}}' } });

    const form = screen.getByRole('button', { name: /Create Template/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Unsupported placeholder.*\{\{invalid_field\}\}/)).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid data', async () => {
    const onSubmit = vi.fn();
    render(<TemplateForm onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText('Template Name');
    const bodyInput = screen.getByLabelText('Message Body');

    fireEvent.change(nameInput, { target: { value: 'MOP Reminder' } });
    fireEvent.change(bodyInput, { target: { value: 'Hi {{contact_name}}, your MOP is {{mop_date}}.' } });

    const form = screen.getByRole('button', { name: /Create Template/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'MOP Reminder',
        channel: 'whatsapp',
        body: 'Hi {{contact_name}}, your MOP is {{mop_date}}.',
      });
    });
  });

  it('allows changing channel to email', async () => {
    const onSubmit = vi.fn();
    render(<TemplateForm onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText('Template Name');
    const channelSelect = screen.getByLabelText('Channel');
    const bodyInput = screen.getByLabelText('Message Body');

    fireEvent.change(nameInput, { target: { value: 'Email Template' } });
    fireEvent.change(channelSelect, { target: { value: 'email' } });
    fireEvent.change(bodyInput, { target: { value: 'Hello {{contact_name}}' } });

    const form = screen.getByRole('button', { name: /Create Template/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Email Template',
        channel: 'email',
        body: 'Hello {{contact_name}}',
      });
    });
  });

  it('populates initial data for editing', () => {
    render(
      <TemplateForm
        {...defaultProps}
        initialData={{
          name: 'Existing Template',
          channel: 'email',
          body: 'Hello {{agent_name}}',
        }}
      />
    );

    expect(screen.getByLabelText('Template Name')).toHaveValue('Existing Template');
    expect(screen.getByLabelText('Channel')).toHaveValue('email');
    expect(screen.getByLabelText('Message Body')).toHaveValue('Hello {{agent_name}}');
    expect(screen.getByRole('button', { name: /Update Template/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<TemplateForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables all inputs when saving', () => {
    render(<TemplateForm {...defaultProps} saving={true} />);

    expect(screen.getByLabelText('Template Name')).toBeDisabled();
    expect(screen.getByLabelText('Channel')).toBeDisabled();
    expect(screen.getByLabelText('Message Body')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
  });

  it('displays character count for name and body', () => {
    render(<TemplateForm {...defaultProps} />);

    expect(screen.getByText('0/100')).toBeInTheDocument();
    expect(screen.getByText('0/2000')).toBeInTheDocument();
  });

  it('inserts placeholder into body when button is clicked', () => {
    render(<TemplateForm {...defaultProps} />);

    const bodyInput = screen.getByLabelText('Message Body') as HTMLTextAreaElement;
    fireEvent.change(bodyInput, { target: { value: 'Hello ' } });

    // Simulate cursor at end of text
    Object.defineProperty(bodyInput, 'selectionStart', { value: 6, writable: true });
    Object.defineProperty(bodyInput, 'selectionEnd', { value: 6, writable: true });

    fireEvent.click(screen.getByRole('button', { name: /Insert Contact Name placeholder/i }));

    expect(bodyInput.value).toBe('Hello {{contact_name}}');
  });

  it('accepts body with only supported placeholders', async () => {
    const onSubmit = vi.fn();
    render(<TemplateForm onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText('Template Name');
    const bodyInput = screen.getByLabelText('Message Body');

    fireEvent.change(nameInput, { target: { value: 'All Placeholders' } });
    fireEvent.change(bodyInput, {
      target: {
        value: '{{contact_name}} at {{owned_property_label}} in {{owned_property_town}} MOP: {{mop_date}} Agent: {{agent_name}} Trigger: {{trigger_date}}',
      },
    });

    const form = screen.getByRole('button', { name: /Create Template/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
