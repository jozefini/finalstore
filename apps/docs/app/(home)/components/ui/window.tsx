'use client';

import { useState } from 'react';
import { Code, Eye } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';

type WindowProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function WindowWithCode({
  title,
  code = '',
  children,
  className = 'max-w-3xl mx-auto'
}: Omit<WindowProps, 'children'> & {
  code?: string;
  children?: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('code');
  const trimmedCode = code.trim();

  return (
    <div
      className={`border-fd-border bg-fd-card overflow-hidden rounded-lg border ${className}`}
    >
      <div className="border-fd-border bg-fd-card flex h-8 items-center justify-between gap-2 border-b px-4 font-mono text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          {title && (
            <span className="text-fd-muted-foreground ml-2">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex min-h-8 cursor-pointer items-center gap-2 border-b-2 text-xs font-medium transition-colors ${
              activeTab === 'code'
                ? 'border-fd-primary text-fd-foreground dark:border-pink-600'
                : 'text-fd-muted-foreground hover:text-fd-foreground border-transparent'
            }`}
          >
            <Code className="h-4 w-4" />
            Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex min-h-8 cursor-pointer items-center gap-2 border-b-2 text-xs font-medium transition-colors ${
              activeTab === 'preview'
                ? 'border-fd-primary text-fd-foreground dark:border-pink-600'
                : 'text-fd-muted-foreground hover:text-fd-foreground border-transparent'
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>
      <div className="overflow-auto bg-gradient-to-t from-gray-50 to-white">
        {activeTab === 'preview' && (
          <div className="flex min-h-[300px] items-center justify-center">
            {children}
          </div>
        )}
        {activeTab === 'code' && (
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
        )}
      </div>
    </div>
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
