'use client';

import { Preview } from '@/components/preview';
import { Button } from '@/components/ui/button';
import { Description } from '@/components/ui/description';
import {
  DetailList,
  DetailListDescription,
  DetailListTitle
} from '@/components/ui/detail-list';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';
import { Store } from '@/lib/store';
import { Component, Minus, Plus, RefreshCw, Split } from 'lucide-react';

const code = `// Import the store
import { Store } from './store';

function Counter() {
  // Method 1: Subscribe to entire state (⚠️ causes re-renders on ANY state change)
  const state = Store.use();

  // Method 2: Subscribe to specific state (✅ re-renders only when count changes)
  const count = Store.use((state) => state.count);

  // Method 3: Subscribe to computed selector (✅ re-renders only when isEven changes)
  const isEven = Store.use.isEven();

  // ❌ Error: Can't use outside component body
  function handleClick() {
    // Use Store.get() here instead
    const currentCount = Store.get((s) => s.count);
  }

  return (
    <div>
      <p>Count: {count}</p>
      <p>Is Even: {isEven ? 'Yes' : 'No'}</p>
      <button onClick={() => Store.dispatch.increment(1)}>+1</button>
    </div>
  );
}`;

const PreviewComponent = () => {
  const count = Store.use((state) => state.count);
  const isEven = Store.use.isEven();

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="bg-muted/30 grid grid-cols-2 gap-x-12 gap-y-4 rounded-lg border p-6">
        <div className="text-muted-foreground text-right font-medium">
          Count
        </div>
        <div className="font-bold tabular-nums tracking-tight">{count}</div>

        <div className="text-muted-foreground text-right font-medium">
          Is Even
        </div>
        <div className="flex items-center gap-2 font-bold">
          <span className={isEven ? 'text-emerald-500' : 'text-red-500'}>
            {isEven ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => Store.dispatch.decrement(1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => Store.dispatch.increment(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export function Use() {
  return (
    <Section>
      <Headline id="store-use">Store.use()</Headline>

      <Description>
        Subscribe to store updates in React components. Components automatically
        re-render when subscribed data changes, keeping your UI in sync with the
        store.
      </Description>

      <Preview code={code}>
        <PreviewComponent />
      </Preview>

      <DetailList>
        <DetailListTitle>
          <RefreshCw className="h-4 w-4" />
          Reactive updates
        </DetailListTitle>
        <DetailListDescription>
          Components re-render automatically when subscribed data changes. Use
          selectors to optimize performance by subscribing only to the data you
          need.
        </DetailListDescription>
        <DetailListTitle>
          <Component className="h-4 w-4" />
          Component-only
        </DetailListTitle>
        <DetailListDescription>
          Must be called directly in your React component body, following hooks
          rules. For non-component code like event handlers, use
          <code>Store.get()</code>
          instead.
        </DetailListDescription>
        <DetailListTitle>
          <Split className="h-4 w-4" />
          Optimized subscriptions
        </DetailListTitle>
        <DetailListDescription>
          Use selector functions or computed selectors to subscribe to specific
          data. This prevents unnecessary re-renders when unrelated state
          changes.
        </DetailListDescription>
      </DetailList>
    </Section>
  );
}
