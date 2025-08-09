import { cn } from '@/lib/utils';

export function Description({
  children,
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'leading-relaxed [&:not(:first-child)]:mt-2 [&:not(:last-child)]:mb-8',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
