import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TemplatePreview } from '../template-preview';
import type { ResolveContext } from '@/lib/nurture/template-resolver';

const fullContext: ResolveContext = {
  contact: {
    full_name: 'John Tan',
    owned_property_label: 'Blk 123 Ang Mo Kio',
    owned_property_town: 'Ang Mo Kio',
    mop_date: '2025-06-15',
  },
  agent: { full_name: 'Agent Lee' },
  trigger_field: 'mop_date',
};

const partialContext: ResolveContext = {
  contact: {
    full_name: 'Jane Lim',
    owned_property_label: null,
    owned_property_town: null,
    mop_date: null,
  },
  agent: { full_name: 'Agent Lee' },
  trigger_field: 'mop_date',
};

describe('TemplatePreview', () => {
  it('renders resolved placeholders with contact data', () => {
    render(
      <TemplatePreview
        body="Hi {{contact_name}}, your property at {{owned_property_label}} is approaching MOP."
        context={fullContext}
      />
    );

    expect(screen.getByLabelText('Template preview')).toHaveTextContent(
      'Hi John Tan, your property at Blk 123 Ang Mo Kio is approaching MOP.'
    );
  });

  it('highlights missing fields with visual indicator', () => {
    render(
      <TemplatePreview
        body="Hi {{contact_name}}, your property at {{owned_property_label}} in {{owned_property_town}}."
        context={partialContext}
      />
    );

    // Missing fields should be highlighted
    expect(screen.getByLabelText('Missing field: owned_property_label')).toBeInTheDocument();
    expect(screen.getByLabelText('Missing field: owned_property_town')).toBeInTheDocument();

    // Resolved field should still show
    expect(screen.getByLabelText('Template preview')).toHaveTextContent('Jane Lim');
  });

  it('shows missing fields summary alert when fields are missing', () => {
    render(
      <TemplatePreview
        body="Hi {{contact_name}}, MOP: {{mop_date}}"
        context={partialContext}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('1 missing field');
    expect(alert).toHaveTextContent('{{mop_date}}');
  });

  it('does not show missing fields summary when all fields are resolved', () => {
    render(
      <TemplatePreview
        body="Hi {{contact_name}}, your agent is {{agent_name}}."
        context={fullContext}
      />
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders plain text without placeholders correctly', () => {
    render(
      <TemplatePreview
        body="Hello, this is a plain message with no placeholders."
        context={fullContext}
      />
    );

    expect(screen.getByLabelText('Template preview')).toHaveTextContent(
      'Hello, this is a plain message with no placeholders.'
    );
  });

  it('leaves unsupported placeholders as-is in the output', () => {
    render(
      <TemplatePreview
        body="Hi {{contact_name}}, your {{unknown_field}} is ready."
        context={fullContext}
      />
    );

    expect(screen.getByLabelText('Template preview')).toHaveTextContent(
      'Hi John Tan, your {{unknown_field}} is ready.'
    );
  });

  it('applies additional className when provided', () => {
    const { container } = render(
      <TemplatePreview
        body="Hello"
        context={fullContext}
        className="mt-4"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('mt-4');
  });

  it('resolves trigger_date placeholder using the trigger field', () => {
    render(
      <TemplatePreview
        body="Your MOP date is {{trigger_date}}."
        context={fullContext}
      />
    );

    expect(screen.getByLabelText('Template preview')).toHaveTextContent(
      'Your MOP date is 2025-06-15.'
    );
  });

  it('shows correct count for multiple missing fields', () => {
    render(
      <TemplatePreview
        body="{{owned_property_label}} in {{owned_property_town}}, MOP: {{mop_date}}"
        context={partialContext}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('3 missing fields');
  });
});
