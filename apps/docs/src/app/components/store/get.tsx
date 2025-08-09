import { Preview } from '@/components/preview';
import { Description } from '@/components/ui/description';
import {
  DetailList,
  DetailListDescription,
  DetailListTitle
} from '@/components/ui/detail-list';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';

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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 2v2.343" />
            <path d="M14 2v6.343" />
            <path d="m2 2 20 20" />
            <path d="M20 20a2 2 0 0 1-2 2H6a2 2 0 0 1-1.755-2.96l5.227-9.563" />
            <path d="M6.453 15H15" />
            <path d="M8.5 2h7" />
          </svg>
          Non-reactive
        </DetailListTitle>
        <DetailListDescription>
          Get methods don't trigger re-renders. They're perfect for one-time
          reads, utility functions, event handlers, and anywhere you need
          current data without subscribing to changes.
        </DetailListDescription>
        <DetailListTitle>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
          </svg>
          Three access patterns
        </DetailListTitle>
        <DetailListDescription>
          Access entire state, use selector functions for specific values, or
          call computed selectors directly. All return current data instantly
          without subscriptions.
        </DetailListDescription>
        <DetailListTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 15 6 6" />
            <path d="m15 9 6-6" />
            <path d="M21 16v5h-5" />
            <path d="M21 8V3h-5" />
            <path d="M3 16v5h5" />
            <path d="m3 21 6-6" />
            <path d="M3 8V3h5" />
            <path d="M9 9 3 3" />
          </svg>
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
