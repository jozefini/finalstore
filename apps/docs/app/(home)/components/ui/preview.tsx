'use client';

import { useState } from 'react';
import { Check, Code, Copy, Eye } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';

type PreviewFrameProps = {
  code?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function PreviewFrame({
  code = '',
  title,
  children,
  className = 'max-w-3xl'
}: PreviewFrameProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const trimmedCode = code.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trimmedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      className={`border-fd-border bg-fd-card mx-auto w-full overflow-hidden rounded-lg border ${className}`}
    >
      {/* Browser-style Header with Title and Tabs */}
      <div className="border-fd-border border-b">
        <div className="flex items-center justify-between px-4">
          {/* Title */}
          {title && (
            <h3 className="text-fd-foreground inline-flex min-h-10 items-center text-sm font-medium">
              {title}
            </h3>
          )}

          {/* Tab Navigation */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex min-h-10 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'border-fd-primary text-fd-foreground'
                  : 'text-fd-muted-foreground hover:text-fd-foreground border-transparent'
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex min-h-10 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors ${
                activeTab === 'code'
                  ? 'border-fd-primary text-fd-foreground'
                  : 'text-fd-muted-foreground hover:text-fd-foreground border-transparent'
              }`}
            >
              <Code className="h-4 w-4" />
              Code
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {activeTab === 'preview' && (
          <div className="bg-white p-6">
            <div className="flex items-center justify-center">{children}</div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="group relative">
            {/* Code Content */}
            <div className="max-h-[300px] overflow-auto bg-white">
              <Highlight
                theme={themes.github}
                code={trimmedCode}
                language="tsx"
              >
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

            {/* Floating Copy Button - Shows on hover */}
            <button
              onClick={handleCopy}
              className={`absolute right-2 top-2 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium opacity-0 transition-all group-hover:opacity-100 ${
                copied
                  ? 'bg-green-100 text-green-700 shadow-sm'
                  : 'bg-fd-background text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Example how to use the PreviewFrame component */
/*
function ExampleButton() {
  const [count, setCount] = useState(0);

  return (
    <button
      onClick={() => setCount(count + 1)}
      className="bg-fd-primary text-fd-primary-foreground rounded-md px-4 py-2 font-medium transition hover:opacity-90"
    >
      Clicked {count} times
    </button>
  );
}

const exampleCode = `
function ExampleButton() {
  const [count, setCount] = useState(0);

  return (
    <button
      onClick={() => setCount(count + 1)}
      className="bg-fd-primary text-fd-primary-foreground rounded-md px-4 py-2 font-medium transition hover:opacity-90"
    >
      Clicked {count} times
    </button>
  );
}`;
function PreviewExample() {
  return (
    <PreviewFrame code={exampleCode} title="Button Example">
      <ExampleButton />
    </PreviewFrame>
  );
}
*/
