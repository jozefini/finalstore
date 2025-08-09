'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Clipboard } from 'lucide-react';

export function CopyButton({ value }: { value: string }) {
  const [isCopying, setIsCopying] = useState(false);

  async function copyCode() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 1200);
    } catch {
      // noop
    }
  }

  return (
    <Button
      data-slot="copy-button"
      onClick={copyCode}
      variant="ghost"
      className="bg-code absolute right-2 top-3 z-10 size-7 p-0 hover:opacity-100 focus-visible:opacity-100"
      aria-label="Copy"
    >
      {isCopying ? (
        <Check className="size-4" />
      ) : (
        <Clipboard className="size-4" />
      )}
      <span className="sr-only">Copy</span>
    </Button>
  );
}
