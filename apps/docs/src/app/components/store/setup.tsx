import { Preview } from '@/components/preview';
import { Description } from '@/components/ui/description';
import {
  DetailList,
  DetailListDescription,
  DetailListTitle
} from '@/components/ui/detail-list';
import { Headline } from '@/components/ui/headline';
import { Section } from '@/components/ui/section';

const code = `// Import
import { createStore } from 'finalstore';

// Types
type States = {
  count: number;
}
type Actions = {
  increment: (amount: number) => void;
  decrement: (amount: number) => void;
}
type Selectors = {
  isEven: () => boolean;
}

// Instance
export const Store = createStore<States, Actions, Selectors>({
  states: {
    count: 0,
  },
  actions: ({ set }) => ({
    increment: (amount: number) => {
      set((states) => {
        states.count += amount;
      });
    },
    decrement: (amount: number) => {
      set((states) => {
        states.count -= amount;
      });
    },
  }),
  selectors: ({ get }) => ({
    isEven: () => {
      return get('count') % 2 === 0;
    },
  }),
});
`;

export function Setup() {
  return (
    <Section>
      <Headline id="store-setup">Getting started</Headline>

      <Description>
        First things first, make a store. Everything else hangs off it, so let's
        get that sorted before we move on.
      </Description>

      <Preview code={code} />

      <DetailList>
        <DetailListTitle>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          States
        </DetailListTitle>
        <DetailListDescription>
          The single source of truth for your store, data your app depends on,
          always in sync.
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
            <path d="M14 4a2 2 0 0 1 2-2" />
            <path d="M16 10a2 2 0 0 1-2-2" />
            <path d="M20 2a2 2 0 0 1 2 2" />
            <path d="M22 8a2 2 0 0 1-2 2" />
            <path d="m3 7 3 3 3-3" />
            <path d="M6 10V5a3 3 0 0 1 3-3h1" />
            <rect x="2" y="14" width="8" height="8" rx="2" />
          </svg>
          Actions
        </DetailListTitle>
        <DetailListDescription>
          Functions that update your store's state, the only way it should
          change.
        </DetailListDescription>
        <DetailListTitle>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
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
