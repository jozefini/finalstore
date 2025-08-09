'use client';

import { createStore } from './package/store'; // Your store implementation

// Types
type States = {
  count: number;
  isLoading: boolean;
};

type Actions = {
  increment: () => void;
  incrementBy: (amount: number) => void;
  decrement: (amount: number) => void;
  fetchCount: () => Promise<number>;
};

type Selectors = {
  isEven: () => boolean;
};

// Instance
export const Store = createStore<States, Actions, Selectors>({
  states: {
    count: 0,
    isLoading: false
  },
  actions: ({ set, get, notify }) => ({
    // No-arg increment
    increment: () => {
      set((states) => {
        states.count += 1;
      });
    },
    // With argument
    incrementBy: (amount: number) => {
      set((states) => {
        states.count += amount;
      });
    },
    // Existing decrement
    decrement: (amount: number) => {
      set((states) => {
        states.count -= amount;
      });
    },
    // Async example
    async fetchCount() {
      set((states) => {
        states.isLoading = true;
      });
      notify(); // Force UI update for loading state

      try {
        const newCount = await new Promise<number>((resolve) =>
          setTimeout(() => resolve(Math.floor(Math.random() * 100)), 500)
        );

        set((states) => {
          states.count = newCount;
        });

        return newCount;
      } finally {
        set((states) => {
          states.isLoading = false;
        });
      }
    }
  }),
  selectors: ({ get }) => ({
    isEven: () => {
      return get().count % 2 === 0;
    }
  })
});
