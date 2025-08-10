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

const code = `import { Cart } from './store';

// Method 1: Call a dispatcher directly to update state
Cart.dispatch.addItem({ id: 1, name: 'Apple', quantity: 3 });

// Method 2: Remove an item
Cart.dispatch.removeItem(1);

// Method 3: Clear the entire cart
Cart.dispatch.clearCart();

// Method 4: Run an async dispatcher (e.g., fetch data from API)
await Cart.dispatch.fetchCart();

// Dispatchers can be called anywhere - no React required!
function addTwoApples() {
  Cart.dispatch.addItem({ id: 1, name: 'Apple', quantity: 2 });
}`;

export function Dispatch() {
  return (
    <Section>
      <Headline id="store-dispatch">Store.dispatch()</Headline>

      <Description>
        The <code>dispatch</code> object holds all store actions. Here&apos;s
        where they are defined in <code>createStore</code>, followed by usage
        examples.
      </Description>

      <Preview code={code} autoHeight />

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
