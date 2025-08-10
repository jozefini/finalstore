'use client';

import { useEffect, useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { CopyButton } from './copy-button';
import { highlightCode } from './highlight-code';

export function PreviewSource({
  code,
  language = 'tsx',
  title,
  autoHeight = false
}: {
  code: string;
  language?: string;
  title?: string;
  autoHeight?: boolean;
}) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      try {
        const html = await highlightCode(code, language);
        if (!cancelled) setHighlightedCode(html);
      } catch {
        if (!cancelled) setHighlightedCode('');
      }
    }
    highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <figure data-rehype-pretty-code-figure="" className="m-0">
      {title && (
        <figcaption
          data-rehype-pretty-code-title=""
          className="text-code-foreground [&_svg]:text-code-foreground flex items-center gap-2 [&_svg]:size-4 [&_svg]:opacity-70"
          data-language={language}
        >
          {title}
        </figcaption>
      )}
      <CopyButton value={code} />
      <ScrollArea className={cn(!autoHeight ? 'h-[450px]' : '')}>
        <div className="relative px-3 [&_pre]:text-sm">
          {highlightedCode ? (
            <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          ) : (
            <pre className="px-4 py-3.5">
              <code>{code}</code>
            </pre>
          )}
        </div>
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </figure>
  );
}
