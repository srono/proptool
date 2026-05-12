import { describe, it, expect } from 'vitest';
import { selectActiveLead } from '../lead-selector';
import type { Lead } from '@agentos/shared';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    tenant_id: 'tenant-1',
    contact_id: 'contact-1',
    assigned_to: null,
    status: 'new_lead',
    source: 'whatsapp',
    ad_campaign_id: null,
    ad_set_id: null,
    ad_creative_id: null,
    ad_purpose: null,
    deal_type: 'sale',
    urgency: 'warm',
    budget_min: null,
    budget_max: null,
    move_in_by: null,
    notes: null,
    lead_title: null,
    lead_category: 'buyer',
    is_active: true,
    opened_at: '2024-01-01T00:00:00Z',
    closed_at: null,
    close_reason: null,
    origin_listing_id: null,
    duplicate_of_lead_id: null,
    residency_status: null,
    property_ownership: null,
    eligibility_risk: false,
    eligibility_flag_reason: null,
    intent_score: null,
    time_on_form_seconds: null,
    timeline_declared: null,
    paynow_verified: false,
    paynow_name_match: null,
    paynow_registered_name: null,
    verification_score: null,
    pre_viewing_checklist: null,
    created_at: '2024-01-01T00:00:00Z',
    last_activity_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('selectActiveLead', () => {
  it('returns null for an empty array', () => {
    expect(selectActiveLead([])).toBeNull();
  });

  it('returns null when all leads are closed_won', () => {
    const leads = [
      makeLead({ status: 'closed_won' }),
      makeLead({ status: 'closed_won', id: 'lead-2' }),
    ];
    expect(selectActiveLead(leads)).toBeNull();
  });

  it('returns null when all leads are closed_lost', () => {
    const leads = [makeLead({ status: 'closed_lost' })];
    expect(selectActiveLead(leads)).toBeNull();
  });

  it('returns null when all leads are nurture', () => {
    const leads = [makeLead({ status: 'nurture' })];
    expect(selectActiveLead(leads)).toBeNull();
  });

  it('returns null when all leads have excluded statuses', () => {
    const leads = [
      makeLead({ status: 'closed_won' }),
      makeLead({ status: 'closed_lost', id: 'lead-2' }),
      makeLead({ status: 'nurture', id: 'lead-3' }),
    ];
    expect(selectActiveLead(leads)).toBeNull();
  });

  it('returns the only active lead', () => {
    const lead = makeLead({ status: 'qualified', last_activity_at: '2024-06-01T10:00:00Z' });
    expect(selectActiveLead([lead])).toBe(lead);
  });

  it('selects the lead with the most recent last_activity_at', () => {
    const older = makeLead({
      id: 'lead-1',
      status: 'contacted',
      last_activity_at: '2024-01-15T10:00:00Z',
    });
    const newer = makeLead({
      id: 'lead-2',
      status: 'qualified',
      last_activity_at: '2024-06-10T14:30:00Z',
    });
    expect(selectActiveLead([older, newer])).toBe(newer);
  });

  it('excludes closed/nurture leads and selects from remaining', () => {
    const closedWon = makeLead({
      id: 'lead-1',
      status: 'closed_won',
      last_activity_at: '2024-12-01T00:00:00Z', // most recent but excluded
    });
    const nurture = makeLead({
      id: 'lead-2',
      status: 'nurture',
      last_activity_at: '2024-11-01T00:00:00Z',
    });
    const active = makeLead({
      id: 'lead-3',
      status: 'viewing_booked',
      last_activity_at: '2024-06-01T00:00:00Z',
    });
    expect(selectActiveLead([closedWon, nurture, active])).toBe(active);
  });

  it('handles multiple active leads and picks the most recent', () => {
    const leads = [
      makeLead({ id: 'lead-1', status: 'new_lead', last_activity_at: '2024-03-01T00:00:00Z' }),
      makeLead({ id: 'lead-2', status: 'negotiating', last_activity_at: '2024-07-15T12:00:00Z' }),
      makeLead({ id: 'lead-3', status: 'viewing_done', last_activity_at: '2024-05-20T08:00:00Z' }),
    ];
    expect(selectActiveLead(leads)?.id).toBe('lead-2');
  });
});
