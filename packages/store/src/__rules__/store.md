# Store Documentation

React state management with direct mutations, TypeScript-first design, and zero boilerplate.

## Core Pattern

Always use explicit types. Define initial state as typed constants.

```tsx
// ✅ Required Pattern
const initialStates = {
  count: 0 as number,
  name: '' as string,
  items: [] as Item[]
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

## States

State is the single source of truth. Always define with explicit types.

```tsx
// ✅ Correct - explicit types
const initialStates = {
  user: null as User | null,
  loading: false as boolean,
  items: [] as Item[]
};

// ❌ Avoid - inferred types
const initialStates = {
  user: null,  // TypeScript can't infer User type
  loading: false,
  items: []
};
```

**Rules:**

- Use `as Type` for explicit typing
- Store uses `deepClone` internally - safe to reference `initialStates` in actions
- Primitive values, objects, arrays, Maps, Sets all supported

## Actions

Direct state mutations. Support sync and async operations.

```tsx
type Actions = {
  // Sync action
  increment: () => void;

  // Async action
  fetchUser: (id: string) => Promise<User>;

  // Action with parameters
  updateItem: (id: string, data: Partial<Item>) => void;
};

const store = createStore<States, Actions>({
  states: initialStates,
  actions: ({ states, notify, trigger }) => ({
    increment: () => {
      states.count += 1;
    },

    async fetchUser(id: string) {
      states.loading = true;
      notify(); // Immediate UI update for loading state

      states.user = await getUserById(id);
      states.loading = false;

      return states.user;
    },

    updateItem: (id: string, data: Partial<Item>) => {
      const item = states.items.find((i) => i.id === id);
      if (item) Object.assign(item, data);
    }
  })
});
```

**Rules:**

- Mutate `states` directly - no returns needed
- Async actions return promises
- Call `notify()` for immediate UI updates in async actions
- Use `trigger()` for events
- Actions auto-notify subscribers when complete

## Selectors

Computed values with automatic memoization.

```tsx
type Selectors = {
  completedTodos: () => Todo[];
  getTodoById: (id: string) => Todo | undefined;
  stats: () => { total: number; completed: number };
};

const store = createStore<States, {}, Selectors>({
  states: initialStates,
  selectors: ({ states }) => ({
    completedTodos: () => states.todos.filter((t) => t.completed),

    getTodoById: (id: string) => states.todos.find((t) => t.id === id),

    stats: () => ({
      total: states.todos.length,
      completed: states.todos.filter((t) => t.completed).length
    })
  })
});
```

**Usage:**

```tsx
// In components
const completed = store.use.completedTodos();
const todo = store.use.getTodoById('123');

// Non-reactive access
const stats = store.get.stats();
```

## Events

Side effects and pub/sub system.

```tsx
type Events = {
  userLoggedIn: User;
  error: Error;
  dataChanged: { type: string; data: any };
};

const store = createStore<States, Actions, {}, Events>({
  states: initialStates,
  actions: ({ states, trigger }) => ({
    login: async (credentials) => {
      const user = await authenticate(credentials);
      states.user = user;
      trigger('userLoggedIn', user);
    }
  })
});

// Listen to events
const userLoginListener = store.on('userLoggedIn', (user) => {
  track('User Login', { userId: user.id });
});

// Remove listener
userLoginListener.off();
```

## Reactive Access - `use()`

Subscribe to state changes in React components.

```tsx
function Component() {
  // Get entire state
  const state = store.use();

  // Get specific value
  const count = store.use(state => state.count);

  // Get multiple values
  const { count, name } = store.use(state => ({
    count: state.count,
    name: state.name
  }));

  // Use selectors
  const completed = store.use.completedTodos();
}
```

**Rules:**

- Only use in React components
- Automatically subscribes and unsubscribes
- Triggers re-renders when selected state changes
- Selectors are memoized automatically

## Non-Reactive Access - `get()`

Get current state without subscribing.

```tsx
// Get entire state
const state = store.get();

// Get specific value
const count = store.get((state) => state.count);

// Use selectors
const stats = store.get.stats();

// In event handlers, utils, etc.
button.onclick = () => {
  const currentCount = store.get((state) => state.count);
  console.log(currentCount);
};
```

## Dispatching Actions

Call actions through the dispatch object.

```tsx
// Sync actions
store.dispatch.increment();
store.dispatch.setName('John');

// Async actions
const user = await store.dispatch.fetchUser('123');

// In components
function Counter() {
  const count = store.use((state) => state.count);
  const { increment, decrement } = store.dispatch;

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

## Batching

Group multiple updates into single re-render.

```tsx
// Multiple updates = multiple re-renders
store.dispatch.increment();
store.dispatch.setName('John');
store.dispatch.addItem(item);

// Batched = single re-render
store.batch(() => {
  store.dispatch.increment();
  store.dispatch.setName('John');
  store.dispatch.addItem(item);
});
```

**Rules:**

- Use for multiple synchronous updates
- Async actions in batch still trigger individual notifications
- DevTools shows batched actions as group

## Reset

Restore to initial state.

```tsx
// Reset entire store
store.reset();

// Custom reset in actions
actions: ({ states }) => ({
  resetForm: () => {
    // Safe to use initialStates - store uses deepClone
    states.formData = initialStates.formData;
    states.errors = initialStates.errors;
  }
});
```

## DevTools Integration

Redux DevTools support for debugging.

```tsx
const store = createStore({
  states: initialStates,
  actions: actions,
  config: {
    name: 'My Store',
    devtools: true // Enable in development
  }
});
```

**Features:**

- Time travel debugging
- Action replay
- State inspection
- Jump to action/state

## Scoped Stores

Context-based stores for component scope.

```tsx
const { Provider, useStore } = createScopedStore({
  states: { formData: { name: '', email: '' } },
  actions: ({ states }) => ({
    updateField: (field: string, value: string) => {
      states.formData[field] = value;
    }
  })
});

function App() {
  return (
    <Provider>
      <Form />
    </Provider>
  );
}

function Form() {
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

## TypeScript Patterns

### Explicit Type Declaration

**Always declare types explicitly:**

```tsx
// ✅ Required
const store = createStore<States, Actions, Selectors, Events>({
  // implementation
});

// ❌ Don't rely on inference
const store = createStore({
  // TypeScript can't infer complex types
});
```

### Initial State Pattern

```tsx
// ✅ Best practice
const initialStates = {
  count: 0 as number,
  user: null as User | null,
  items: [] as Item[]
};

type States = typeof initialStates;

// ✅ Alternative
interface States {
  count: number;
  user: User | null;
  items: Item[];
}

const initialStates: States = {
  count: 0,
  user: null,
  items: []
};
```

### Action Types

```tsx
type Actions = {
  syncAction: () => void;
  asyncAction: (param: string) => Promise<Result>;
  voidAction: (data: Data) => void;
};
```

### Selector Types

```tsx
type Selectors = {
  computed: () => ComputedValue;
  filtered: (criteria: FilterCriteria) => Item[];
  single: (id: string) => Item | undefined;
};
```

## Performance Rules

### Selector Optimization

```tsx
// ✅ Specific selectors
const count = store.use(state => state.count);

// ❌ Over-selecting
const state = store.use();
const count = state.count; // Triggers on any state change
```

### Batching Guidelines

```tsx
// ✅ Batch synchronous updates
store.batch(() => {
  store.dispatch.updateA();
  store.dispatch.updateB();
  store.dispatch.updateC();
});

// ✅ Don't batch async actions - they handle their own updates
await store.dispatch.fetchData();
await store.dispatch.processData();
```

### Memoization

Selectors are automatically memoized. Complex selectors benefit from React.useMemo:

```tsx
const expensiveSelector = useMemo(
  () => (state: State) => expensiveComputation(state.data),
  []
);

const result = store.use(expensiveSelector);
```

## Common Patterns

### Loading States

```tsx
const initialStates = {
  data: null as Data | null,
  loading: false as boolean,
  error: null as Error | null
};

const actions = ({ states, notify }) => ({
  async fetchData() {
    states.loading = true;
    states.error = null;
    notify(); // Show loading immediately

    try {
      states.data = await api.getData();
    } catch (error) {
      states.error = error as Error;
    } finally {
      states.loading = false;
    }
  }
});
```

### Form Management

```tsx
const initialStates = {
  values: {} as Record<string, any>,
  errors: {} as Record<string, string>,
  touched: {} as Record<string, boolean>
};

const actions = ({ states }) => ({
  setValue: (field: string, value: any) => {
    states.values[field] = value;
    states.touched[field] = true;
    delete states.errors[field];
  },

  setError: (field: string, error: string) => {
    states.errors[field] = error;
  }
});
```

### List Management

```tsx
const actions = ({ states }) => ({
  addItem: (item: Item) => {
    states.items.push(item);
  },

  updateItem: (id: string, updates: Partial<Item>) => {
    const item = states.items.find((i) => i.id === id);
    if (item) Object.assign(item, updates);
  },

  removeItem: (id: string) => {
    states.items = states.items.filter((i) => i.id !== id);
  }
});
```

## Migration Patterns

### From Redux

```tsx
// Redux reducer
const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
  }
};

// Store equivalent
const actions = ({ states }) => ({
  increment: () => {
    states.count += 1;
  }
});
```

### From Zustand

```tsx
// Zustand
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));

// Store equivalent
const store = createStore<States, Actions>({
  states: { count: 0 as number },
  actions: ({ states }) => ({
    increment: () => {
      states.count += 1;
    }
  })
});
```

## Error Handling

### Action Error Handling

```tsx
const actions = ({ states, trigger }) => ({
  async fetchData() {
    try {
      states.data = await api.getData();
    } catch (error) {
      states.error = error as Error;
      trigger('error', error as Error);
      throw error; // Re-throw for component handling
    }
  }
});

// In component
const handleFetch = async () => {
  try {
    await store.dispatch.fetchData();
  } catch (error) {
    // Handle UI-specific error response
  }
};
```

### Global Error Events

```tsx
// Listen to all errors
const errorListener = store.on('error', (error) => {
  console.error('Store error:', error);
  // Send to error reporting service
});

// Cleanup when no longer needed
errorListener.off();
```

## Design Limitations

### Deep Mutation Detection

The store is **designed for immutable patterns** and has a known limitation with deep mutations:

```tsx
// ❌ Won't trigger updates - deep mutations not detected
actions: ({ states }) => ({
  updateUserTheme: (userId, theme) => {
    const user = states.users.find((u) => u.id === userId);
    user.profile.settings.theme = theme; // Deep mutation - not detected
  }
});

// ✅ Correct pattern - creates new references
actions: ({ states }) => ({
  updateUserTheme: (userId, theme) => {
    states.users = states.users.map((user) =>
      user.id === userId
        ? {
            ...user,
            profile: {
              ...user.profile,
              settings: { ...user.profile.settings, theme }
            }
          }
        : user
    );
  }
});
```

**Why this limitation exists:**

- **Performance** - Deep mutation detection would require complex proxy systems
- **Compatibility** - Would break Maps, Sets, Dates, and other objects
- **Simplicity** - Immutable patterns are more predictable and debuggable

**Workarounds:**

1. **Use immutable patterns** (recommended)
2. **Call `notify()` manually** after deep mutations
3. **Clone and reassign** the top-level property

## Best Practices

1. **Always use explicit types** - `createStore<States, Actions, Selectors, Events>()`
2. **Define initial state with types** - `count: 0 as number`
3. **Use immutable patterns** - Replace objects/arrays instead of mutating
4. **Use initial state in reset** - Safe due to `deepClone`
5. **Batch multiple updates** - Single re-render
6. **Use selectors for computed values** - Automatic memoization
7. **Handle async with notify()** - Immediate loading states
8. **Use events for side effects** - Keep actions pure
9. **Enable devtools in development**
10. **Optimize selectors** - Select only what you need
11. **Test stores easily** - Just functions and objects
