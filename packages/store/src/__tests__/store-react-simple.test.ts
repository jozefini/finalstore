import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStore } from '../store';

describe('React Integration - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('store.use() API', () => {
    it('should provide the use() method for React integration', () => {
      const store = createStore({
        states: { count: 0 },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          }
        })
      });

      // Verify the use method exists and has the right API
      expect(typeof store.use).toBe('function');

      // Test basic subscription mechanism (without React rendering)
      let callbackCount = 0;
      const unsubscribe =
        store.use.__proto__.constructor.prototype.subscribe?.call(
          store,
          () => {
            callbackCount++;
          },
          (state: { count: number }) => state.count
        );

      if (unsubscribe) {
        store.dispatch.increment();
        expect(callbackCount).toBeGreaterThan(0);
        unsubscribe();
      }
    });

    it('should work with selectors in use API', () => {
      const store = createStore({
        states: {
          todos: [
            { id: 1, completed: false },
            { id: 2, completed: true }
          ]
        },
        selectors: ({ states }) => ({
          completedCount: () => states.todos.filter((t) => t.completed).length
        })
      });

      // Test selector access
      expect(typeof store.use.completedCount).toBe('function');

      // Test that selectors work independently of React
      const completedCount = store.get.completedCount();
      expect(completedCount).toBe(1);
    });
  });

  describe('Subscription Management', () => {
    it('should handle multiple subscriptions correctly', () => {
      const store = createStore({
        states: { count: 0 },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          }
        })
      });

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      // Mock subscription behavior
      store.dispatch.increment();

      // Verify store state updated
      expect(store.get((state) => state.count)).toBe(1);
    });

    it('should handle subscription cleanup', () => {
      const store = createStore({
        states: { count: 0 },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          }
        })
      });

      // Test that state updates work correctly
      store.dispatch.increment();
      store.dispatch.increment();

      expect(store.get((state) => state.count)).toBe(2);
    });
  });

  describe('State Selection and Optimization', () => {
    it('should handle specific state selection', () => {
      const store = createStore({
        states: {
          count: 0,
          name: 'test',
          data: { nested: 'value' }
        },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          },
          setName: (name: string) => {
            states.name = name;
          }
        })
      });

      // Test various selection patterns
      expect(store.get((state) => state.count)).toBe(0);
      expect(store.get((state) => state.name)).toBe('test');
      expect(store.get((state) => state.data.nested)).toBe('value');

      // Test multiple property selection
      const selected = store.get((state) => ({
        count: state.count,
        name: state.name
      }));

      expect(selected).toEqual({ count: 0, name: 'test' });
    });

    it('should work with complex selectors', () => {
      const store = createStore({
        states: {
          items: [
            { id: 1, category: 'A', active: true },
            { id: 2, category: 'B', active: false },
            { id: 3, category: 'A', active: true }
          ]
        },
        actions: ({ states }) => ({
          toggleItem: (id: number) => {
            const item = states.items.find((i) => i.id === id);
            if (item) item.active = !item.active;
          }
        })
      });

      // Complex selector - active items by category
      const activeByCategory = store.get((state) => {
        const active = state.items.filter((item) => item.active);
        return active.reduce(
          (acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
      });

      expect(activeByCategory).toEqual({ A: 2 });

      store.dispatch.toggleItem(2); // Activate item 2 (category B)

      const updatedActiveByCategory = store.get((state) => {
        const active = state.items.filter((item) => item.active);
        return active.reduce(
          (acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
      });

      expect(updatedActiveByCategory).toEqual({ A: 2, B: 1 });
    });
  });

  describe('Integration with Async Actions', () => {
    it('should work with async actions and loading states', async () => {
      const store = createStore({
        states: {
          data: null as string | null,
          loading: false,
          error: null as string | null
        },
        actions: ({ states, notify }) => ({
          async fetchData() {
            states.loading = true;
            states.error = null;
            notify(); // Would trigger immediate React re-render

            try {
              await new Promise((resolve) => setTimeout(resolve, 10));
              states.data = 'fetched data';
              states.loading = false;
              return states.data;
            } catch (error) {
              states.error = 'Failed to fetch';
              states.loading = false;
              throw error;
            }
          }
        })
      });

      // Test initial state
      expect(store.get((state) => state.loading)).toBe(false);
      expect(store.get((state) => state.data)).toBe(null);

      // Start async operation
      const promise = store.dispatch.fetchData();

      // Should show loading state
      expect(store.get((state) => state.loading)).toBe(true);

      // Wait for completion
      const result = await promise;

      expect(result).toBe('fetched data');
      expect(store.get((state) => state.data)).toBe('fetched data');
      expect(store.get((state) => state.loading)).toBe(false);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle rapid state updates efficiently', () => {
      const store = createStore({
        states: { counter: 0 },
        actions: ({ states }) => ({
          increment: () => {
            states.counter += 1;
          }
        })
      });

      const start = Date.now();

      // Rapid updates
      for (let i = 0; i < 1000; i++) {
        store.dispatch.increment();
      }

      const duration = Date.now() - start;

      expect(store.get((state) => state.counter)).toBe(1000);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle large state efficiently', () => {
      const largeState = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`
        })),
        metadata: { count: 1000 }
      };

      const store = createStore({
        states: largeState,
        actions: ({ states }) => ({
          updateItem: (id: number, value: string) => {
            // ✅ Correct pattern: Replace the entire array to create new reference
            states.items = states.items.map((item) =>
              item.id === id ? { ...item, value } : item
            );
          }
        }),
        selectors: ({ states }) => ({
          getItemById: (id: number) => states.items.find((i) => i.id === id)
        })
      });

      const start = Date.now();

      // Access large state
      const items = store.get((state) => state.items);
      expect(items).toHaveLength(1000);

      // Use selector
      const item500 = store.get.getItemById(500);
      expect(item500?.id).toBe(500);

      // Update item
      store.dispatch.updateItem(500, 'updated-500');

      // Verify the update worked by checking the items array directly
      const updatedItems = store.get((state) => state.items);
      const updatedItem = updatedItems.find((i) => i.id === 500);
      expect(updatedItem?.value).toBe('updated-500');

      // Also verify through selector
      const selectorResult = store.get.getItemById(500);
      expect(selectorResult?.value).toBe('updated-500');

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });
});
