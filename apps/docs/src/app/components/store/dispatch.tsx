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
import { Minus, Play, Plus, Zap } from 'lucide-react';

const code = `// Import the store
import { Store } from './store';

function CounterControls() {
  return (
    <div>
      <button onClick={() => Store.dispatch.decrement(1)}>-</button>
      <button onClick={() => Store.dispatch.increment(1)}>+</button>
    </div>
  );
}
`;

const PreviewComponent = () => {
  const count = Store.use((state) => state.count);

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="text-lg font-bold">Count: {count}</div>
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

export function Dispatch() {
  return (
    <Section>
      <Headline id="store-dispatch">Store.dispatch()</Headline>

      <Description>
        Call actions to update your store's state. Actions are the only way your
        store should change — keeping all updates predictable and trackable.
      </Description>

      <Preview code={code}>
        <PreviewComponent />
      </Preview>

      <DetailList>
        <DetailListTitle>
          <Play className="h-4 w-4" />
          Direct action calls
        </DetailListTitle>
        <DetailListDescription>
          Run actions from anywhere — components, async functions, or event
          listeners — without worrying about React hooks rules.
        </DetailListDescription>

        <DetailListTitle>
          <Zap className="h-4 w-4" />
          Synchronous or async
        </DetailListTitle>
        <DetailListDescription>
          Actions can be synchronous or async. You can safely await an action if
          it returns a promise.
        </DetailListDescription>

        <DetailListTitle>
          <Plus className="h-4 w-4" />
          Arguments supported
        </DetailListTitle>
        <DetailListDescription>
          Pass any arguments your action expects. The store will handle updates
          accordingly.
        </DetailListDescription>
      </DetailList>
    </Section>
  );
}
