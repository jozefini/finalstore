# Store Documentation

A lightweight, flexible React state management library with TypeScript support, devtools integration, and advanced features like batching, events, and scoped stores.

## Features

- 🚀 **Lightweight** - Minimal bundle size with maximum functionality
- 🎯 **TypeScript First** - Full type safety with excellent DX
- 🔄 **Reactive** - Automatic re-renders with optimized subscriptions
- 🛠️ **DevTools** - Redux DevTools integration
- 📦 **Batching** - Batch multiple updates for performance
- 🎪 **Events** - Built-in event system for side effects
- 🏗️ **Scoped** - Context-based scoped stores
- 🧠 **Memoized** - Intelligent memoization and caching

## Installation

```bash
npm install @your-org/store
# or
pnpm add @your-org/store
```

## Quick Start

```tsx
import { createStore } from '@your-org/store';

// Define initial state with explicit types
const initialStates = {
  count: 0 as number,
  name: 'Counter' as string
};

// Define types
type States = typeof initialStates;

type Actions = {
  increment: () => void;
  decrement: () => void;
  setName: (name: string) => void;
  reset: () => void;
};

// Define your store with explicit types
const counterStore = createStore<States, Actions>({
  states: initialStates,
  actions: ({ states }) => ({
    increment: () => {
      states.count += 1;
    },
    decrement: () => {
      states.count -= 1;
    },
    setName: (name: string) => {
      states.name = name;
    },
    reset: () => {
      // Safe to use initialStates since store uses deepClone internally
      states.count = initialStates.count;
      states.name = initialStates.name;
    }
  })
});

// Use in React component
function Counter() {
  const count = counterStore.use((state) => state.count);
  const { increment, decrement, reset } = counterStore.dispatch;

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## API Reference

### `createStore(props)`

Creates a new store instance.

#### Parameters

```typescript
interface StoreProps<TState, TActions, TSelectors, TEvents> {
  states: TState;
  actions?: ActionsContext<TState, TActions, TSelectors, TEvents>;
  selectors?: SelectorsContext<TState, TSelectors>;
  config?: {
    name?: string;
    devtools?: boolean;
  };
}
```

#### Returns

```typescript
interface InferStore<TState, TActions, TSelectors, TEvents> {
  dispatch: TActions;
  use: UseFunction & TSelectors;
  get: GetFunction & TSelectors;
  reset: () => void;
  batch: (callback: () => void) => void;
  on: (id: string, eventName: keyof TEvents, callback: Function) => void;
  off: (id: string) => void;
}
```

### Store Methods

#### `store.use(selector?)`

Hook for subscribing to state changes in React components.

```tsx
// Get entire state
const state = store.use();

// Get specific slice
const count = store.use(state => state.count);

// Get multiple values
const { count, name } = store.use(state => ({
  count: state.count,
  name: state.name
}));
```

#### `store.get(selector?)`

Get state synchronously without subscribing.

```tsx
// Get entire state
const state = store.get();

// Get specific slice
const count = store.get((state) => state.count);
```

#### `store.dispatch`

Object containing all your actions.

```tsx
// Call actions
store.dispatch.increment();
store.dispatch.setName('New Name');

// Actions can be async
store.dispatch.fetchData().then((result) => {
  console.log('Data loaded:', result);
});
```

#### `store.reset()`

Reset store to initial state.

```tsx
store.reset();
```

#### `store.batch(callback)`

Batch multiple updates into a single re-render.

```tsx
store.batch(() => {
  store.dispatch.increment();
  store.dispatch.increment();
  store.dispatch.setName('Batched');
});
// Only triggers one re-render
```

#### `store.on(id, eventName, callback)` / `store.off(id)`

Event system for side effects.

```tsx
// Listen to events
store.on('my-listener', 'userLoggedIn', (user) => {
  console.log('User logged in:', user);
});

// Remove listener
store.off('my-listener');
```

## Advanced Usage

### Actions with Complex Logic

```tsx
// Define initial state with explicit types
const initialTodoStates = {
  todos: [] as Todo[],
  filter: 'all' as 'all' | 'active' | 'completed',
  loading: false as boolean
};

type TodoStates = typeof initialTodoStates;

type TodoActions = {
  addTodo: (text: string) => Promise<void>;
  toggleTodo: (id: string) => void;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  reset: () => void;
};

type TodoEvents = {
  todoAdded: Todo;
  error: Error;
};

const todoStore = createStore<TodoStates, TodoActions, {}, TodoEvents>({
  states: initialTodoStates,
  actions: ({ states, trigger }) => ({
    async addTodo(text: string) {
      states.loading = true;

      try {
        const response = await fetch('/api/todos', {
          method: 'POST',
          body: JSON.stringify({ text }),
          headers: { 'Content-Type': 'application/json' }
        });

        const todo = await response.json();
        states.todos.push(todo);

        // Trigger event for side effects
        trigger('todoAdded', todo);
      } catch (error) {
        trigger('error', error as Error);
      } finally {
        states.loading = false;
      }
    },

    toggleTodo(id: string) {
      const todo = states.todos.find((t) => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },

    setFilter(filter: 'all' | 'active' | 'completed') {
      states.filter = filter;
    },

    reset() {
      // Safe to use initialTodoStates since store uses deepClone internally
      states.todos = [...initialTodoStates.todos];
      states.filter = initialTodoStates.filter;
      states.loading = initialTodoStates.loading;
    }
  })
});
```

### Selectors for Computed Values

```tsx
// Define initial state with explicit types
const initialTodoStates = {
  todos: [] as Todo[],
  filter: 'all' as 'all' | 'active' | 'completed'
};

type TodoStates = typeof initialTodoStates;

type TodoSelectors = {
  filteredTodos: () => Todo[];
  todoStats: () => { total: number; active: number; completed: number };
  getTodoById: (id: string) => Todo | undefined;
};

const todoStore = createStore<TodoStates, {}, TodoSelectors>({
  states: initialTodoStates,
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

    todoStats: () => ({
      total: states.todos.length,
      active: states.todos.filter((t) => !t.completed).length,
      completed: states.todos.filter((t) => t.completed).length
    }),

    getTodoById: (id: string) => {
      return states.todos.find((todo) => todo.id === id);
    }
  })
});

// Use selectors
function TodoList() {
  const filteredTodos = todoStore.use.filteredTodos();
  const stats = todoStore.use.todoStats();

  return (
    <div>
      <p>
        Total: {stats.total}, Active: {stats.active}
      </p>
      {filteredTodos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
```

### Events and Side Effects

```tsx
const userStore = createStore({
  states: {
    user: null as User | null,
    notifications: [] as Notification[]
  },
  actions: ({ states, trigger }) => ({
    login: async (credentials: LoginCredentials) => {
      const user = await authenticate(credentials);
      states.user = user;
      trigger('userLoggedIn', user);
    },

    logout: () => {
      states.user = null;
      trigger('userLoggedOut', {});
    }
  })
});

// Set up side effects
userStore.on('analytics', 'userLoggedIn', (user) => {
  analytics.track('User Logged In', { userId: user.id });
});

userStore.on('notifications', 'userLoggedIn', (user) => {
  showWelcomeNotification(user.name);
});
```

### DevTools Integration

```tsx
const store = createStore({
  states: { count: 0 },
  actions: ({ states }) => ({
    increment: () => (states.count += 1)
  }),
  config: {
    name: 'Counter Store',
    devtools: true // Enable Redux DevTools
  }
});
```

## Scoped Stores

For component-scoped state, use `createScopedStore`:

```tsx
import { createScopedStore } from '@your-org/store';

const { Provider, useStore } = createScopedStore({
  states: {
    formData: {
      name: '',
      email: ''
    }
  },
  actions: ({ states }) => ({
    updateField: (field: string, value: string) => {
      states.formData[field] = value;
    },
    reset: () => {
      states.formData = { name: '', email: '' };
    }
  })
});

function FormProvider({ children }) {
  return <Provider>{children}</Provider>;
}

function FormField() {
  const store = useStore();
  const formData = store.use((state) => state.formData);

  return (
    <input
      value={formData.name}
      onChange={(e) => store.dispatch.updateField('name', e.target.value)}
    />
  );
}
```

## Performance Tips

### Optimize Selectors

```tsx
// ✅ Good - specific selector
const count = store.use(state => state.count);

// ❌ Avoid - selecting entire state when you only need count
const state = store.use();
const count = state.count;
```

### Use Batching for Multiple Updates

```tsx
// ✅ Good - batched updates
store.batch(() => {
  store.dispatch.setName('John');
  store.dispatch.setAge(25);
  store.dispatch.setEmail('john@example.com');
});

// ❌ Avoid - separate updates trigger multiple renders
store.dispatch.setName('John');
store.dispatch.setAge(25);
store.dispatch.setEmail('john@example.com');
```

### Memoize Complex Selectors

```tsx
const expensiveSelector = useCallback(
  (state) =>
    state.items.filter(
      (item) => item.category === 'electronics' && item.price > 100
    ),
  []
);

const expensiveItems = store.use(expensiveSelector);
```

## TypeScript Usage

### Why Explicit Types Matter

**It's very important to declare explicit types on `createStore<States, Actions, Selectors>`** for several reasons:

1. **Full Type Safety** - Get complete IntelliSense and error checking
2. **Better Refactoring** - TypeScript can help with safe refactoring
3. **Clear Contracts** - Types serve as documentation for your store's API
4. **Prevent Runtime Errors** - Catch type mismatches at compile time

### Initial State Pattern

**Best practice is to define state as a constant with explicit types:**

```tsx
// ✅ Recommended Pattern
const initialStates = {
  count: 0 as number,
  name: '' as string,
  items: [] as Item[]
};

type States = typeof initialStates;
```

**Why this pattern works:**

- Store uses `deepClone` internally, so it won't reference the original `initialStates`
- You can safely use `initialStates` in reset actions
- Clear type definitions from the start
- Easy to maintain and extend

### Strict Typing

```tsx
interface AppState {
  user: User | null;
  todos: Todo[];
  settings: Settings;
}

interface AppActions {
  setUser: (user: User) => void;
  addTodo: (text: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => void;
}

interface AppSelectors {
  completedTodos: () => Todo[];
  userDisplayName: () => string;
}

interface AppEvents {
  userLoggedIn: User;
  todoCompleted: Todo;
  settingsChanged: Settings;
}

const appStore = createStore<AppState, AppActions, AppSelectors, AppEvents>({
  states: {
    user: null,
    todos: [],
    settings: defaultSettings
  }
  // ... actions, selectors
});
```

### Recommended Type Structure

Always use explicit types for better developer experience and type safety:

```tsx
// Define initial state with explicit types
const initialStates = {
  count: 0 as number,
  name: 'test' as string,
  items: [] as Item[]
};

type States = typeof initialStates;

type Actions = {
  increment: () => void;
  setName: (name: string) => void;
  addItem: (item: Item) => void;
  reset: () => void;
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
    addItem: (item: Item) => {
      states.items.push(item);
    },
    reset: () => {
      // Safe to use initialStates since store uses deepClone internally
      states.count = initialStates.count;
      states.name = initialStates.name;
      states.items = [...initialStates.items];
    }
  })
});
```

## Migration Guide

### From Redux

```tsx
// Redux
const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'SET_NAME':
      return { ...state, name: action.payload };
    default:
      return state;
  }
};

// Our Store - Best Practice
const initialStates = {
  count: 0 as number,
  name: '' as string
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
```

### From Zustand

```tsx
// Zustand
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));

// Our Store - Best Practice
const initialStates = {
  count: 0 as number
};

type States = typeof initialStates;
type Actions = {
  increment: () => void;
};

const store = createStore<States, Actions>({
  states: initialStates,
  actions: ({ states }) => ({
    increment: () => {
      states.count += 1;
    }
  })
});
```

## Best Practices

1. **Always declare explicit types** - Use `createStore<States, Actions, Selectors>()` for full type safety
2. **Define initial state as constant** - Create typed initial state constants for better maintainability
3. **Use initial state in reset actions** - Safe to reference since store uses `deepClone` internally
4. **Keep stores focused** - Don't create one giant store for everything
5. **Use selectors** - Extract computed values into selectors
6. **Batch updates** - Use batching for multiple synchronous updates
7. **Handle async properly** - Use async actions for API calls
8. **Use events for side effects** - Keep actions pure, use events for analytics, notifications, etc.
9. **Enable devtools** - Great for debugging in development
10. **Test your stores** - Stores are easy to test since they're just functions

## Examples

Check out more examples in the `/examples` directory:

- [Counter Example](./examples/counter)
- [Todo App](./examples/todo-app)
- [Shopping Cart](./examples/shopping-cart)
- [User Authentication](./examples/auth)
- [Form Management](./examples/forms)

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE.md](./LICENSE.md) for details.
