'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

import { PreviewSource } from './preview-source';
import { PreviewTabs } from './preview-tabs';

export function Preview({
  className,
  align = 'center',
  hideCode = false,
  children,
  code,
  language = 'tsx',
  autoHeight = false,
  title,
  ...props
}: React.ComponentProps<'div'> & {
  align?: 'center' | 'start' | 'end';
  hideCode?: boolean;
  children?: React.ReactNode;
  code?: string;
  language?: string;
  autoHeight?: boolean;
  title?: string;
}) {
  const hasPreview = Boolean(children);
  const hasCode = Boolean(code && code.length > 0);

  // If only code, show just the source
  if (!hasPreview && hasCode) {
    return (
      <div className="group relative mt-4 flex flex-col gap-2 [&:not(:last-child)]:mb-8">
        <div className="relative rounded-lg border bg-[#101010] md:-mx-1">
          <PreviewSource
            code={code || ''}
            language={language}
            title={title}
            autoHeight={autoHeight}
          />
        </div>
      </div>
    );
  }

  // If only preview, show just the component
  if (hasPreview && !hasCode) {
    return (
      <div className="group relative mt-4 flex flex-col gap-2 [&:not(:last-child)]:mb-8">
        <div className="relative rounded-lg border md:-mx-1">
          <div
            data-align={align}
            className={cn(
              'preview flex w-full justify-center p-10',
              !autoHeight ? 'h-[450px]' : 'min-h-[200px]',
              'data-[align=start]:items-start data-[align=end]:items-end data-[align=center]:items-center'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // If both, show tabs
  if (hasPreview && hasCode) {
    return (
      <PreviewTabs
        className={className}
        align={align}
        hideCode={hideCode}
        autoHeight={autoHeight}
        component={children}
        source={
          <PreviewSource
            code={code || ''}
            language={language}
            title={title}
            autoHeight={autoHeight}
          />
        }
        {...props}
      />
    );
  }

  return null;
}
