# FinalStore

Intuitive state management for React applications with first-class TypeScript support. It offers both global stores and collection management with minimal boilerplate.

## Quick Example

### Store Example

```tsx
import { createStore } from 'finalstore';

const settings = createStore({
  states: {
    theme: 'light',
    notifications: true
  },
  actions: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    }
  },
  selectors: {
    isDarkMode: (state) => state.theme === 'dark'
  }
});

function App() {
  const theme = settings.use((s) => s.theme);

  return (
    <div data-theme={theme}>
      <button onClick={() => settings.dispatch.toggleTheme()}>
        Toggle Theme
      </button>
    </div>
  );
}
```

### Collection Example

```tsx
import { createCollection } from 'finalstore';

const todos = createCollection({
  states: {
    text: '',
    completed: false
  },
  actions: {
    toggle: (state) => {
      state.completed = !state.completed;
    }
  },
  selectors: {
    isCompleted: (state) => state.completed
  }
});

function TodoList() {
  const todoIds = todos.useKeys();

  return (
    <ul>
      {todoIds.map((id) => (
        <TodoItem key={id} id={id} />
      ))}
    </ul>
  );
}

function TodoItem({ id }: { id: string }) {
  const todo = todos.use(id);

  if (!todo) return null;

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => todos.key(id).dispatch.toggle()}
      />
      <span>{todo.text}</span>
    </li>
  );
}
```

## Features

- **Type Safety**: Full TypeScript support with type inference for states and actions
- **Collection Management**: Efficient handling of dynamic collections with individual item subscriptions
- **Zero Config**: No providers needed for global stores, just create and use
- **DevTools Integration**: Built-in Redux DevTools support for debugging

## Core Concepts

- **States**: Global state management for app-wide data
- **Collections**: Map-based state management for dynamic data sets
- **Scoped State**: Component-level state isolation
- **Type Safety**: First-class TypeScript support

## Why FinalStore?

- 🎯 **Simple API**: Intuitive methods that feel natural in React
- 🔒 **Type Safe**: Built with TypeScript for robust development
- 🎮 **DevTools**: Built-in Redux DevTools support
- 🔄 **Reactive**: Automatic updates with granular subscriptions
- 🎨 **Flexible**: Global, collection, and scoped state patterns
- 🚀 **Performant**: Optimized renders with deep equality checks
