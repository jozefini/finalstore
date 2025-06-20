import { Highlight, themes } from 'prism-react-renderer';

type WindowProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function WindowWithCode({
  title,
  code = '',
  className = 'max-w-3xl mx-auto'
}: Omit<WindowProps, 'children'> & { code?: string }) {
  const trimmedCode = code.trim();

  return (
    <Window title={title} className={className}>
      <div className="from-fd-background/50 overflow-auto bg-gradient-to-b to-white">
        <Highlight theme={themes.github} code={trimmedCode} language="tsx">
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className="min-h-full w-full p-4 text-left text-sm"
              style={{
                ...style,
                background: 'transparent',
                margin: 0
              }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </Window>
  );
}

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
