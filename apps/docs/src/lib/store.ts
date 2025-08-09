import { createStore } from '../../../../packages/store/src/store-3'; // Your store implementation

// Types
type States = {
  count: number;
};
type Actions = {
  increment: (amount: number) => void;
  decrement: (amount: number) => void;
};
type Selectors = {
  isEven: () => boolean;
};

// Instance
export const Store = createStore<States, Actions, Selectors>({
  states: {
    count: 0
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
    }
  }),
  selectors: ({ get }) => ({
    isEven: () => {
      return get().count % 2 === 0;
    }
  })
});
