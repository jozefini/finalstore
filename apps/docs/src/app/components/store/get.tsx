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

const code = `// Import the store
import { Store } from './store';

// Method 1: Get entire state
const entireState = Store.get();
console.log(entireState.count); // 0

// Method 2: Get specific state with selector function
const count = Store.get((state) => state.count);
console.log(count); // 0

// Method 3: Get computed value using selectors
const isEven = Store.get.isEven();
console.log(isEven); // true (since count is 0)

// Can be called anywhere - no React required!
function isCountGreaterThanTen() {
  const currentCount = Store.get((s) => s.count);
  return currentCount > 10;
}
`;

export function Get() {
  return (
    <Section>
      <Headline id="store-get">Store.get()</Headline>

      <Description>
        Read data from your store without subscribing to changes. Perfect for
        one-time reads, utility functions, and anywhere outside React
        components.
      </Description>

      <Preview code={code} />

      <DetailList>
        <DetailListTitle>
          <FlaskConicalOff className="h-4 w-4" />
          Non-reactive
        </DetailListTitle>
        <DetailListDescription>
          Get methods don't trigger re-renders. They're perfect for one-time
          reads, utility functions, event handlers, and anywhere you need
          current data without subscribing to changes.
        </DetailListDescription>
        <DetailListTitle>
          <ChartNoAxesGantt className="h-4 w-4" />
          Three access patterns
        </DetailListTitle>
        <DetailListDescription>
          Access entire state, use selector functions for specific values, or
          call computed selectors directly. All return current data instantly
          without subscriptions.
        </DetailListDescription>
        <DetailListTitle>
          <Split className="h-4 w-4" />
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
