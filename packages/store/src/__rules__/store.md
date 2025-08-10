# Store Logic Documentation

This document describes the core components and architecture of your custom reactive state management system. It's designed to provide **"ultra thinking"** capabilities, focusing on fine-grained reactivity, performance optimizations, and developer experience enhancements.

---

## 1. Overview and Core Principles

This library provides a robust framework for managing application state with a focus on reactivity, performance, and debuggability.

**Key principles include:**

- **Signals for Fine-Grained Reactivity**
  Changes in individual data points (signals) trigger updates only where necessary, avoiding unnecessary re-renders.

- **Structural Sharing for Immutability & Efficiency**
  State updates create new versions of the modified parts while reusing unchanged parts, optimizing memory and change detection.

- **Selective Caching with LRU**
  Heavily used computed values (selectors) are cached, and an LRU (Least Recently Used) policy manages cache size.

- **Priority Scheduling**
  Updates and side effects are processed efficiently using a priority-based task scheduler, ensuring critical operations run first.

- **DevTools Integration**
  Seamless integration with Redux DevTools for time-travel debugging and state inspection.

- **Event System**
  A flexible event system for decoupled communication between different parts of your application.

---

## 2. Core Components

### 2.1. AnyType

**Type:** `any`

**Description:**
A utility type used to represent any possible JavaScript type, often employed for flexibility in generic functions or when type inference is difficult.
In production, minimize its use to maintain stronger type safety.

---

### 2.2. CacheWrapper\<T\>

**Type:** Interface

**Description:**
A wrapper type used to mark functions as cacheable.

- `__isCached: true` — Indicates that the function is intended for caching.
- `fn: (...args: AnyType[]) => T` — The actual function that will be cached.
- `dependencies?: Set<string>` — Optional set of dependency identifiers (e.g., signal paths) used internally for invalidation.

---

### 2.3. Signal\<T\>

**Type:** Class

**Description:**
The fundamental building block for reactivity. A Signal holds a value and automatically tracks dependencies when accessed, and notifies subscribers on change.

**Key members:**

- `constructor(value: T)` — Initializes with an initial value.
- `value` (getter/setter) — Tracks dependencies when read, notifies subscribers when changed.
- `getValue(): T` — Explicit getter.
- `version: number` — Increments on each change.
- `subscribe(callback: () => void): () => void` — Registers change listener.
- `private notify()` — Calls all subscribers.

---

### 2.4. TrackingContextManager

**Type:** Class

**Description:**
Manages context for dependency tracking.

**Key members:**

- `context` — Current tracking context containing dependencies.
- `getCurrent()` / `setCurrent(value)` — Accessor methods.
- `trackingContextManager` — Exported instance.
- Helper functions: `getCurrentTrackingContext()` / `setCurrentTrackingContext()`.

---

### 2.5. withDependencyTracking\<T\>

**Type:** Function

Executes a given function within a dependency tracking context.
Returns `{ result, dependencies }`.

---

### 2.6. StructuralNode

**Type:** Class

**Description:**
Implements structural sharing for immutable updates.

**Key members:**

- `constructor(data, path)` — Builds node structure.
- `get(path)` — Retrieves by dot-path.
- `getData()` — Snapshot of entire node tree.
- `set(path, value)` — Returns new node with updated path.
- `getVersion()` — Version number for change detection.
- `getAllSignals(prefix)` — Recursively collects signals.

---

### 2.7. LRUCache\<K, V\>

**Type:** Class

**Description:**
LRU cache implementation for selector results.

**Key members:**
`get`, `set`, `delete`, `clear`, `has`, `size`.

---

### 2.8. SelectorCacheEntry

**Type:** Object structure

**Fields:**

- `result` — Selector result.
- `dependencies?` — Signals used.
- `lastUsed` — Timestamp for LRU policy.
- `computeCount` — Recompute counter.
- `isValid` — Cache validity flag.

---

### 2.9. PriorityScheduler

**Type:** Class

Manages tasks by **priority** (`high`, `normal`, `low`) and supports batching.

**Key members:**
`enterBatch()`, `exitBatch()`, `scheduleHigh()`, `scheduleNormal()`, `scheduleLow()`, `flush()`.

---

### 2.10. cache\<T\>

Marks a selector as cacheable.

---

### 2.11. isCacheWrapper

Type guard for `CacheWrapper`.

---

### 2.12. createDevToolsIntegration

Integrates with Redux DevTools.

**Config:**

- `name`
- `onJump`
- `onReset`
- `getState`

Returns DevTools control object.

---

### 2.13. Event System

**Functions:**

- `trigger(eventName, payload)`
- `on(eventName, callback)` — Returns `{ off }`
- `clear()` — Removes all listeners.

---

## 3. createStore — The Main Entry Point

### 3.1. StoreProps

Defines the configuration object for `createStore`.

**Props:**

- `states`
- `actions?`
- `selectors?`
- `config?` — `name`, `devtools`, `cacheSize`, `enablePredictiveComputation`

---

### 3.2. StoreActionFunction

Signature of an action function.

---

### 3.3. StoreSelectorFunction

Signature of a selector function.

---

### 3.4. InferStore

Represents the complete public API returned by `createStore`.

**Members:**

- `dispatch`
- `use`
- `get`
- `reset()`
- `batch(callback)`
- `on(eventName, callback)`

---

### 3.5. Internal Mechanisms

- **State Management** via `StructuralNode`
- **Caching** — `globalSelectorCache` & `persistentSelectorCache`
- **Dependency Tracking** — `selectorDependencies`, `signalToSelectors`
- **Selector Execution**
- **Subscription System**
- **Actions Handling** with `setState`, `clearCache`, `invalidate`

---

## 4. Usage Example

```ts
// Define state, actions, and selectors
type MyState = {
  user: { id: string; name: string; email: string };
  cart: {
    items: Array<{ productId: string; quantity: number }>;
    totalItems: number;
  };
  loading: boolean;
  loadingMessage: string;
  fetchedData: any | null;
};

type MyActions = {
  updateUserName: (newName: string) => void;
  addItemToCart: (productId: string, quantity: number) => void;
  fetchComplexData: () => Promise<void>;
};

type MySelectors = {
  userName: () => string;
  cartItemCount: () => number;
  isCartEmpty: () => boolean;
  totalCartValue: (priceMap: Record<string, number>) => number;
  isLoadingData: () => boolean;
  currentLoadingMessage: () => string;
};

const myStore = createStore<MyState, MyActions, MySelectors>({
  states: {
    user: { id: '123', name: 'Alice', email: 'alice@example.com' },
    cart: { items: [], totalItems: 0 },
    loading: false,
    loadingMessage: '',
    fetchedData: null
  },
  actions: ({ set, get, notify }) => ({
    updateUserName: (newName) => {
      set((state) => {
        state.user.name = newName;
      });
    },
    addItemToCart: (productId, quantity) => {
      set((state) => {
        const existingItem = state.cart.items.find(
          (item) => item.productId === productId
        );
        if (existingItem) existingItem.quantity += quantity;
        else state.cart.items.push({ productId, quantity });
        state.cart.totalItems = state.cart.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
      });
    },
    fetchComplexData: async () => {
      set((state) => {
        state.loading = true;
        state.loadingMessage = 'Starting data fetch...';
        state.fetchedData = null;
      });

      await new Promise((r) => setTimeout(r, 1000));
      get().loadingMessage = 'Fetching user details...';
      notify();

      await new Promise((r) => setTimeout(r, 1500));
      get().loadingMessage = 'Processing historical orders...';
      notify();

      await new Promise((r) => setTimeout(r, 2000));
      set((state) => {
        state.fetchedData = {
          user: { id: 'test-user', name: 'John Doe', age: 30 },
          orders: [
            { id: 'order-1', amount: 120 },
            { id: 'order-2', amount: 35 }
          ]
        };
        state.loading = false;
        state.loadingMessage = 'Data loaded successfully!';
      });
    }
  }),
  selectors: ({ get, cache }) => ({
    userName: () => get().user.name,
    cartItemCount: () => get().cart.totalItems,
    isCartEmpty: cache(() => get().cart.totalItems === 0),
    totalCartValue: cache((priceMap) =>
      get().cart.items.reduce((total, item) => {
        const price = priceMap[item.productId] || 0;
        return total + price * item.quantity;
      }, 0)
    ),
    isLoadingData: () => get().loading,
    currentLoadingMessage: () => get().loadingMessage
  }),
  config: {
    name: 'MyECommerceStore',
    devtools: true,
    cacheSize: 500
  }
});
```

---

## 5. Next Steps

- **Error Handling** — Improve resilience in selectors/actions.
- **Testing** — Add unit & integration tests.
- **Middleware** — Support logging, analytics, async side effects.
- **Extensibility** — Plan clean integration points for new features.

---
