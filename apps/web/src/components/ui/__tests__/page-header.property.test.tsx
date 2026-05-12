import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PageHeader, BreadcrumbItem } from '../page-header';

// --- Generators ---

/** Generate a non-empty string suitable for a breadcrumb label */
const labelArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);

/** Generate an optional href (path-like string) */
const hrefArb = fc.oneof(
  fc.constant(undefined),
  fc.string({ minLength: 1, maxLength: 50 }).map((s) => `/${s.replace(/\s/g, '-')}`)
);

/** Generate a single BreadcrumbItem */
const breadcrumbItemArb: fc.Arbitrary<BreadcrumbItem> = fc.record({
  label: labelArb,
  href: hrefArb,
});

/** Generate a non-empty array of BreadcrumbItems (length ≥ 1) */
const breadcrumbsArb = fc.array(breadcrumbItemArb, { minLength: 1, maxLength: 8 });

/** Generate a page title */
const titleArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// --- Property Tests ---

/**
 * Property 2: PageHeader breadcrumb link correctness
 *
 * **Validates: Requirements 4.3, 4.4**
 *
 * For any breadcrumbs array with length ≥ 1, the PageHeader SHALL render all
 * non-last items with an href as navigable `<a>` elements, and SHALL render
 * the last item as plain non-interactive text (not wrapped in an anchor element).
 */
describe('Property 2: PageHeader breadcrumb link correctness', () => {
  it('non-last items with href render as <a> elements', () => {
    fc.assert(
      fc.property(breadcrumbsArb, titleArb, (breadcrumbs, title) => {
        const { container } = render(
          <PageHeader breadcrumbs={breadcrumbs} title={title} />
        );

        const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
        expect(nav).not.toBeNull();

        const links = nav!.querySelectorAll('a');
        const nonLastWithHref = breadcrumbs.slice(0, -1).filter((b) => b.href);

        // Every non-last item with an href should produce an <a> element
        expect(links.length).toBe(nonLastWithHref.length);

        // Each link should have the correct href and label
        nonLastWithHref.forEach((crumb, idx) => {
          expect(links[idx]).toHaveAttribute('href', crumb.href);
          expect(links[idx].textContent).toBe(crumb.label);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('last item renders as non-interactive text (span, not an anchor)', () => {
    fc.assert(
      fc.property(breadcrumbsArb, titleArb, (breadcrumbs, title) => {
        const { container } = render(
          <PageHeader breadcrumbs={breadcrumbs} title={title} />
        );

        const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
        expect(nav).not.toBeNull();

        // Get all top-level span wrappers (each breadcrumb item is wrapped in a span)
        const itemWrappers = nav!.querySelectorAll(':scope > span');
        const lastWrapper = itemWrappers[itemWrappers.length - 1];

        // The last item should NOT contain an <a> element
        const anchorInLast = lastWrapper.querySelector('a');
        expect(anchorInLast).toBeNull();

        // The last item should contain a <span> with the label text
        const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
        const spans = lastWrapper.querySelectorAll('span');
        const textSpans = Array.from(spans).filter(
          (s) => s.textContent === lastBreadcrumb.label
        );
        expect(textSpans.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('non-last items without href render as non-interactive text', () => {
    fc.assert(
      fc.property(breadcrumbsArb, titleArb, (breadcrumbs, title) => {
        // Only test when there are at least 2 items
        fc.pre(breadcrumbs.length >= 2);

        const { container } = render(
          <PageHeader breadcrumbs={breadcrumbs} title={title} />
        );

        const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
        expect(nav).not.toBeNull();

        const itemWrappers = nav!.querySelectorAll(':scope > span');

        // Check non-last items without href are rendered as spans (not links)
        breadcrumbs.slice(0, -1).forEach((crumb, idx) => {
          if (!crumb.href) {
            const wrapper = itemWrappers[idx];
            const anchor = wrapper.querySelector('a');
            expect(anchor).toBeNull();
            // Should have a span with the label text
            const spans = wrapper.querySelectorAll('span');
            const textSpans = Array.from(spans).filter(
              (s) => s.textContent === crumb.label
            );
            expect(textSpans.length).toBeGreaterThanOrEqual(1);
          }
        });
      }),
      { numRuns: 100 }
    );
  });
});
