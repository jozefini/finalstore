#### Installation

```bash
# npm
npm i finalstore

# pnpm
pnpm add finalstore

# yarn
yarn add finalstore

# bun
bun add finalstore
```

Intuitive state management for React applications with first-class TypeScript support. It offers both global stores and collection management with minimal boilerplate.

#### Setup

```tsx
import { createStore } from 'finalstore';

type StoreStates = {
  theme: 'light' | 'dark';
  sidebar: {
    isOpen: boolean;
    width: number;
  };
  notifications: {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error';
  }[];
  settings: {
    fontSize: number;
    language: string;
    autoSave: boolean;
  };
};

const store = createStore({
  states: {
    theme: 'light',
    sidebar: {
      isOpen: true,
      width: 240
    },
    notifications: [],
    settings: {
      fontSize: 14,
      language: 'en',
      autoSave: true
    }
  } as StoreStates,
  actions: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      return state.theme;
    },
    setSidebarWidth: (state, width: number) => {
      state.sidebar.width = Math.max(180, Math.min(width, 400));
    },
    fetchNotifications: async (state) => {
      const response = await fetch('https://example.com/notifications');
      const notifications = await response.json();
      state.notifications = notifications;
      return notifications;
    },
    addNotification: (
      state,
      notification: Omit<StoreStates['notifications'][0], 'id'>
    ) => {
      state.notifications.push({
        ...notification,
        id: crypto.randomUUID()
      });
    },
    removeNotification: (state, id: string) => {
      state.notifications = state.notifications.filter((n) => n.id !== id);
    },
    updateSettings: (state, settings: Partial<StoreStates['settings']>) => {
      state.settings = { ...state.settings, ...settings };
    }
  },
  selectors: {
    isDarkMode: (state) => state.theme === 'dark',
    notificationCount: (state) => state.notifications.length,
    hasNotificationType: (
      state,
      type: StoreStates['notifications'][0]['type']
    ) => state.notifications.some((n) => n.type === type),
    errorNotifications: (state) =>
      state.notifications.filter((n) => n.type === 'error')
  },
  config: {
    name: 'SiteStore',
    devtools: true
  }
});
```

#### Get method `non-reactive`

```tsx
// Without selector (entire states)
const states = store.get();

// With selector (specific state)
const theme = store.get((states) => states.theme);
const [theme] = store.get((states) => [states.theme]);
const { theme } = store.get((states) => ({ theme: states.theme }));

// With predefined selector
const isDarkMode = store.getSelector.isDarkMode();
const hasErrorNotification = store.getSelector.hasNotificationType('error');
```

#### Use method `reactive`

```tsx
function Component() {
  // Without selector (entire states)
  const states = store.use();

  // With selector (specific state)
  const theme = store.use((states) => states.theme);
  const [theme] = store.use((states) => [states.theme]);
  const { theme } = store.use((states) => ({ theme: states.theme }));

  // With predefined selector
  const isDarkMode = store.useSelector.isDarkMode();
  const hasErrorNotification = store.useSelector.hasNotificationType('error');

  return ( ... )
}
```

#### Dispatch actions `reactive` and `non-reactive`

```tsx
// Synchronous reactive actions
store.dispatch.toggleTheme();
store.dispatch.setSidebarWidth(300);
store.dispatch.addNotification({ message: 'Hello World', type: 'info' });

// Asynchronous reactive actions
await store.dispatch.fetchNotifications();

// Dispatch reactive actions with return values
const theme = store.dispatch.toggleTheme();
const notifications = await store.dispatch.fetchNotifications();

// Dispatch non-reactive actions
store.silentDispatch.updateSettings({ fontSize: 16 });
```

#### Reset store

Reset store to initial states.

```tsx
store.reset();
```
