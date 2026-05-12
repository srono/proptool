import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { PillTabs, Tab } from '../pill-tabs';

// --- Generators ---

/** Generate a non-empty string suitable for a tab label */
const labelArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);

/** Generate a unique tab value (alphanumeric, no spaces) */
const valueArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.replace(/\s/g, '-'));

/** Generate a single Tab */
const tabArb: fc.Arbitrary<Tab> = fc.record({
  label: labelArb,
  value: valueArb,
});

/** Generate a non-empty array of Tabs with unique values (length ≥ 1) */
const tabsArb = fc
  .array(tabArb, { minLength: 1, maxLength: 10 })
  .map((tabs) => {
    // Ensure unique values by deduplicating
    const seen = new Set<string>();
    return tabs.filter((tab) => {
      if (seen.has(tab.value)) return false;
      seen.add(tab.value);
      return true;
    });
  })
  .filter((tabs) => tabs.length >= 1);

/** Generate tabs array with a selected value guaranteed to be from the array */
const tabsWithSelectedArb = tabsArb.chain((tabs) =>
  fc.record({
    tabs: fc.constant(tabs),
    selectedIndex: fc.integer({ min: 0, max: tabs.length - 1 }),
  })
);

// --- Property Tests ---

/**
 * Property 6: PillTabs rendering correctness
 *
 * **Validates: Requirements 11.2, 11.3, 11.4**
 *
 * For any valid tabs array and selected value, the PillTabs component SHALL
 * render every tab with `rounded-pill` class, SHALL apply `bg-brand` exclusively
 * to the tab whose value matches the selected value, and SHALL render all other
 * tabs without `bg-brand`.
 */
describe('Property 6: PillTabs rendering correctness', () => {
  it('every tab button has rounded-pill class', () => {
    fc.assert(
      fc.property(tabsWithSelectedArb, ({ tabs, selectedIndex }) => {
        const selectedValue = tabs[selectedIndex].value;
        const onChange = vi.fn();

        const { container } = render(
          <PillTabs tabs={tabs} value={selectedValue} onChange={onChange} />
        );

        const buttons = container.querySelectorAll('button[role="tab"]');
        expect(buttons.length).toBe(tabs.length);

        // Every tab button must have rounded-pill
        buttons.forEach((button) => {
          expect(button.className).toContain('rounded-pill');
        });
      }),
      { numRuns: 100 }
    );
  });

  it('only the selected tab has bg-brand class', () => {
    fc.assert(
      fc.property(tabsWithSelectedArb, ({ tabs, selectedIndex }) => {
        const selectedValue = tabs[selectedIndex].value;
        const onChange = vi.fn();

        const { container } = render(
          <PillTabs tabs={tabs} value={selectedValue} onChange={onChange} />
        );

        const buttons = container.querySelectorAll('button[role="tab"]');
        expect(buttons.length).toBe(tabs.length);

        buttons.forEach((button, idx) => {
          if (idx === selectedIndex) {
            // Selected tab MUST have bg-brand
            expect(button.className).toContain('bg-brand');
          } else {
            // Non-selected tabs MUST NOT have bg-brand
            expect(button.className).not.toContain('bg-brand');
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  it('selected tab has aria-selected=true and others have aria-selected=false', () => {
    fc.assert(
      fc.property(tabsWithSelectedArb, ({ tabs, selectedIndex }) => {
        const selectedValue = tabs[selectedIndex].value;
        const onChange = vi.fn();

        const { container } = render(
          <PillTabs tabs={tabs} value={selectedValue} onChange={onChange} />
        );

        const buttons = container.querySelectorAll('button[role="tab"]');
        expect(buttons.length).toBe(tabs.length);

        buttons.forEach((button, idx) => {
          if (idx === selectedIndex) {
            expect(button.getAttribute('aria-selected')).toBe('true');
          } else {
            expect(button.getAttribute('aria-selected')).toBe('false');
          }
        });
      }),
      { numRuns: 100 }
    );
  });
});
