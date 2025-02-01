type WindowProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Window({ title, children, className = '' }: WindowProps) {
  return (
    <div
      className={`border-fd-border bg-fd-card overflow-hidden rounded-lg border ${className}`}
    >
      <div className="border-fd-border bg-fd-card flex items-center gap-2 border-b px-4 py-2">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        {title && (
          <span className="text-fd-muted-foreground ml-2 font-mono text-sm">
            {title}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
