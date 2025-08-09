import { cn } from '@/lib/utils';

export function Headline({
  children,
  className,
  ...props
}: React.ComponentProps<'h1'>) {
  return (
    <h1
      className={cn(
        'font-heading *:[code]:text-xl scroll-m-28 text-xl font-semibold tracking-tight [&:not(:first-child)]:mt-14',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}
