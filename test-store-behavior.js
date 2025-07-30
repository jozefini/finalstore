// Simple test to verify store behavior
const { createStore } = require('./packages/store/src/store-3.ts');

const initialStates = {
  title: 'Hello',
  count: 0
};

const Store = createStore({
  states: initialStates,
  actions: ({ set, clearCache }) => ({
    setTitle: (text) => {
      set((states) => {
        states.title = text;
      });
      // Only clear cache for cached selectors
      clearCache('hasTitle');
      clearCache('isUsingLetterA');
    },
    increment: () => {
      set((states) => {
        states.count++;
      });
    }
  }),
  selectors: ({ get, cache }) => ({
    hasTitle: cache(() => {
      console.log('🔄 Computing hasTitle (cached)');
      return !!get().title;
    }),
    isUsingLetterA: cache(() => {
      console.log('🔄 Computing isUsingLetterA (cached)');
      return get().title.toLowerCase().includes('a');
    }),
    title: () => {
      console.log('🔄 Computing title (not cached)');
      return get().title;
    },
    titleLength: () => {
      console.log('🔄 Computing titleLength (not cached)');
      return get().title.length;
    }
  })
});

console.log('=== Initial calls ===');
console.log('hasTitle:', Store.get.hasTitle());
console.log('title:', Store.get.title());

console.log(
  '\n=== Second calls (cached should not recompute, non-cached should) ==='
);
console.log('hasTitle:', Store.get.hasTitle());
console.log('title:', Store.get.title());

console.log('\n=== Change title ===');
Store.dispatch.setTitle('World');

console.log(
  '\n=== After change (cached should use cache, non-cached should recompute) ==='
);
console.log('hasTitle:', Store.get.hasTitle());
console.log('title:', Store.get.title());
