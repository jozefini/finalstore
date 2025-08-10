import { Preview } from '@/components/preview';
import { Description } from '@/components/ui/description';
import {
  DetailList,
  DetailListDescription,
  DetailListTitle
} from '@/components/ui/detail-list';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';
import { Activity, Circle, Search } from 'lucide-react';

const setupCode = `import { createStore } from 'finalstore';

// Types
type States = {
  items: { id: string; name: string; price: number; quantity: number }[];
  loading: boolean;
};
type Actions = {
  addItem: (item: States['items'][number]) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  fetchCart: () => Promise<void>;
};
type Selectors = {
  totalItems: () => number;
  totalPrice: () => number;
  isLoading: () => boolean;
};

// Store
export const Cart = createStore<States, Actions, Selectors>({
  states: {
    items: [],
    loading: false,
  },

  actions: ({ set, notify, clearCache }) => ({
    addItem: (item) => {
      set((state) => {
        const existing = state.items.find((i) => i.id === item.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          state.items.push(item);
        }
      });

      // Clear cache because cart totals depend on 'items'
      clearCache(['totalItems', 'totalPrice']);
    },

    removeItem: (id) => {
      set((state) => {
        state.items = state.items.filter((i) => i.id !== id);
      });

      // Again, totals are outdated, so clear them
      clearCache(['totalItems', 'totalPrice']);
    },

    clearCart: () => {
      set((state) => {
        state.items = [];
      });

      // Totals will be 0 after clearing, so refresh them
      clearCache(['totalItems', 'totalPrice']);
    },

    fetchCart: async () => {
      set((state) => {
        state.loading = true;
      });

      notify(); // Show loading in UI immediately

      const cartData = await fakeApi.getCart();

      set((state) => {
        state.items = cartData;
        state.loading = false;
      });

      // Fetched data changes items, so recalc totals
      clearCache(['totalItems', 'totalPrice']);
    },
  }),

  selectors: ({ get, cache }) => ({
    // Cache this because it's a computed value from 'items'
    // and can be expensive to calculate if 'items' grows large
    totalItems: cache(() =>
      get().items.reduce((sum, item) => sum + item.quantity, 0)
    ),

    // Also cache this — involves iterating over 'items' and multiplying
    // so caching avoids unnecessary recalculation
    totalPrice: cache(() =>
      get().items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
    ),

    // No cache here — this is a cheap, single-property access
    // and always reflects the latest loading state instantly
    isLoading: () => get().loading,
  }),
});
`;

export function Setup() {
  return (
    <Section>
      <Headline id="store-setup">Getting started</Headline>

      <Description>
        First things first, make a store. Everything else hangs off it, so
        let&apos;s get that sorted before we move on.
      </Description>

      <Preview code={setupCode} autoHeight />

      <DetailList>
        <DetailListTitle>
          <Circle />
          States
        </DetailListTitle>
        <DetailListDescription>
          The single source of truth for your store, data your app depends on,
          always in sync.
        </DetailListDescription>
        <DetailListTitle>
          <Activity />
          Actions
        </DetailListTitle>
        <DetailListDescription>
          Functions that update your store&apos;s state, the only way it should
          change.
        </DetailListDescription>
        <DetailListTitle>
          <Search />
          Selectors
        </DetailListTitle>
        <DetailListDescription>
          Functions that return exactly what you need from the store. Cached
          until the store changes, with optional manual cache control for heavy
          selectors.
        </DetailListDescription>
      </DetailList>
    </Section>
  );
}
