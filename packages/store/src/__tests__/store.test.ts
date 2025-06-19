import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStore, deepClone, isDeepEqual } from '../store';

// Mock DevTools
const mockDevTools = {
  connect: vi.fn().mockReturnThis(),
  init: vi.fn(),
  subscribe: vi.fn(),
  send: vi.fn()
};

// Mock Redux DevTools Extension
Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION__', {
  value: mockDevTools,
  writable: true
});

describe('Store Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear any unhandled promise rejections
    vi.clearAllTimers();
  });

  describe('Store Creation and Initial State', () => {
    it('should create a store with initial state', () => {
      const initialStates = {
        count: 0,
        name: 'test'
      };

      type States = typeof initialStates;
      type Actions = {
        increment: () => void;
        setName: (name: string) => void;
      };

      const store = createStore<States, Actions>({
        states: initialStates,
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          },
          setName: (name: string) => {
            states.name = name;
          }
        })
      });

      expect(store.get()).toEqual({ count: 0, name: 'test' });
      expect(store.get((s) => s.count)).toBe(0);
      expect(store.get((s) => s.name)).toBe('test');
    });

    it('should handle empty actions and selectors', () => {
      const store = createStore({
        states: { value: 42 }
      });

      expect(store.get()).toEqual({ value: 42 });
      expect(store.dispatch).toEqual({});
    });
  });

  describe('Actions and State Updates', () => {
    it('should execute sync actions and update state', () => {
      const initialStates = {
        count: 0,
        items: [] as string[]
      };

      type States = typeof initialStates;
      type Actions = {
        increment: () => void;
        addItem: (item: string) => void;
        reset: () => void;
      };

      const store = createStore<States, Actions>({
        states: initialStates,
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          },
          addItem: (item: string) => {
            states.items.push(item);
          },
          reset: () => {
            states.count = 0;
            states.items = [];
          }
        })
      });

      // Test increment
      store.dispatch.increment();
      expect(store.get((s) => s.count)).toBe(1);

      // Test adding item
      store.dispatch.addItem('first');
      expect(store.get((s) => s.items)).toEqual(['first']);

      // Test reset
      store.dispatch.reset();
      expect(store.get()).toEqual({ count: 0, items: [] });
    });

    it('should handle async actions', async () => {
      const initialStates = {
        data: null as string | null,
        loading: false,
        error: null as string | null
      };

      type States = typeof initialStates;
      type Actions = {
        fetchData: () => Promise<string>;
        setError: (error: string) => void;
      };

      const store = createStore<States, Actions>({
        states: initialStates,
        actions: ({ states }) => ({
          async fetchData() {
            states.loading = true;
            states.error = null;

            try {
              // Simulate API call
              await new Promise((resolve) => setTimeout(resolve, 10));
              const data = 'fetched data';
              states.data = data;
              states.loading = false;
              return data;
            } catch (error) {
              states.error = 'Failed to fetch';
              states.loading = false;
              throw error;
            }
          },
          setError: (error: string) => {
            states.error = error;
          }
        })
      });

      // Test async action
      const promise = store.dispatch.fetchData();
      expect(store.get((s) => s.loading)).toBe(true);

      const result = await promise;
      expect(result).toBe('fetched data');
      expect(store.get((s) => s.data)).toBe('fetched data');
      expect(store.get((s) => s.loading)).toBe(false);
      expect(store.get((s) => s.error)).toBe(null);
    });
  });

  describe('Selectors', () => {
    it('should create and use custom selectors', () => {
      const initialStates = {
        todos: [
          { id: 1, text: 'Task 1', completed: false },
          { id: 2, text: 'Task 2', completed: true }
        ] as { id: number; text: string; completed: boolean }[]
      };

      type States = typeof initialStates;
      type Selectors = {
        completedTodos: () => States['todos'];
        todoCount: () => number;
        getTodoById: (id: number) => States['todos'][0] | undefined;
      };

      const store = createStore<States, Record<string, never>, Selectors>({
        states: initialStates,
        selectors: ({ states }) => ({
          completedTodos: () => {
            return states.todos.filter((todo) => todo.completed);
          },
          todoCount: () => {
            return states.todos.length;
          },
          getTodoById: (id: number) => {
            return states.todos.find((todo) => todo.id === id);
          }
        })
      });

      // Test selectors with get
      expect(store.get.completedTodos()).toHaveLength(1);
      expect(store.get.completedTodos()[0].text).toBe('Task 2');
      expect(store.get.todoCount()).toBe(2);
      expect(store.get.getTodoById(1)?.text).toBe('Task 1');
      expect(store.get.getTodoById(999)).toBeUndefined();
    });
  });

  describe('Event System', () => {
    it('should trigger and listen to events', () => {
      const eventSpy = vi.fn();
      const anotherEventSpy = vi.fn();

      const initialStates = { count: 0 };
      type States = typeof initialStates;
      type Actions = {
        increment: () => void;
      };
      type Events = {
        countChanged: { count: number };
        reset: undefined;
      };

      const store = createStore<States, Actions, Record<string, never>, Events>(
        {
          states: initialStates,
          actions: ({ states, trigger }) => ({
            increment: () => {
              states.count += 1;
              trigger('countChanged', { count: states.count });
            }
          })
        }
      );

      // Setup event listeners
      store.on('listener1', 'countChanged', eventSpy);
      store.on('listener2', 'countChanged', anotherEventSpy);

      // Trigger event through action
      store.dispatch.increment();

      expect(eventSpy).toHaveBeenCalledWith({ count: 1 });
      expect(anotherEventSpy).toHaveBeenCalledWith({ count: 1 });

      // Remove one listener
      store.off('listener1');

      store.dispatch.increment();

      expect(eventSpy).toHaveBeenCalledTimes(1); // Should not be called again
      expect(anotherEventSpy).toHaveBeenCalledTimes(2); // Should be called again
    });
  });

  describe('Batching', () => {
    it('should batch multiple updates', () => {
      const initialStates = {
        count: 0,
        name: 'initial'
      };

      type States = typeof initialStates;
      type Actions = {
        increment: () => void;
        setName: (name: string) => void;
        batchedUpdate: () => void;
      };

      const store = createStore<States, Actions>({
        states: initialStates,
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          },
          setName: (name: string) => {
            states.name = name;
          },
          batchedUpdate: () => {
            // Multiple updates in single action
            states.count += 5;
            states.name = 'batched';
          }
        })
      });

      // Test explicit batching
      store.batch(() => {
        store.dispatch.increment();
        store.dispatch.increment();
        store.dispatch.setName('batch test');
      });

      expect(store.get()).toEqual({
        count: 2,
        name: 'batch test'
      });

      // Test implicit batching in single action
      store.dispatch.batchedUpdate();
      expect(store.get()).toEqual({
        count: 7,
        name: 'batched'
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset store to initial state', () => {
      const initialStates = {
        count: 0,
        items: [] as string[]
      };

      type States = typeof initialStates;
      type Actions = {
        increment: () => void;
        addItem: (item: string) => void;
      };

      const store = createStore<States, Actions>({
        states: initialStates,
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          },
          addItem: (item: string) => {
            states.items.push(item);
          }
        })
      });

      // Make changes
      store.dispatch.increment();
      store.dispatch.addItem('test');

      expect(store.get()).toEqual({
        count: 1,
        items: ['test']
      });

      // Reset
      store.reset();

      expect(store.get()).toEqual({
        count: 0,
        items: []
      });
    });

    it('should clear events on reset', () => {
      const eventSpy = vi.fn();

      const store = createStore<
        { count: number },
        { increment: () => void },
        Record<string, never>,
        { test: undefined }
      >({
        states: { count: 0 },
        actions: ({ states, trigger }) => ({
          increment: () => {
            states.count += 1;
            trigger('test', undefined);
          }
        })
      });

      store.on('test-listener', 'test', eventSpy);
      store.dispatch.increment();
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // Reset should clear events
      store.reset();
      store.dispatch.increment();
      expect(eventSpy).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('DevTools Integration', () => {
    it('should integrate with Redux DevTools when enabled', () => {
      const store = createStore({
        states: { count: 0 },
        actions: ({ states }) => ({
          increment: () => {
            states.count += 1;
          }
        }),
        config: {
          name: 'Test Store',
          devtools: true
        }
      });

      expect(mockDevTools.connect).toHaveBeenCalledWith({
        name: 'Test Store',
        trace: true,
        traceLimit: 25,
        features: {
          jump: true,
          skip: true,
          reorder: true,
          dispatch: true,
          persist: true
        },
        instanceId: 'Test Store'
      });

      expect(mockDevTools.init).toHaveBeenCalledWith({ count: 0 });

      // Test that actions are sent to devtools
      store.dispatch.increment();
      expect(mockDevTools.send).toHaveBeenCalledWith(
        { type: 'increment', payload: undefined },
        { count: 1 }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle action errors gracefully', () => {
      const store = createStore({
        states: { error: null as string | null },
        actions: ({ states }) => ({
          throwError: () => {
            throw new Error('Test error');
          },
          catchError: (error: string) => {
            states.error = error;
          }
        })
      });

      // Test sync error
      expect(() => store.dispatch.throwError()).toThrow('Test error');

      // State should remain consistent
      expect(store.get((s) => s.error)).toBe(null);

      // Test error handling
      store.dispatch.catchError('handled error');
      expect(store.get((s) => s.error)).toBe('handled error');
    });
  });
});

describe('Utility Functions', () => {
  describe('deepClone', () => {
    it('should deeply clone objects', () => {
      const original = {
        a: 1,
        b: {
          c: 2,
          d: [3, 4, { e: 5 }]
        },
        f: new Date('2023-01-01'),
        g: new Map([['key', 'value']]),
        h: new Set([1, 2, 3])
      };

      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);
      expect(cloned.f).not.toBe(original.f);
      expect(cloned.g).not.toBe(original.g);
      expect(cloned.h).not.toBe(original.h);
    });

    it('should handle primitive values', () => {
      expect(deepClone(1)).toBe(1);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
    });
  });

  describe('isDeepEqual', () => {
    it('should compare objects deeply', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      const obj3 = { a: 1, b: { c: 3 } };

      expect(isDeepEqual(obj1, obj2)).toBe(true);
      expect(isDeepEqual(obj1, obj3)).toBe(false);
    });

    it('should handle arrays', () => {
      expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(isDeepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    });

    it('should handle primitive values', () => {
      expect(isDeepEqual(1, 1)).toBe(true);
      expect(isDeepEqual('a', 'a')).toBe(true);
      expect(isDeepEqual(true, true)).toBe(true);
      expect(isDeepEqual(null, null)).toBe(true);
      expect(isDeepEqual(undefined, undefined)).toBe(true);
      expect(isDeepEqual(1, 2)).toBe(false);
    });
  });
});

describe('Complex Scenarios', () => {
  it('should handle a complex real-world scenario', async () => {
    // Create a fresh store for this test to avoid pollution
    const todoAddedSpy = vi.fn();
    const statsUpdatedSpy = vi.fn();

    // Simulate a todo app with async operations
    const initialStates = {
      todos: [] as {
        id: number;
        text: string;
        completed: boolean;
        createdAt: Date;
      }[],
      loading: false,
      filter: 'all' as 'all' | 'active' | 'completed',
      stats: {
        total: 0,
        completed: 0,
        active: 0
      }
    };

    type States = typeof initialStates;
    type Actions = {
      addTodo: (text: string) => Promise<void>;
      toggleTodo: (id: number) => void;
      setFilter: (filter: States['filter']) => void;
      updateStats: () => void;
      fetchTodos: () => Promise<void>;
    };
    type Selectors = {
      filteredTodos: () => States['todos'];
      todoStats: () => States['stats'];
    };
    type Events = {
      todoAdded: States['todos'][0];
      statsUpdated: States['stats'];
    };

    const store = createStore<States, Actions, Selectors, Events>({
      states: initialStates,
      actions: ({ states, trigger }) => ({
        async addTodo(text: string) {
          states.loading = true;

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 10));

          const newTodo = {
            id: Date.now(),
            text,
            completed: false,
            createdAt: new Date()
          };

          states.todos.push(newTodo);
          states.loading = false;

          trigger('todoAdded', newTodo);
        },

        toggleTodo(id: number) {
          const todo = states.todos.find((t) => t.id === id);
          if (todo) {
            todo.completed = !todo.completed;
          }
        },

        setFilter(filter: States['filter']) {
          states.filter = filter;
        },

        updateStats() {
          const total = states.todos.length;
          const completed = states.todos.filter((t) => t.completed).length;
          const active = total - completed;

          states.stats = { total, completed, active };
          trigger('statsUpdated', states.stats);
        },

        async fetchTodos() {
          states.loading = true;

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Replace todos instead of adding to existing ones
          states.todos = [
            {
              id: 1,
              text: 'Learn React',
              completed: true,
              createdAt: new Date()
            },
            {
              id: 2,
              text: 'Build app',
              completed: false,
              createdAt: new Date()
            }
          ];

          states.loading = false;
        }
      }),

      selectors: ({ states }) => ({
        filteredTodos: () => {
          switch (states.filter) {
            case 'active':
              return states.todos.filter((todo) => !todo.completed);
            case 'completed':
              return states.todos.filter((todo) => todo.completed);
            default:
              return states.todos;
          }
        },

        todoStats: () => {
          const total = states.todos.length;
          const completed = states.todos.filter((t) => t.completed).length;
          const active = total - completed;
          return { total, completed, active };
        }
      })
    });

    // Test event system
    store.on('todo-listener', 'todoAdded', todoAddedSpy);
    store.on('stats-listener', 'statsUpdated', statsUpdatedSpy);

    // Test async operations - should start with empty todos
    expect(store.get((s) => s.todos)).toHaveLength(0);

    await store.dispatch.addTodo('Test todo');
    expect(store.get((s) => s.todos)).toHaveLength(1);
    expect(todoAddedSpy).toHaveBeenCalledTimes(1);

    // Test selectors
    expect(store.get.filteredTodos()).toHaveLength(1);
    expect(store.get.todoStats()).toEqual({
      total: 1,
      completed: 0,
      active: 1
    });

    // Test state updates
    const todoId = store.get((s) => s.todos[0].id);
    store.dispatch.toggleTodo(todoId);
    expect(store.get((s) => s.todos[0].completed)).toBe(true);

    // Test filter
    store.dispatch.setFilter('completed');
    expect(store.get.filteredTodos()).toHaveLength(1);

    store.dispatch.setFilter('active');
    expect(store.get.filteredTodos()).toHaveLength(0);

    // Test fetchTodos (replaces existing todos)
    await store.dispatch.fetchTodos();
    expect(store.get((s) => s.todos)).toHaveLength(2);

    // Test batched operations with the fetched todos
    store.batch(() => {
      store.dispatch.setFilter('all');
      store.dispatch.updateStats();
    });

    expect(store.get((s) => s.filter)).toBe('all');
    expect(statsUpdatedSpy).toHaveBeenCalledWith({
      total: 2,
      completed: 1,
      active: 1
    });
  });
});
