export function DetailList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="mb-6 mt-4 rounded-lg border border-dashed bg-[#101010] px-4 py-5 md:-mx-1">
      {children}
    </dl>
  );
}

export function DetailListTitle({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wide [&:not(:first-child)]:mt-6 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-neutral-400">
      {children}
    </dt>
  );
}

export function DetailListDescription({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <dd className="[&_code]:bg-muted mt-1 text-sm leading-relaxed text-neutral-200 [&_code]:mx-1 [&_code]:rounded-sm [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:font-medium [&_code]:text-neutral-400">
      {children}
    </dd>
  );
}
