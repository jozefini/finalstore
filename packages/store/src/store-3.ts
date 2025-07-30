'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

/* eslint-disable-next-line */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable-next-line */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnyType = any;

// Enhanced cache wrapper with dependency tracking
interface CacheWrapper<T = AnyType> {
  __isCached: true;
  fn: (...args: AnyType[]) => T;
  dependencies?: Set<string>;
}

// Signal system for fine-grained reactivity
class Signal<T = AnyType> {
  private _value: T;
  private _subscribers = new Set<() => void>();
  private _version = 0;

  constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    // Track dependency during selector execution
    if (currentTrackingContext) {
      currentTrackingContext.dependencies.add(this);
    }
    return this._value;
  }

  set value(newValue: T) {
    if (!Object.is(newValue, this._value)) {
      this._value = newValue;
      this._version++;
      this.notify();
    }
  }

  getValue(): T {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    return this.value;
  }

  get version(): number {
    return this._version;
  }

  subscribe(callback: () => void): () => void {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  private notify(): void {
    for (const callback of this._subscribers) {
      callback();
    }
  }
}

// Dependency tracking context
let currentTrackingContext: {
  dependencies: Set<Signal>;
} | null = null;

// Structural sharing implementation
class StructuralNode {
  private _data: Record<string, AnyType>;
  private _signals = new Map<string, Signal>();
  private _children = new Map<string, StructuralNode>();
  private _version = 0;
  private _path: string;

  constructor(data: Record<string, AnyType>, path = '') {
    this._data = { ...data };
    this._path = path;
    this.initializeSignals();
  }

  private initializeSignals = (): void => {
    for (const [key, value] of Object.entries(this._data)) {
      const fullPath = this._path ? `${this._path}.${key}` : key;
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        this._children.set(key, new StructuralNode(value, fullPath));
      } else {
        this._signals.set(key, new Signal(value));
      }
    }
  };

  get = (path: string): AnyType => {
    const parts = path.split('.');
    return this.getByParts(parts);
  };

  private getByParts = (parts: string[]): AnyType => {
    if (parts.length === 0) return this._data;

    const [first, ...rest] = parts;

    if (rest.length === 0) {
      const signal = this._signals.get(first);
      if (signal) {
        return signal.getValue();
      }
      const child = this._children.get(first);
      if (child) {
        return child.getData();
      }
      return this._data[first];
    }

    const child = this._children.get(first);
    if (child) {
      return child.getByParts(rest);
    }

    return undefined;
  };

  getData = (): Record<string, AnyType> => {
    const result: Record<string, AnyType> = {};

    for (const [key, signal] of this._signals) {
      result[key] = signal.getValue();
    }

    for (const [key, child] of this._children) {
      result[key] = child.getData();
    }

    return result;
  };

  set = (path: string, value: AnyType): StructuralNode => {
    const parts = path.split('.');
    return this.setByParts(parts, value);
  };

  private setByParts = (parts: string[], value: AnyType): StructuralNode => {
    if (parts.length === 1) {
      const key = parts[0];

      // Check if value is the same
      const currentValue = this.get(key);
      if (Object.is(currentValue, value)) {
        return this;
      }

      // Create new instance with structural sharing
      const newNode = new StructuralNode({}, this._path);
      newNode._version = this._version + 1;

      // Copy all signals except the changed one
      for (const [k, signal] of this._signals) {
        if (k === key) {
          const newSignal = new Signal(value);
          newSignal.value = value; // This will notify subscribers
          newNode._signals.set(k, newSignal);
        } else {
          newNode._signals.set(k, signal);
        }
      }

      // Copy all children except if we're replacing an object with a primitive
      for (const [k, child] of this._children) {
        if (k !== key) {
          newNode._children.set(k, child);
        }
      }

      // If value is an object, create a new child
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        key !== parts[0]
      ) {
        const fullPath = this._path ? `${this._path}.${key}` : key;
        newNode._children.set(key, new StructuralNode(value, fullPath));
      }

      return newNode;
    }

    const [first, ...rest] = parts;
    let child = this._children.get(first);

    if (!child) {
      // Create intermediate nodes
      const fullPath = this._path ? `${this._path}.${first}` : first;
      child = new StructuralNode({}, fullPath);
    }

    const newChild = child.setByParts(rest, value);
    if (newChild === child) {
      return this;
    }

    // Create new instance with updated child
    const newNode = new StructuralNode({}, this._path);
    newNode._version = this._version + 1;

    // Copy all signals
    for (const [k, signal] of this._signals) {
      newNode._signals.set(k, signal);
    }

    // Copy all children with the updated one
    for (const [k, c] of this._children) {
      newNode._children.set(k, k === first ? newChild : c);
    }

    return newNode;
  };

  getVersion = (): number => {
    return this._version;
  };

  getAllSignals = (prefix = ''): Map<string, Signal> => {
    const allSignals = new Map<string, Signal>();

    // Add direct signals
    for (const [key, signal] of this._signals) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      allSignals.set(fullKey, signal);
    }

    // Add child signals with path prefix
    for (const [key, child] of this._children) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      const childSignals = child.getAllSignals(childPrefix);
      for (const [childKey, childSignal] of childSignals) {
        allSignals.set(childKey, childSignal);
      }
    }

    return allSignals;
  };
}

// LRU Cache implementation
class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey as K);
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }

  // Helper to iterate over entries
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

// Enhanced selector cache with dependency tracking
type SelectorCacheEntry = {
  result: AnyType;
  dependencies: Set<Signal>;
  lastUsed: number;
  computeCount: number;
  isValid: boolean;
};

// Priority scheduler for cooperative scheduling
class PriorityScheduler {
  private highPriorityQueue: (() => void)[] = [];
  private normalPriorityQueue: (() => void)[] = [];
  private lowPriorityQueue: (() => void)[] = [];
  private isRunning = false;
  private batchDepth = 0;
  private pendingCallbacks = new Set<() => void>();

  enterBatch(): void {
    this.batchDepth++;
  }

  exitBatch(): void {
    this.batchDepth--;
    if (this.batchDepth === 0) {
      this.flushBatch();
    }
  }

  private flushBatch(): void {
    const callbacks = Array.from(this.pendingCallbacks);
    this.pendingCallbacks.clear();
    callbacks.forEach((cb) => cb());
  }

  scheduleHigh(callback: () => void): void {
    if (this.batchDepth > 0) {
      this.pendingCallbacks.add(callback);
      return;
    }
    this.highPriorityQueue.push(callback);
    this.flush();
  }

  scheduleNormal(callback: () => void): void {
    if (this.batchDepth > 0) {
      this.pendingCallbacks.add(callback);
      return;
    }
    this.normalPriorityQueue.push(callback);
    this.flush();
  }

  scheduleLow(callback: () => void): void {
    if (this.batchDepth > 0) {
      this.pendingCallbacks.add(callback);
      return;
    }
    this.lowPriorityQueue.push(callback);
    this.flush();
  }

  private flush(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    queueMicrotask(() => {
      const startTime = performance.now();
      const timeSlice = 5; // 5ms time slice

      while (performance.now() - startTime < timeSlice) {
        const callback =
          this.highPriorityQueue.shift() ||
          this.normalPriorityQueue.shift() ||
          this.lowPriorityQueue.shift();

        if (!callback) break;

        try {
          callback();
        } catch (error) {
          console.error('Scheduler error:', error);
        }
      }

      this.isRunning = false;

      // If there are still callbacks, schedule next batch
      if (
        this.highPriorityQueue.length ||
        this.normalPriorityQueue.length ||
        this.lowPriorityQueue.length
      ) {
        this.flush();
      }
    });
  }
}

// Types
type SetFunction<TState> = (updater: (state: TState) => void) => void;

type ActionsContext<TState, TActions, TSelectors, TEvents> = (store: {
  set: SetFunction<TState>;
  get: () => TState;
  actions: TActions;
  selectors: TSelectors;
  trigger: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ) => void;
  notify: () => void;
  invalidate: (selectorName: keyof TSelectors | (keyof TSelectors)[]) => void;
  clearCache: (selectorName: keyof TSelectors | (keyof TSelectors)[]) => void;
}) => TActions;

type SelectorsContext<TState, TSelectors> = (store: {
  get: () => TState;
  selectors: TSelectors;
  cache: <T>(fn: (...args: AnyType[]) => T) => CacheWrapper<T>;
}) => {
  [K in keyof TSelectors]: TSelectors[K] | CacheWrapper<AnyType>;
};

type StoreProps<
  TState,
  TActions,
  TSelectors,
  TEvents = Record<string, unknown>
> = {
  states: TState;
  actions?: ActionsContext<TState, TActions, TSelectors, TEvents>;
  selectors?: SelectorsContext<TState, TSelectors>;
  config?: {
    name?: string;
    devtools?: boolean;
    cacheSize?: number;
    enablePredictiveComputation?: boolean;
  };
};

type StoreActionFunction<TPayload = undefined> = TPayload extends undefined
  ? () => unknown | Promise<unknown>
  : (payload: TPayload) => unknown | Promise<unknown>;

type StoreSelectorFunction<
  TResult,
  TPayload = undefined
> = TPayload extends undefined ? () => TResult : (payload: TPayload) => TResult;

type EventPayload<
  TEvents,
  TEventName extends keyof TEvents
> = TEvents[TEventName];

type InferStore<
  TState,
  TActions,
  TSelectors,
  TEvents = Record<string, unknown>
> = {
  dispatch: TActions;
  use: {
    (): TState;
    <T>(selector: (state: TState) => T): T;
  } & TSelectors;
  get: {
    (): TState;
    <T>(selector: (state: TState) => T): T;
  } & TSelectors;
  reset: () => void;
  batch: (callback: () => void) => void;
  on: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ) => { off: () => void };
};

// Enhanced cache function
const cache = <T>(fn: (...args: AnyType[]) => T): CacheWrapper<T> => ({
  __isCached: true,
  fn,
  dependencies: new Set()
});

const isCacheWrapper = (value: AnyType): value is CacheWrapper => {
  return value && typeof value === 'object' && value.__isCached === true;
};

// Main store implementation
export function createStore<
  TState extends Record<string, unknown> = AnyType,
  TActions extends Record<string, StoreActionFunction<AnyType>> = AnyType,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<AnyType, AnyType>
  > = AnyType,
  TEvents extends Record<string, unknown> = Record<string, unknown>
>(
  props: StoreProps<TState, TActions, TSelectors, TEvents>
): InferStore<TState, TActions, TSelectors, TEvents> {
  // Enhanced state management with structural sharing
  const initialStates = props.states;
  let currentStateNode = new StructuralNode(
    initialStates as Record<string, AnyType>
  );
  let stateVersion = 0;

  // Enhanced caching system
  const cacheSize = props.config?.cacheSize || 1000;
  const globalSelectorCache = new LRUCache<string, SelectorCacheEntry>(
    cacheSize
  );
  const persistentSelectorCache = new LRUCache<string, SelectorCacheEntry>(
    cacheSize * 2
  );

  // Priority scheduler
  const scheduler = new PriorityScheduler();

  // Enhanced dependency tracking
  const selectorDependencies = new Map<string, Set<Signal>>();
  const signalToSelectors = new Map<Signal, Set<string>>();

  function trackDependencies<T>(selectorName: string, fn: () => T): T {
    const trackingContext = { dependencies: new Set<Signal>() };
    const prevContext = currentTrackingContext;
    currentTrackingContext = trackingContext;

    try {
      const result = fn();

      // Clear old dependencies
      const oldDeps = selectorDependencies.get(selectorName);
      if (oldDeps) {
        for (const signal of oldDeps) {
          const selectors = signalToSelectors.get(signal);
          if (selectors) {
            selectors.delete(selectorName);
            if (selectors.size === 0) {
              signalToSelectors.delete(signal);
            }
          }
        }
      }

      // Update dependency mappings
      selectorDependencies.set(selectorName, trackingContext.dependencies);

      // Subscribe to signals
      for (const signal of trackingContext.dependencies) {
        let selectors = signalToSelectors.get(signal);
        if (!selectors) {
          selectors = new Set();
          signalToSelectors.set(signal, selectors);
        }
        selectors.add(selectorName);
      }

      return result;
    } finally {
      currentTrackingContext = prevContext;
    }
  }

  // Enhanced selector cache management
  function invalidateDependentSelectors(changedPaths: Set<string>): void {
    const selectorsToInvalidate = new Set<string>();
    const allSignals = currentStateNode.getAllSignals();

    // Find all affected signals
    const affectedSignals = new Set<Signal>();
    for (const path of changedPaths) {
      const signal = allSignals.get(path);
      if (signal) {
        affectedSignals.add(signal);
      }
      // Also check for parent paths (e.g., if "user.name" changed, "user" is also affected)
      const parts = path.split('.');
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join('.');
        const parentSignal = allSignals.get(parentPath);
        if (parentSignal) {
          affectedSignals.add(parentSignal);
        }
      }
    }

    // Find all dependent selectors
    for (const signal of affectedSignals) {
      const dependentSelectors = signalToSelectors.get(signal);
      if (dependentSelectors) {
        for (const selectorName of dependentSelectors) {
          selectorsToInvalidate.add(selectorName);
        }
      }
    }

    // Invalidate affected selectors (only cached ones need invalidation)
    for (const selectorName of selectorsToInvalidate) {
      if (isCachedSelector(selectorName)) {
        const cache = getSelectorCache(selectorName);
        // Invalidate all entries for this cached selector
        for (const [key, entry] of cache.entries()) {
          if (typeof key === 'string' && key.startsWith(`${selectorName}:`)) {
            entry.isValid = false;
          }
        }
      }
      // Non-cached selectors don't need invalidation since they're always fresh
    }
  }

  // Create reactive proxy with enhanced change detection
  function createEnhancedProxy<T extends Record<string, AnyType>>(
    path = ''
  ): T {
    return new Proxy({} as T, {
      get(_, prop) {
        const propPath = path ? `${path}.${String(prop)}` : String(prop);
        const value = currentStateNode.get(propPath);

        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          return createEnhancedProxy(propPath);
        }
        return value;
      },
      set(_, prop, value) {
        const propPath = path ? `${path}.${String(prop)}` : String(prop);
        const newStateNode = currentStateNode.set(propPath, value);

        if (newStateNode !== currentStateNode) {
          currentStateNode = newStateNode;
          stateVersion++;

          // Track changed paths
          const changedPaths = new Set<string>();
          changedPaths.add(propPath);

          // Schedule invalidation and notifications
          scheduler.scheduleHigh(() => {
            invalidateDependentSelectors(changedPaths);
          });

          scheduler.scheduleNormal(() => {
            notifySubscribers();
          });
        }

        return true;
      },
      has(_, prop) {
        const propPath = path ? `${path}.${String(prop)}` : String(prop);
        return currentStateNode.get(propPath) !== undefined;
      },
      ownKeys() {
        const data = currentStateNode.get(path) || {};
        return Object.keys(data);
      },
      getOwnPropertyDescriptor(_, prop) {
        const propPath = path ? `${path}.${String(prop)}` : String(prop);
        const value = currentStateNode.get(propPath);
        if (value !== undefined) {
          return {
            configurable: true,
            enumerable: true,
            value
          };
        }
        return undefined;
      }
    });
  }

  const statesProxy = createEnhancedProxy<TState>();

  // Get current state
  const getCurrentState = (): TState => {
    return statesProxy;
  };

  // Set function for actions
  const setState: SetFunction<TState> = (updater) => {
    updater(statesProxy);
  };

  // Detect cached selectors
  const cachedSelectorNames = new Set<string>();

  if (props.selectors) {
    const tempSelectors = props.selectors({
      get: getCurrentState,
      selectors: {} as TSelectors,
      cache
    });

    for (const [key, selector] of Object.entries(tempSelectors)) {
      if (isCacheWrapper(selector)) {
        cachedSelectorNames.add(key);
      }
    }
  }

  function isCachedSelector(selectorName: string): boolean {
    return cachedSelectorNames.has(selectorName);
  }

  function getSelectorCache(
    selectorName: string
  ): LRUCache<string, SelectorCacheEntry> {
    return isCachedSelector(selectorName)
      ? persistentSelectorCache
      : globalSelectorCache;
  }

  // Enhanced selector execution with dependency tracking
  function executeSelector<T>(
    selectorName: string,
    fn: () => T,
    args: AnyType[] = []
  ): T {
    const isCached = isCachedSelector(selectorName);

    if (isCached) {
      // For cached selectors, use the cache system
      const cacheKey = `${selectorName}:${JSON.stringify(args)}`;
      const cache = getSelectorCache(selectorName);
      const cached = cache.get(cacheKey);

      // Check if cached result is still valid
      if (cached?.isValid) {
        cached.lastUsed = Date.now();
        return cached.result;
      }

      // Execute with dependency tracking
      const result = trackDependencies(selectorName, fn);
      const dependencies = selectorDependencies.get(selectorName) || new Set();

      // Cache the result
      cache.set(cacheKey, {
        result,
        dependencies,
        lastUsed: Date.now(),
        computeCount: (cached?.computeCount || 0) + 1,
        isValid: true
      });

      return result;
    }
    return trackDependencies(selectorName, fn);
  }

  // Initialize selectors
  const selectors = {} as TSelectors;

  if (props.selectors) {
    const selectorDefinitions = props.selectors({
      get: getCurrentState,
      selectors: selectors,
      cache
    });

    for (const [key, selectorDef] of Object.entries(selectorDefinitions)) {
      if (isCacheWrapper(selectorDef)) {
        selectors[key as keyof TSelectors] = ((...args: AnyType[]) =>
          executeSelector(key, () => selectorDef.fn(...args), args)) as AnyType;
      } else {
        selectors[key as keyof TSelectors] = ((...args: AnyType[]) =>
          executeSelector(key, () => selectorDef(...args), args)) as AnyType;
      }
    }
  }

  // Subscriber management
  const subscribers = new Map<
    number,
    { callback: () => void; selector?: (state: TState) => AnyType }
  >();
  let nextSubscriberId = 0;

  function subscribe(
    callback: () => void,
    selector?: (state: TState) => AnyType
  ): () => void {
    const id = nextSubscriberId++;
    subscribers.set(id, { callback, selector });
    return () => subscribers.delete(id);
  }

  function notifySubscribers(): void {
    for (const { callback } of subscribers.values()) {
      scheduler.scheduleNormal(callback);
    }
  }

  // Event system
  const events = new Map<string, Set<(payload: AnyType) => void>>();

  function trigger<TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ): void {
    const eventCallbacks = events.get(eventName as string);
    if (eventCallbacks) {
      for (const callback of eventCallbacks) {
        try {
          callback(payload);
        } catch (error) {
          console.error(
            `Error in event handler for ${String(eventName)}:`,
            error
          );
        }
      }
    }
  }

  function on<TEventName extends keyof TEvents>(
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ): { off: () => void } {
    const eventKey = eventName as string;
    if (!events.has(eventKey)) {
      events.set(eventKey, new Set());
    }
    const eventCallbacks = events.get(eventKey)!;
    const typedCallback = callback as (payload: AnyType) => void;
    eventCallbacks.add(typedCallback);

    return {
      off: () => {
        eventCallbacks.delete(typedCallback);
        // Clean up empty event sets
        if (eventCallbacks.size === 0) {
          events.delete(eventKey);
        }
      }
    };
  }

  // Initialize actions
  const dispatch = {} as TActions;

  const clearCache = (
    selectorNames: keyof TSelectors | (keyof TSelectors)[]
  ): void => {
    const names = Array.isArray(selectorNames)
      ? selectorNames
      : [selectorNames];

    scheduler.scheduleHigh(() => {
      for (const name of names) {
        const cache = getSelectorCache(String(name));
        // Clear all entries for this selector
        const keysToDelete: string[] = [];
        for (const [key] of cache.entries()) {
          if (typeof key === 'string' && key.startsWith(`${String(name)}:`)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => cache.delete(key));
      }
    });
  };

  const invalidate = (
    selectorNames: keyof TSelectors | (keyof TSelectors)[]
  ): void => {
    const names = Array.isArray(selectorNames)
      ? selectorNames
      : [selectorNames];

    scheduler.scheduleHigh(() => {
      for (const name of names) {
        const cache = getSelectorCache(String(name));
        // Invalidate all entries for this selector
        for (const [key, entry] of cache.entries()) {
          if (typeof key === 'string' && key.startsWith(`${String(name)}:`)) {
            entry.isValid = false;
          }
        }
      }
    });
  };

  if (props.actions) {
    const actionCreators = props.actions({
      set: setState,
      get: getCurrentState,
      actions: dispatch,
      selectors,
      trigger,
      notify: notifySubscribers,
      invalidate,
      clearCache
    });

    // Wrap actions with DevTools tracking
    const wrappedActions = {} as TActions;
    for (const [actionName, actionFn] of Object.entries(actionCreators)) {
      wrappedActions[actionName as keyof TActions] = ((...args: AnyType[]) => {
        const actionInfo = {
          type: actionName,
          payload: args.length === 1 ? args[0] : args
        };

        // Execute the original action
        const result = (actionFn as AnyType)(...args);

        // Handle DevTools tracking
        if (result instanceof Promise) {
          // For async actions, send to DevTools after completion
          return result
            .then((finalResult) => {
              sendToDevTools(actionInfo);
              return finalResult;
            })
            .catch((error) => {
              sendToDevTools({
                type: `${actionName}_ERROR`,
                payload: { ...actionInfo.payload, error: error.message }
              });
              throw error;
            });
        } else {
          // For sync actions, send immediately
          sendToDevTools(actionInfo);
          return result;
        }
      }) as AnyType;
    }

    Object.assign(dispatch, wrappedActions);
  }

  // Enhanced get/use functions
  function get(): TState;
  function get<T>(selector: (state: TState) => T): T;
  function get<T>(selector?: (state: TState) => T): TState | T {
    if (!selector) {
      // Return a snapshot of the current state
      return currentStateNode.getData() as TState;
    }
    return selector(statesProxy);
  }

  // Enhanced implementation with proper memoization
  function use(): TState;
  function use<T>(selector: (state: TState) => T): T;
  function use<T>(selector?: (state: TState) => T): TState | T {
    // Create stable references for the hooks
    const selectorRef = useRef(selector);
    const lastSnapshotRef = useRef<AnyType>(undefined);
    const lastVersionRef = useRef(-1);

    // Update selector ref on change
    useEffect(() => {
      selectorRef.current = selector;
    }, [selector]);

    const subscribeFn = useCallback((callback: () => void) => {
      return subscribe(
        callback,
        selectorRef.current as (state: TState) => AnyType
      );
    }, []);

    const getSnapshot = useCallback(() => {
      const currentSelector = selectorRef.current;

      // Check if we can return cached snapshot
      if (
        lastVersionRef.current === stateVersion &&
        lastSnapshotRef.current !== undefined
      ) {
        return lastSnapshotRef.current;
      }

      let newSnapshot: AnyType;

      if (!currentSelector) {
        // For full state subscription
        newSnapshot = currentStateNode.getData() as TState;
      } else {
        // For selector subscription, execute selector
        try {
          newSnapshot = currentSelector(statesProxy);
        } catch (error) {
          // Handle selector errors gracefully
          console.error('Selector error:', error);
          return lastSnapshotRef.current;
        }
      }

      // Update cache
      lastVersionRef.current = stateVersion;
      lastSnapshotRef.current = newSnapshot;

      return newSnapshot;
    }, []);

    const getServerSnapshot = useCallback(() => {
      const currentSelector = selectorRef.current;
      if (!currentSelector) {
        return initialStates;
      }
      try {
        return currentSelector(initialStates);
      } catch {
        return undefined;
      }
    }, []);

    return useSyncExternalStore(subscribeFn, getSnapshot, getServerSnapshot);
  }

  // Add selector methods to get/use
  Object.assign(get, selectors);

  Object.assign(use, selectors);

  // DevTools integration
  let devTools: AnyType = null;
  let pauseDevTools = false;
  const pendingDevToolsActions: { type: string; payload: AnyType }[] = [];

  if (
    props.config?.devtools &&
    typeof window !== 'undefined' &&
    (window as AnyType).__REDUX_DEVTOOLS_EXTENSION__
  ) {
    devTools = (window as AnyType).__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: props.config.name || 'Store',
      trace: true,
      traceLimit: 25,
      features: {
        jump: true,
        skip: true,
        reorder: true,
        dispatch: true,
        persist: true
      }
    });

    devTools.init(currentStateNode.getData());

    // Subscribe to DevTools messages for time-travel debugging
    devTools.subscribe((message: AnyType) => {
      if (message.type === 'DISPATCH') {
        switch (message.payload.type) {
          case 'JUMP_TO_ACTION':
          case 'JUMP_TO_STATE':
            try {
              const newState = JSON.parse(message.state || '{}');
              pauseDevTools = true;

              // Update state using the structural sharing system
              currentStateNode = new StructuralNode(newState);
              stateVersion++;

              // CRITICAL: Clear all selector caches during DevTools time-travel
              // This ensures all selectors reflect the jumped-to state
              globalSelectorCache.clear();
              persistentSelectorCache.clear();

              // Optional: Log cache clearing in development
              if (
                typeof window !== 'undefined' &&
                (window as any).__STORE_DEBUG__
              ) {
                console.log(
                  '🔄 DevTools: Cleared all selector caches for time-travel'
                );
              }

              // Notify subscribers of the state change
              scheduler.scheduleNormal(() => {
                notifySubscribers();
                pauseDevTools = false;
              });
            } catch (error) {
              console.error('Failed to parse DevTools state:', error);
              pauseDevTools = false;
            }
            break;
          case 'RESET':
            // Use the existing reset functionality
            scheduler.scheduleNormal(() => {
              currentStateNode = new StructuralNode(
                initialStates as Record<string, AnyType>
              );
              stateVersion++;
              events.clear();

              // Clear all selector caches on reset as well
              globalSelectorCache.clear();
              persistentSelectorCache.clear();

              // Optional: Log cache clearing in development
              if (
                typeof window !== 'undefined' &&
                (window as any).__STORE_DEBUG__
              ) {
                console.log(
                  '🔄 DevTools: Cleared all selector caches for reset'
                );
              }

              notifySubscribers();
            });
            break;
        }
      }
    });
  }

  // DevTools action tracking
  let isBatchingDevTools = false;
  let batchedDevToolsActions: { type: string; payload: AnyType }[] = [];

  function sendToDevTools(actionInfo: { type: string; payload: AnyType }) {
    if (devTools && !pauseDevTools) {
      if (isBatchingDevTools) {
        batchedDevToolsActions.push(actionInfo);
      } else {
        scheduler.scheduleNormal(() => {
          devTools.send(actionInfo, currentStateNode.getData());
        });
      }
    }
  }

  function sendBatchToDevTools(actions: { type: string; payload: AnyType }[]) {
    if (devTools && !pauseDevTools && actions.length > 0) {
      scheduler.scheduleNormal(() => {
        if (actions.length === 1) {
          devTools.send(actions[0], currentStateNode.getData());
        } else {
          devTools.send(
            {
              type: 'BATCH',
              payload: actions
            },
            currentStateNode.getData()
          );
        }
      });
    }
  }

  return {
    dispatch,
    use: use as typeof use & TSelectors,
    get: get as typeof get & TSelectors,
    reset: () => {
      scheduler.enterBatch();
      currentStateNode = new StructuralNode(
        initialStates as Record<string, AnyType>
      );
      stateVersion++;
      // Clear all events on reset
      events.clear();
      scheduler.exitBatch();
      scheduler.scheduleNormal(() => {
        notifySubscribers();
        sendToDevTools({ type: 'RESET', payload: null });
      });
    },
    batch: (callback: () => void) => {
      const batchStartVersion = stateVersion;

      // Enable DevTools batching
      isBatchingDevTools = true;
      batchedDevToolsActions = [];

      scheduler.enterBatch();
      try {
        callback();
      } finally {
        scheduler.exitBatch();

        // Disable DevTools batching and send collected actions
        isBatchingDevTools = false;

        // Send batched actions to DevTools if state actually changed
        if (
          stateVersion > batchStartVersion &&
          batchedDevToolsActions.length > 0
        ) {
          sendBatchToDevTools([...batchedDevToolsActions]);
        }

        // Clear the batch
        batchedDevToolsActions = [];
      }
    },
    on
  };
}
