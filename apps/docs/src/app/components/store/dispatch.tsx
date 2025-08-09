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
import { Loader2, Parentheses, Plus, Zap } from 'lucide-react';

const code = `// Import
import { createStore } from 'finalstore';

export const Store = createStore<States, Actions, Selectors>({
  states: {
    count: 0,
    isLoading: false
  },
  actions: ({ set, get, notify }) => ({
    increment: () => {
      set((states) => {
        states.count += 1;
      });
    },
    incrementBy: (amount: number) => {
      set((states) => {
        states.count += amount;
      });
    },
    async fetchCount() {
      set((states) => {
        states.isLoading = true;
      });
      notify(); // Force UI update for loading state

      try {
        const newCount = await new Promise<number>((resolve) =>
          setTimeout(() => resolve(Math.floor(Math.random() * 100)), 500)
        );

        set((states) => {
          states.count = newCount;
        });

        return newCount;
      } finally {
        set((states) => {
          states.isLoading = false;
        });
      }
    }
  }),
  selectors: ({ get }) => ({ ... })
});

function Counter() {
  const count = Store.use((state) => state.count);
  const isLoading = Store.use((state) => state.isLoading);

  // Destructure actions from dispatch
  const { increment, incrementBy, fetchCount } = Store.dispatch;

  return (
    <div>
      <p>Count: {count}</p>
      {isLoading && <p>Loading...</p>}
      <button onClick={increment}>+1</button>
      <button onClick={() => incrementBy(5)}>+5</button>
      <button onClick={fetchCount}>Fetch random count</button>
    </div>
  );
}

// Actions can also be called outside components
Store.dispatch.increment();
Store.dispatch.incrementBy(10);
await Store.dispatch.fetchCount();
`;

const PreviewComponent = () => {
  const count = Store.use((state) => state.count);
  const isLoading = Store.use((state) => state.isLoading);
  const isEven = Store.use.isEven();
  const { increment, incrementBy, fetchCount } = Store.dispatch;

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="bg-muted/30 grid grid-cols-2 gap-x-12 gap-y-4 rounded-lg border p-6">
        <div className="text-muted-foreground text-right font-medium">
          Count
        </div>
        <div className="flex items-center gap-2 font-bold tabular-nums tracking-tight">
          {count}
          {isLoading && (
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          )}
        </div>

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
          onClick={increment}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => incrementBy(5)}
          disabled={isLoading}
        >
          +5
        </Button>
        <Button variant="secondary" onClick={fetchCount} disabled={isLoading}>
          Fetch
        </Button>
      </div>
    </div>
  );
};

export function Dispatch() {
  return (
    <Section>
      <Headline id="store-dispatch">Store.dispatch()</Headline>

      <Description>
        The <code>dispatch</code> object holds all your store actions. Call them
        from anywhere to update state — with or without arguments, sync or
        async.
      </Description>

      <Preview code={code}>
        <PreviewComponent />
      </Preview>

      <DetailList>
        <DetailListTitle>
          <Parentheses className="h-4 w-4" />
          Call from anywhere
        </DetailListTitle>
        <DetailListDescription>
          Use actions in components, event handlers, or outside React entirely —
          no hook rules apply.
        </DetailListDescription>

        <DetailListTitle>
          <Plus className="h-4 w-4" />
          Arguments supported
        </DetailListTitle>
        <DetailListDescription>
          Pass any arguments your action expects. Perfect for parameterized
          updates like <code>incrementBy(5)</code>.
        </DetailListDescription>

        <DetailListTitle>
          <Zap className="h-4 w-4" />
          Async ready
        </DetailListTitle>
        <DetailListDescription>
          Async actions return a <code>Promise</code>, so you can{' '}
          <code>await</code>
          them to get results when they finish.
        </DetailListDescription>
      </DetailList>
    </Section>
  );
}
