'use client';

import { Preview } from '@/components/preview';
import { Description } from '@/components/ui/description';
import {
  DetailList,
  DetailListDescription,
  DetailListTitle
} from '@/components/ui/detail-list';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';
import { Component, FlaskConical, Split } from 'lucide-react';

const code = `import { Cart } from './store';

function CartSummary() {
  // Method 1: Subscribe to the entire state
  // ⚠️ Will cause re-render on ANY state change (items, loading, etc.)
  const state = Cart.use();

  // Method 2: Subscribe to specific state slice
  // ✅ Only re-renders when "loading" changes
  const loading = Cart.use((state) => state.loading);

  // Method 3: Subscribe to a computed selector
  // ✅ Only re-renders when totalItems changes (cached selector)
  const totalItems = Cart.use.totalItems();

  // Method 4: Subscribe to another computed selector
  // ✅ Only re-renders when totalPrice changes (cached selector)
  const totalPrice = Cart.use.totalPrice();

  // ❌ Error: Can't use Cart.use() outside component body
  // Use Cart.get() instead for event handlers or non-render logic
  function handleCheckout() {
    const items = Cart.get((s) => s.items); // Safe here
    console.log('Checking out with:', items);
  }

  return (
    <div>
      <h2>Cart Summary</h2>
      {loading ? (
        <p>Loading your cart...</p>
      ) : (
        <>
          <p>Total Items: {totalItems}</p>
          <p>Total Price: \${totalPrice.toFixed(2)}</p>
        </>
      )}
      <button onClick={handleCheckout}>Checkout</button>
    </div>
  );
}`;

export function Use() {
  return (
    <Section>
      <Headline id="store-use">Store.use()</Headline>

      <Description>
        Subscribe to store updates in React components. Components automatically
        re-render when subscribed data changes, keeping your UI in sync with the
        store.
      </Description>

      <Preview code={code} autoHeight />

      <DetailList>
        <DetailListTitle>
          <FlaskConical />
          Reactive updates
        </DetailListTitle>
        <DetailListDescription>
          Components re-render automatically when subscribed data changes. Use
          selectors to optimize performance by subscribing only to the data you
          need.
        </DetailListDescription>
        <DetailListTitle>
          <Component />
          Component-only
        </DetailListTitle>
        <DetailListDescription>
          Must be called directly in your React component body, following hooks
          rules. For non-component code like event handlers, use
          <code>Store.get()</code>
          instead.
        </DetailListDescription>
        <DetailListTitle>
          <Split />
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
