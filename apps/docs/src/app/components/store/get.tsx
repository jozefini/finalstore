import { Preview } from '@/components/preview';
import { Description } from '@/components/ui/description';
import {
  DetailList,
  DetailListDescription,
  DetailListTitle
} from '@/components/ui/detail-list';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';
import { ChartNoAxesGantt, FlaskConicalOff, Split } from 'lucide-react';

const code = `import { Cart } from './store';

// Method 1: Get the entire state object
const entireState = Cart.get();
console.log(entireState.items);   // []
console.log(entireState.loading); // false

// Method 2: Get a specific piece of state via selector function
const loading = Cart.get((state) => state.loading);
console.log(loading); // false

// Method 3: Get a computed value from cached selectors
const totalItems = Cart.get.totalItems();
console.log(totalItems); // 0

// Method 4: Get another computed value (also cached)
const totalPrice = Cart.get.totalPrice();
console.log(totalPrice); // 0

// Example: This can be called anywhere - no React required!
function hasMoreThanFiveItems() {
  const itemCount = Cart.get.totalItems(); // Cached selector
  return itemCount > 5;
}

console.log(hasMoreThanFiveItems()); // false`;

export function Get() {
  return (
    <Section>
      <Headline id="store-get">Store.get()</Headline>

      <Description>
        Read data from your store without subscribing to changes. Perfect for
        one-time reads, utility functions, and anywhere outside React
        components.
      </Description>

      <Preview code={code} autoHeight />

      <DetailList>
        <DetailListTitle>
          <FlaskConicalOff />
          Non-reactive
        </DetailListTitle>
        <DetailListDescription>
          Get methods don&apos;t trigger re-renders. They&apos;re perfect for
          one-time reads, utility functions, event handlers, and anywhere you
          need current data without subscribing to changes.
        </DetailListDescription>
        <DetailListTitle>
          <ChartNoAxesGantt />
          Three access patterns
        </DetailListTitle>
        <DetailListDescription>
          Access entire state, use selector functions for specific values, or
          call computed selectors directly. All return current data instantly
          without subscriptions.
        </DetailListDescription>
        <DetailListTitle>
          <Split />
          Works everywhere
        </DetailListTitle>
        <DetailListDescription>
          Unlike reactive hooks, get methods work anywhere in your codebase -
          utility functions, event handlers, middleware, server code, or any
          JavaScript environment.
        </DetailListDescription>
      </DetailList>
    </Section>
  );
}
