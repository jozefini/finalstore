import { cn } from '@/lib/utils';

export function Description({
  children,
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        '[&_code]:bg-muted mt-1 leading-relaxed [&:not(:first-child)]:mt-2 [&:not(:last-child)]:mb-8 [&_code]:mx-1 [&_code]:rounded-sm [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-base [&_code]:text-sm [&_code]:font-medium [&_code]:text-neutral-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
