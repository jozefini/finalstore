'use client';

import {
  HTMLAttributes,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';
import { cn } from '@/lib/utils';

type SectionProps = HTMLAttributes<HTMLElement> & {
  id?: string;
};

export function Section({ id, className, children, ...rest }: SectionProps) {
  const fallbackId = useId();
  const sectionId = useMemo(() => id ?? `s-${fallbackId}`, [id, fallbackId]);
  const ref = useRef<HTMLElement | null>(null);
  const [isCurrent, setIsCurrent] = useState(false);

  // Keep ARIA state in sync with the URL hash
  useEffect(() => {
    function updateFromHash() {
      const active = window.location.hash === `#${sectionId}`;
      setIsCurrent(active);
      if (active && ref.current) {
        // optional: ensure it is brought into view when navigated directly
        // without animating if the browser already positioned it
      }
    }

    updateFromHash();
    window.addEventListener('hashchange', updateFromHash);
    return () => window.removeEventListener('hashchange', updateFromHash);
  }, [sectionId]);

  return (
    <section
      ref={ref}
      id={sectionId}
      aria-current={isCurrent ? 'true' : undefined}
      aria-labelledby={`${sectionId}-label`}
      className={cn(
        'outline-none [&:not(:first-child)]:mt-8 [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-7 lg:[&:not(:first-child)]:mt-12 lg:[&:not(:first-child)]:pt-10',
        className
      )}
      tabIndex={-1}
      {...rest}
    >
      {children}
    </section>
  );
}
