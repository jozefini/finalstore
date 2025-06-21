import { createStore } from './src/store.tsx';

const store = createStore({
  states: {
    items: [],
    settings: {},
    user: { profile: { theme: 'light' } }
  },
  actions: ({ states }) => ({
    // Test: These should all work (detected automatically)
    testDirectMutations: () => {
      states.items.push('item1');                    // ✅ Should work
      states.settings.key1 = 'value1';              // ✅ Should work  
      delete states.settings.key1;                  // ✅ Should work
      
      console.log('Direct mutations completed');
    },
    
    // Test: This won't work reliably
    testDeepMutation: () => {
      states.user.profile.theme = 'dark';           // ❌ Too deep
      console.log('Deep mutation completed');
    }
  })
});

// Test direct mutations
console.log('Before:', store.get());
store.dispatch.testDirectMutations();
console.log('After direct:', store.get());

// Test deep mutation (this may not trigger update)
store.dispatch.testDeepMutation(); 
console.log('After deep:', store.get());
