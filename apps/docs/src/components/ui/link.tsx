'use client';

import { useEffect, useMemo, useState } from 'react';
import { scrollToHashTarget } from '@/hooks/use-hash-scroll';
import { cn } from '@/lib/utils';

type LinkProps = Omit<React.ComponentProps<'a'>, 'href'> & {
  href: `#${string}`;
  currentId?: string;
};

export function Link({
  href,
  className,
  onClick,
  currentId,
  ...rest
}: LinkProps) {
  const targetId = useMemo(() => decodeURIComponent(href.slice(1)), [href]);
  const [isCurrent, setIsCurrent] = useState<boolean | undefined>(
    currentId ? currentId === targetId : undefined
  );

  useEffect(() => {
    if (currentId) {
      setIsCurrent(currentId === targetId);
      return;
    }
    function update() {
      setIsCurrent(window.location.hash === `#${targetId}`);
    }
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [currentId, targetId]);

  return (
    <a
      role="link"
      aria-current={isCurrent ? 'true' : undefined}
      href={href}
      className={cn('text-foreground/80 hover:text-foreground', className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          e.preventDefault();
          scrollToHashTarget(href);
        }
      }}
      {...rest}
    />
  );
}
