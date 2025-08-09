import { Preview } from '@/components/preview';
import { Description } from '@/components/ui/description';
import {
  DetailList,
  DetailListDescription,
  DetailListTitle
} from '@/components/ui/detail-list';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';
import { Store } from '@/lib/store';

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
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Reactive updates
        </DetailListTitle>
        <DetailListDescription>
          Components re-render automatically when subscribed data changes. Use
          selectors to optimize performance by subscribing only to the data you
          need.
        </DetailListDescription>
        <DetailListTitle>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 3v6h6" />
            <path d="M21 3h-8l-2 2-2-2H3v7l2 2-2 2v7h8l2-2 2 2h8v-7l-2-2 2-2V3z" />
          </svg>
          Component-only
        </DetailListTitle>
        <DetailListDescription>
          Must be called directly in your React component body, following hooks
          rules. For non-component code like event handlers, use Store.get()
          instead.
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
            <path d="m13 8-8 6-2-2 8-6 2 2Z" />
            <path d="m13 12-8 6-2-2 8-6 2 2Z" />
            <path d="M21 8V6l-8 6 8 6v-2" />
            <path d="M21 12v-2l-8 6 8 6v-2" />
          </svg>
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
