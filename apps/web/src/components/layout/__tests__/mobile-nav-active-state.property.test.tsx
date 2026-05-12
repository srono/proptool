import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { MobileNav } from '../mobile-nav';

/**
 * Feature: ui-ux-consistency-fixes, Property 4: MobileNav active state and minimum font size
 * Validates: Requirements 6.1, 6.2, 6.3
 *
 * For any pathname that matches a navigation item, the MobileNav SHALL render
 * that item with `bg-brand` applied, and SHALL use `text-[11px]` or larger for
 * all navigation labels (no `text-[10px]` or smaller).
 */

// Mock next/navigation usePathname
let mockPathname = '/dashboard';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// Mock next/link to render a plain <a> that passes through all props
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// --- Constants ---

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/leads', label: 'Lead Inbox' },
  { href: '/nurture', label: 'Nurture' },
  { href: '/messages', label: 'Chat' },
  { href: '/settings', label: 'More' },
];

// Font size classes that are below 11px (forbidden)
const FORBIDDEN_SMALL_FONT_CLASSES = [
  'text-[10px]',
  'text-[9px]',
  'text-[8px]',
  'text-[7px]',
  'text-[6px]',
];

// --- Generators ---

// Generate a pathname that starts with one of the nav item hrefs
const navItemIndexArb = fc.integer({ min: 0, max: NAV_ITEMS.length - 1 });

// Generate optional sub-path segments to append after the base href
const subPathArb = fc.oneof(
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 20 })
    .filter((s) => !s.includes(' '))
    .map((s) => '/' + s.replace(/[^a-z0-9-]/gi, 'x'))
);

describe('Feature: ui-ux-consistency-fixes, Property 4: MobileNav active state and minimum font size', () => {
  it('active nav item has bg-brand class applied', () => {
    fc.assert(
      fc.property(navItemIndexArb, subPathArb, (navIndex, subPath) => {
        const navItem = NAV_ITEMS[navIndex];
        mockPathname = navItem.href + subPath;

        const { container, unmount } = render(<MobileNav />);

        // Find all nav label spans
        const labelSpans = container.querySelectorAll('span');
        let foundActive = false;

        for (const span of labelSpans) {
          if (span.textContent === navItem.label) {
            // The active item should have bg-brand
            expect(
              span.className.includes('bg-brand'),
              `Active item "${navItem.label}" at pathname "${mockPathname}" should have bg-brand class, got: "${span.className}"`
            ).toBe(true);
            foundActive = true;
          }
        }

        expect(
          foundActive,
          `Should find the active nav item label "${navItem.label}" in rendered output`
        ).toBe(true);

        unmount();
      }),
      { numRuns: 50 }
    );
  });

  it('no navigation label uses text-[10px] or smaller font size', () => {
    fc.assert(
      fc.property(navItemIndexArb, subPathArb, (navIndex, subPath) => {
        const navItem = NAV_ITEMS[navIndex];
        mockPathname = navItem.href + subPath;

        const { container, unmount } = render(<MobileNav />);

        // Check all elements for forbidden small font classes
        const allElements = container.querySelectorAll('*');
        for (const el of allElements) {
          const classList = el.className;
          if (typeof classList !== 'string') continue;
          for (const forbidden of FORBIDDEN_SMALL_FONT_CLASSES) {
            const regex = new RegExp(`(^|\\s)${forbidden.replace('[', '\\[').replace(']', '\\]')}($|\\s)`);
            expect(
              regex.test(classList),
              `Found forbidden small font class "${forbidden}" in element: <${el.tagName.toLowerCase()} class="${classList}">`
            ).toBe(false);
          }
        }

        unmount();
      }),
      { numRuns: 50 }
    );
  });
});
