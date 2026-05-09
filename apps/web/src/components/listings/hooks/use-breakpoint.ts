'use client';

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_QUERY = '(min-width: 768px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

function getBreakpoint(tablet: boolean, desktop: boolean): Breakpoint {
  if (desktop) return 'desktop';
  if (tablet) return 'tablet';
  return 'mobile';
}

/**
 * Tracks viewport width against defined breakpoints using `window.matchMedia`.
 *
 * Breakpoints:
 * - mobile: < 768px
 * - tablet: 768px – 1023px
 * - desktop: ≥ 1024px
 *
 * SSR-safe: defaults to 'desktop' during server rendering and hydrates on mount.
 * Updates are batched within a single animation frame on resize.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tabletMql = window.matchMedia(TABLET_QUERY);
    const desktopMql = window.matchMedia(DESKTOP_QUERY);

    // Hydrate with actual value on mount
    setBreakpoint(getBreakpoint(tabletMql.matches, desktopMql.matches));

    let rafId: number | null = null;

    const update = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setBreakpoint(getBreakpoint(tabletMql.matches, desktopMql.matches));
      });
    };

    tabletMql.addEventListener('change', update);
    desktopMql.addEventListener('change', update);

    return () => {
      tabletMql.removeEventListener('change', update);
      desktopMql.removeEventListener('change', update);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return breakpoint;
}
