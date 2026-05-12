import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BuyerFitPanel } from '../buyer-fit-panel';

/**
 * Feature: ui-ux-consistency-fixes, Property 5: BuyerFitPanel dot indicators
 * Validates: Requirements 9.1, 9.2, 9.3
 *
 * For any non-empty combination of fitSignals and watchouts arrays, the BuyerFitPanel
 * SHALL render status indicators as <span> elements with rounded-full and appropriate
 * status colour classes (bg-status-green for fit signals, bg-status-amber for watchouts),
 * and SHALL NOT render the characters "✓" or "!" as indicator text content.
 */

// --- Generators ---

const fitSignalArb = fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0);
const watchoutArb = fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0);

// Generate non-empty arrays: at least one of fitSignals or watchouts must be non-empty
const propsArb = fc
  .record({
    fitSignals: fc.array(fitSignalArb, { minLength: 0, maxLength: 5 }),
    watchouts: fc.array(watchoutArb, { minLength: 0, maxLength: 5 }),
  })
  .filter((props) => props.fitSignals.length > 0 || props.watchouts.length > 0);

describe('Feature: ui-ux-consistency-fixes, Property 5: BuyerFitPanel dot indicators', () => {
  it('renders fit signal indicators as <span> elements with rounded-full and bg-status-green', () => {
    fc.assert(
      fc.property(
        fc.array(fitSignalArb, { minLength: 1, maxLength: 5 }),
        fc.array(watchoutArb, { minLength: 0, maxLength: 3 }),
        (fitSignals, watchouts) => {
          const { container, unmount } = render(
            <BuyerFitPanel fitSignals={fitSignals} watchouts={watchouts} />
          );

          const greenDots = container.querySelectorAll('span.rounded-full.bg-status-green');
          expect(greenDots.length).toBe(fitSignals.length);

          // Each green dot should be a <span> element
          for (const dot of greenDots) {
            expect(dot.tagName.toLowerCase()).toBe('span');
            expect(dot.className).toContain('rounded-full');
            expect(dot.className).toContain('bg-status-green');
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('renders watchout indicators as <span> elements with rounded-full and bg-status-amber', () => {
    fc.assert(
      fc.property(
        fc.array(fitSignalArb, { minLength: 0, maxLength: 3 }),
        fc.array(watchoutArb, { minLength: 1, maxLength: 5 }),
        (fitSignals, watchouts) => {
          const { container, unmount } = render(
            <BuyerFitPanel fitSignals={fitSignals} watchouts={watchouts} />
          );

          const amberDots = container.querySelectorAll('span.rounded-full.bg-status-amber');
          expect(amberDots.length).toBe(watchouts.length);

          // Each amber dot should be a <span> element
          for (const dot of amberDots) {
            expect(dot.tagName.toLowerCase()).toBe('span');
            expect(dot.className).toContain('rounded-full');
            expect(dot.className).toContain('bg-status-amber');
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not render "✓" or "!" as indicator text content', () => {
    fc.assert(
      fc.property(propsArb, ({ fitSignals, watchouts }) => {
        const { container, unmount } = render(
          <BuyerFitPanel fitSignals={fitSignals} watchouts={watchouts} />
        );

        // Get all dot indicator spans (those with rounded-full)
        const dotIndicators = container.querySelectorAll('span.rounded-full');

        for (const dot of dotIndicators) {
          // Dot indicators should have no text content (they are purely visual)
          expect(dot.textContent).toBe('');
        }

        // Additionally, verify no element in the component uses "✓" or "!" as sole text
        // (i.e., as an indicator character)
        const allElements = container.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent?.trim() ?? '';
          // An element whose only content is "✓" or "!" would be a text indicator
          if (el.children.length === 0) {
            expect(
              text === '✓' || text === '!',
              `Found forbidden indicator character "${text}" in <${el.tagName.toLowerCase()}>`
            ).toBe(false);
          }
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
