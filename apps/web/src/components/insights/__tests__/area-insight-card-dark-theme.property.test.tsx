import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AreaInsightCard } from '../area-insight-card';
import type { AreaInsights } from '@/lib/insights/generate';

/**
 * Feature: ui-ux-consistency-fixes, Property 1: AreaInsightCard dark-theme exclusivity
 * Validates: Requirements 1.1, 1.2, 1.3
 *
 * For any valid AreaInsightCard props (with or without insights data), the rendered
 * HTML output SHALL contain no light-theme CSS classes.
 */

const FORBIDDEN_LIGHT_CLASSES = [
  'bg-white',
  'bg-gray-50',
  'bg-gray-100',
  'bg-blue-50',
  'text-gray-900',
  'text-gray-700',
  'text-gray-600',
  'text-gray-500',
  'border-gray-100',
  'border-gray-200',
  'border-gray-50',
];

/**
 * Checks that no element in the rendered container has any of the forbidden
 * light-theme classes applied.
 */
function assertNoLightThemeClasses(container: HTMLElement) {
  const allElements = container.querySelectorAll('*');
  for (const el of allElements) {
    const classList = el.className;
    if (typeof classList !== 'string') continue;
    for (const forbidden of FORBIDDEN_LIGHT_CLASSES) {
      // Check for exact class match (word boundary)
      const regex = new RegExp(`(^|\\s)${forbidden.replace('/', '\\/')}($|\\s)`);
      expect(
        regex.test(classList),
        `Found forbidden light-theme class "${forbidden}" in element: <${el.tagName.toLowerCase()} class="${classList}">`
      ).toBe(false);
    }
  }
}

// --- Generators ---

const nearbyTransactionArb = fc.record({
  project: fc.string({ minLength: 1, maxLength: 50 }),
  street: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.integer({ min: 100000, max: 50000000 }),
  psf: fc.integer({ min: 500, max: 5000 }),
  area_sqft: fc.integer({ min: 200, max: 10000 }),
  floor_range: fc.constantFrom('01-05', '06-10', '11-15', '16-20', '21-25'),
  contract_date: fc.constantFrom('2024-01', '2024-02', '2024-03', '2023-12', '2023-11'),
  type_of_sale: fc.constantFrom('New Sale', 'Resale', 'Sub Sale'),
  property_type: fc.constantFrom('Condominium', 'Apartment', 'Executive Condominium'),
});

const areaInsightsArb: fc.Arbitrary<AreaInsights> = fc.record({
  area_summary: fc.string({ minLength: 1, maxLength: 200 }),
  planning_context: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  nearby_transactions: fc.array(nearbyTransactionArb, { minLength: 0, maxLength: 5 }),
  transaction_summary: fc.string({ minLength: 1, maxLength: 200 }),
  fit_signals: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
  watchouts: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
  agent_talking_points: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 4 }),
  seller_pitch_snippet: fc.string({ minLength: 1, maxLength: 200 }),
  confidence_note: fc.string({ minLength: 1, maxLength: 100 }),
  last_refreshed_at: fc.constantFrom(
    '2024-01-15T10:30:00Z',
    '2024-03-20T14:00:00Z',
    '2024-06-01T08:00:00Z'
  ),
});

const listingIdArb = fc.string({ minLength: 1, maxLength: 36 }).filter((s) => s.trim().length > 0);

describe('Feature: ui-ux-consistency-fixes, Property 1: AreaInsightCard dark-theme exclusivity', () => {
  it('renders no light-theme classes when insights is null (generate button state)', () => {
    fc.assert(
      fc.property(listingIdArb, (listingId) => {
        const { container, unmount } = render(
          <AreaInsightCard listingId={listingId} insights={null} />
        );
        assertNoLightThemeClasses(container);
        unmount();
      }),
      { numRuns: 50 }
    );
  });

  it('renders no light-theme classes when insights data is populated', () => {
    fc.assert(
      fc.property(listingIdArb, areaInsightsArb, (listingId, insights) => {
        const { container, unmount } = render(
          <AreaInsightCard listingId={listingId} insights={insights} />
        );
        assertNoLightThemeClasses(container);
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
