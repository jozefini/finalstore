'use client';

import { RefObject, useEffect } from 'react';

const MOBILE_OFFSET = 100;
const DESKTOP_OFFSET = 50;
const BREAKPOINT = 1024;

const isMobile = () => window.innerWidth < BREAKPOINT;

export function useHashScroll<T extends HTMLElement>(
  container: RefObject<T | null>
) {
  useEffect(() => {
    const element = container.current;
    if (!element) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as Element | null;
      if (!target) return;

      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('#') || href === '#') return;

      const id = decodeURIComponent(href.slice(1));
      const destination = document.getElementById(id);
      if (!destination) return;

      event.preventDefault();

      scrollToElement(destination);

      // Update URL hash without adding a new history entry
      try {
        history.replaceState(null, '', href);
      } catch {
        // no-op
      }
    }

    element.addEventListener('click', handleClick);
    return () => {
      element.removeEventListener('click', handleClick);
    };
  }, [container]);
}

export function scrollToElement(element: Element, durationMs = 200) {
  const offset = isMobile() ? MOBILE_OFFSET : DESKTOP_OFFSET;
  const targetY = window.scrollY + element.getBoundingClientRect().top - offset;
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) return;

  const startTime = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  function animate(now: number) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    const eased = easeOutCubic(t);
    window.scrollTo(0, startY + delta * eased);
    if (t < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

export function scrollToHashTarget(hash: string) {
  if (!hash.startsWith('#') || hash === '#') return;
  const id = decodeURIComponent(hash.slice(1));
  const destination = document.getElementById(id);
  if (!destination) return;
  scrollToElement(destination);
  try {
    history.replaceState(null, '', `#${id}`);
  } catch {
    // no-op
  }
}
