'use client';

import { Preview } from '@/components/preview';
import { Description } from '@/components/ui/description';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';

const code = `import { Cart } from './store';

// Batch multiple state updates into a single re-render / notification
Cart.batch(() => {
  Cart.dispatch.addItem({ id: 1, name: 'Apple', quantity: 2 });
  Cart.dispatch.addItem({ id: 2, name: 'Banana', quantity: 5 });
  Cart.dispatch.removeItem(1);
});

// ✅ The UI will only re-render once, even though we made 3 updates`;

export function Batch() {
  return (
    <Section>
      <Headline id="store-batch">Store.batch()</Headline>

      <Description>
        The <code>batch</code> function allows you to group multiple state
        updates together, reducing the number of re-renders.
      </Description>

      <Preview code={code} autoHeight />
    </Section>
  );
}
