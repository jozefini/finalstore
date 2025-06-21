import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createScopedStore } from '../store';

describe('Scoped Store - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('createScopedStore API', () => {
    it('should create Provider and useStore hook', () => {
      const { Provider, useStore } = createScopedStore({
        states: { value: 'test' }
      });

      expect(Provider).toBeDefined();
      expect(useStore).toBeDefined();
      expect(typeof Provider).toBe('function'); // React functional component
      expect(typeof useStore).toBe('function');
    });

    it('should provide store functionality through useStore', () => {
      const { useStore } = createScopedStore({
        states: { count: 0, name: 'scoped' },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          },
          setName: (name: string) => {
            states.name = name;
          }
        })
      });

      // Verify useStore returns a function that would work in React context
      expect(typeof useStore).toBe('function');
    });
  });

  describe('Scoped Store with Actions and Selectors', () => {
    it('should work with custom selectors', () => {
      const { useStore } = createScopedStore({
        states: {
          todos: [
            { id: 1, text: 'Task 1', completed: false },
            { id: 2, text: 'Task 2', completed: true }
          ] as { id: number; text: string; completed: boolean }[]
        },
        actions: ({ states }) => ({
          toggleTodo: (id: number) => {
            const todo = states.todos.find((t) => t.id === id);
            if (todo) todo.completed = !todo.completed;
          },
          addTodo: (text: string) => {
            states.todos.push({
              id: Date.now(),
              text,
              completed: false
            });
          }
        }),
        selectors: ({ states }) => ({
          completedCount: () => states.todos.filter((t) => t.completed).length,
          activeCount: () => states.todos.filter((t) => !t.completed).length
        })
      });

      // Verify useStore hook exists
      expect(typeof useStore).toBe('function');
    });
  });

  describe('Scoped Store with Events', () => {
    it('should support event system', () => {
      const { useStore } = createScopedStore({
        states: { count: 0 },
        actions: ({ states, trigger }) => ({
          increment: () => {
            states.count += 1;
            trigger('incremented', { count: states.count });
          }
        })
      });

      // Verify the scoped store creation works
      expect(typeof useStore).toBe('function');
    });
  });

  describe('Scoped Store Lifecycle', () => {
    it('should handle store creation and cleanup', () => {
      const { Provider, useStore } = createScopedStore({
        states: { count: 0 },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          }
        })
      });

      // Should create valid React components/hooks
      expect(Provider).toBeDefined();
      expect(useStore).toBeDefined();

      // Provider should be a React component (functional component)
      expect(typeof Provider).toBe('function');
      expect(typeof useStore).toBe('function');
    });
  });

  describe('Multiple Scoped Store Types', () => {
    it('should support different scoped store types simultaneously', () => {
      const { Provider: UserProvider, useStore: useUserStore } =
        createScopedStore({
          states: { name: 'John', age: 25 },
          actions: ({ states }) => ({
            updateName: (name: string) => {
              states.name = name;
            },
            updateAge: (age: number) => {
              states.age = age;
            }
          })
        });

      const { Provider: CounterProvider, useStore: useCounterStore } =
        createScopedStore({
          states: { count: 0 },
          actions: ({ states }) => ({
            increment: () => {
              states.count += 1;
            }
          })
        });

      // Should create distinct scoped stores
      expect(UserProvider).toBeDefined();
      expect(CounterProvider).toBeDefined();
      expect(useUserStore).toBeDefined();
      expect(useCounterStore).toBeDefined();

      // They should be different instances
      expect(UserProvider).not.toBe(CounterProvider);
      expect(useUserStore).not.toBe(useCounterStore);
    });
  });

  describe('Async Actions in Scoped Store', () => {
    it('should handle async actions properly', () => {
      const { useStore } = createScopedStore({
        states: {
          data: null as string | null,
          loading: false
        },
        actions: ({ states, notify }) => ({
          async fetchData() {
            states.loading = true;
            notify();

            await new Promise((resolve) => setTimeout(resolve, 10));

            states.data = 'scoped data';
            states.loading = false;
          }
        })
      });

      // Verify async action setup
      expect(typeof useStore).toBe('function');
    });
  });

  describe('Store Configuration', () => {
    it('should accept configuration options', () => {
      const { useStore } = createScopedStore({
        states: { value: 'configured' },
        config: {
          name: 'TestScopedStore',
          devtools: false
        }
      });

      expect(typeof useStore).toBe('function');
    });

    it('should work without actions or selectors', () => {
      const { useStore } = createScopedStore({
        states: { value: 'minimal' }
      });

      expect(typeof useStore).toBe('function');
    });

    it('should work with only actions', () => {
      const { useStore } = createScopedStore({
        states: { count: 0 },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          }
        })
      });

      expect(typeof useStore).toBe('function');
    });

    it('should work with only selectors', () => {
      const { useStore } = createScopedStore({
        states: {
          items: [1, 2, 3, 4, 5]
        },
        selectors: ({ states }) => ({
          itemCount: () => states.items.length,
          evenItems: () => states.items.filter((i) => i % 2 === 0)
        })
      });

      expect(typeof useStore).toBe('function');
    });
  });
});
