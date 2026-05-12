import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Sparkline } from '../kpi-strip';

/**
 * Feature: ui-ux-consistency-fixes, Property 7: Sparkline CSS variable usage
 * Validates: Requirements 13.1, 13.2
 *
 * For any valid sparkline data array and warn flag, the rendered Sparkline SVG stroke
 * attribute SHALL reference a CSS custom property (var(--sparkline-positive) or
 * var(--sparkline-negative)) and SHALL NOT contain any inline hex colour literal
 * (matching pattern #[0-9A-Fa-f]{3,8}).
 */

// --- Generators ---

// Generate arbitrary numeric data arrays with at least 2 points (needed for a valid polyline)
const dataArb = fc.array(fc.double({ min: -1000, max: 1000, noNaN: true }), {
  minLength: 2,
  maxLength: 30,
});

const warnArb = fc.boolean();

// Hex colour literal pattern
const hexColourRegex = /#[0-9A-Fa-f]{3,8}/;

describe('Feature: ui-ux-consistency-fixes, Property 7: Sparkline CSS variable usage', () => {
  it('stroke attribute references a CSS custom property (var(--sparkline-...))', () => {
    fc.assert(
      fc.property(dataArb, warnArb, (data, warn) => {
        const { container, unmount } = render(
          <Sparkline data={data} warn={warn} />
        );

        const polyline = container.querySelector('polyline');
        expect(polyline).not.toBeNull();

        const stroke = polyline!.getAttribute('stroke') ?? '';

        // Stroke must reference a CSS custom property
        expect(stroke).toMatch(/^var\(--sparkline-(positive|negative)\)$/);

        // Verify correct variable based on warn flag
        if (warn) {
          expect(stroke).toBe('var(--sparkline-negative)');
        } else {
          expect(stroke).toBe('var(--sparkline-positive)');
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('stroke attribute contains no inline hex colour literals', () => {
    fc.assert(
      fc.property(dataArb, warnArb, (data, warn) => {
        const { container, unmount } = render(
          <Sparkline data={data} warn={warn} />
        );

        const polyline = container.querySelector('polyline');
        expect(polyline).not.toBeNull();

        const stroke = polyline!.getAttribute('stroke') ?? '';

        // Stroke must NOT contain any hex colour literal
        expect(
          hexColourRegex.test(stroke),
          `Found hex colour literal in stroke: "${stroke}"`
        ).toBe(false);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('rendered SVG contains no hex colour literals in any attribute', () => {
    fc.assert(
      fc.property(dataArb, warnArb, (data, warn) => {
        const { container, unmount } = render(
          <Sparkline data={data} warn={warn} />
        );

        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();

        // Check all attributes on all elements within the SVG
        const allElements = svg!.querySelectorAll('*');
        for (const el of allElements) {
          for (const attr of el.attributes) {
            expect(
              hexColourRegex.test(attr.value),
              `Found hex colour literal "${attr.value}" in attribute "${attr.name}" on <${el.tagName.toLowerCase()}>`
            ).toBe(false);
          }
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
