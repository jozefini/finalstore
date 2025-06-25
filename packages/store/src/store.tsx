'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from 'react';

/* eslint-disable-next-line */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable-next-line */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnyType = any;
type ActionsContext<TState, TActions, TSelectors, TEvents> = (store: {
  states: TState;
  actions: TActions;
  selectors: TSelectors;
  trigger: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ) => void;
  notify: () => void;
  invalidate: (selectorName: keyof TSelectors) => void;
}) => TActions;

type SelectorsContext<TState, TSelectors> = (store: {
  states: TState;
  selectors: TSelectors;
}) => TSelectors;

type StoreProps<
  TState,
  TActions,
  TSelectors,
  TEvents = Record<string, unknown>
> = {
  states: TState;
  actions?: ActionsContext<TState, TActions, TSelectors, TEvents>;
  selectors?: SelectorsContext<TState, TSelectors>;
  cacheSelectors?: readonly (keyof TSelectors)[];
  config?: {
    name?: string;
    devtools?: boolean;
  };
};

// Action and selector types
type StoreActionFunction<TPayload = undefined> = (
  payload: TPayload
) => unknown | Promise<unknown>;

type StoreSelectorFunction<TResult, TPayload = undefined> = (
  payload?: TPayload
) => TResult;

type PayloadByAction<TActions> = {
  [K in keyof TActions]: TActions[K] extends StoreActionFunction<infer P>
    ? P
    : never;
};

// Event types
type EventCallback<TPayload = unknown> = (payload: TPayload) => void;
type EventListener = { off: () => void };
type EventMap = Map<string, Set<EventCallback<any>>>;
type EventPayload<
  TEvents,
  TEventName extends keyof TEvents
> = TEvents[TEventName];

// DevTools Types
type DevToolsMessage = {
  type: string;
  payload: {
    type: string;
  };
  state?: string;
};

type DevTools = {
  connect: (config: unknown) => DevTools;
  init: (state: unknown) => void;
  subscribe: (listener: (message: DevToolsMessage) => void) => void;
  send: (action: unknown, state: unknown) => void;
};

// Update the InferStore type to match our implementation
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
  } & {
    [K in keyof TSelectors]: TSelectors[K];
  };
  get: {
    (): TState;
    <T>(selector: (state: TState) => T): T;
  } & {
    [K in keyof TSelectors]: TSelectors[K];
  };
  reset: () => void;
  batch: (callback: () => void) => void; // Batching API
  on: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ) => EventListener;
};

// Utility for batching updates
const createBatcher = () => {
  let isBatching = false;
  let notifyCallback: (() => void) | null = null;
  let batchedActions: { type: string; payload: any }[] = [];

  const batch = (fn: () => void, notify: () => void) => {
    if (!isBatching) {
      // If not already batching, start a new batch
      isBatching = true;
      notifyCallback = notify;
      batchedActions = [];
      try {
        fn();
      } finally {
        // End the batch and notify if needed
        isBatching = false;
        if (notifyCallback) {
          // Always call notify when batch finishes at top level
          const cb = notifyCallback;
          notifyCallback = null;
          cb();
        }
        batchedActions = [];
      }
    } else {
      // If already batching, just execute the function
      // and queue notification for the parent batch
      fn();
    }
  };

  const shouldNotify = () => !isBatching;
  const getBatchedActions = () => batchedActions;
  const addBatchedAction = (action: { type: string; payload: any }) => {
    if (isBatching) {
      batchedActions.push(action);
    }
  };

  return {
    batch,
    shouldNotify,
    getBatchedActions,
    addBatchedAction,
    isBatching: () => isBatching
  };
};

// HELPERS:

function createReactiveProxy<T>(
  obj: T,
  onMutate?: (
    target: any,
    key: string | symbol,
    newVal: any,
    oldVal: any
  ) => void
): T {
  const proxyCache = new WeakMap();

  function wrap(value: any): any {
    if (typeof value !== 'object' || value === null) return value;

    // Already proxied?
    if (proxyCache.has(value)) return proxyCache.get(value);

    // Don't proxy certain built-in objects and special collections
    if (
      value instanceof Date ||
      value instanceof RegExp ||
      value instanceof Error ||
      value instanceof Map ||
      value instanceof Set ||
      value instanceof WeakMap ||
      value instanceof WeakSet ||
      ArrayBuffer.isView(value)
    ) {
      return value;
    }

    const proxy = new Proxy(value, {
      get(target, key, receiver) {
        const result = Reflect.get(target, key, receiver);
        // Only wrap the result if it's not a function (to avoid breaking methods)
        return typeof result === 'function' ? result : wrap(result);
      },
      set(target, key, newValue, receiver) {
        const oldValue = target[key];
        const result = Reflect.set(target, key, newValue, receiver);
        if (oldValue !== newValue && onMutate) {
          onMutate(target, key, newValue, oldValue);
        }
        return result;
      },
      deleteProperty(target, key) {
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const oldValue = hadKey ? target[key] : undefined;
        const result = Reflect.deleteProperty(target, key);
        if (hadKey && onMutate) {
          onMutate(target, key, undefined, oldValue);
        }
        return result;
      }
    });

    proxyCache.set(value, proxy);
    return proxy;
  }

  return wrap(obj);
}

export function deepClone<T>(obj: T): T {
  // Handle primitive types, null, and undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  // Handle Array objects
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as any;
  }
  // Handle Map objects
  if (obj instanceof Map) {
    const result = new Map();
    obj.forEach((value, key) => {
      result.set(deepClone(key), deepClone(value));
    });
    return result as any;
  }
  // Handle Set objects
  if (obj instanceof Set) {
    const result = new Set();
    obj.forEach((value) => {
      result.add(deepClone(value));
    });
    return result as any;
  }
  // Handle regular objects
  const result = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key]);
    }
  }
  return result;
}

export function isDeepEqual(a: unknown, b: unknown): boolean {
  // Direct reference equality
  if (a === b) return true;

  // Handle null/undefined
  if (a == null || b == null) return false;

  // Simple type check
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return Object.is(a, b);

  // Type guard for arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle regular objects
  if (Array.isArray(b)) return false;

  // Type guard for objects
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  const keys = Object.keys(objA);
  if (keys.length !== Object.keys(objB).length) return false;

  for (const key of keys) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !isDeepEqual(objA[key], objB[key])
    ) {
      return false;
    }
  }

  return true;
}

// STORE:

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
  const initialStates = deepClone(props.states);
  const states = deepClone(initialStates);

  // State change tracking for optimization
  let stateVersion = 0;
  let suppressProxyNotifications = false; // Flag to suppress notifications during sync actions

  // Global selector cache system for performance optimization
  type SelectorCacheEntry = {
    result: any;
    stateVersion: number;
    lastUsed: number;
    computeCount: number; // For debugging
  };

  const globalSelectorCache = new Map<string, SelectorCacheEntry>();
  const persistentSelectorCache = new Map<string, SelectorCacheEntry>(); // Never auto-invalidated
  const activeSelectorKeys = new Set<string>(); // Track which selectors are actively used

  // Cache configuration
  const cachedSelectorNames = new Set(props.cacheSelectors || []);
  const selectorSubscribers = new Map<string, Set<() => void>>(); // Per-selector subscribers

  // Cache key generation for selectors with arguments
  function createSelectorCacheKey(selectorName: string, args: any[]): string {
    if (args.length === 0) return selectorName;

    try {
      // Use JSON.stringify for simple serializable arguments
      const argsHash = JSON.stringify(args);
      return `${selectorName}:${argsHash}`;
    } catch {
      // Fallback for non-serializable arguments - generate unique key
      const fallbackHash = args.map((arg, i) => `${i}:${typeof arg}`).join(',');
      return `${selectorName}:fallback:${fallbackHash}:${Date.now()}`;
    }
  }

  // Extract selector name from cache key
  function extractSelectorName(cacheKey: string): string {
    const colonIndex = cacheKey.indexOf(':');
    return colonIndex === -1 ? cacheKey : cacheKey.substring(0, colonIndex);
  }

  // Check if selector is cached
  function isCachedSelector(selectorName: string): boolean {
    return cachedSelectorNames.has(selectorName as keyof TSelectors);
  }

  // Get appropriate cache for selector
  function getSelectorCache(
    selectorName: string
  ): Map<string, SelectorCacheEntry> {
    return isCachedSelector(selectorName)
      ? persistentSelectorCache
      : globalSelectorCache;
  }

  // Pre-compute all active selectors when state changes
  function updateGlobalSelectorCaches() {
    const currentStateVersion = stateVersion;
    const currentState = getState();
    let updatedCount = 0;

    for (const cacheKey of activeSelectorKeys) {
      const selectorName = extractSelectorName(cacheKey);

      // Skip cached selectors - they are never auto-invalidated
      if (isCachedSelector(selectorName)) {
        continue;
      }

      const cached = globalSelectorCache.get(cacheKey);

      // Only update if state version changed or cache doesn't exist
      if (!cached || cached.stateVersion !== currentStateVersion) {
        try {
          if (selectors[selectorName as keyof TSelectors]) {
            let args: any[] = [];

            const colonIndex = cacheKey.indexOf(':');
            if (colonIndex !== -1) {
              const argsStr = cacheKey.substring(colonIndex + 1);
              if (!argsStr.startsWith('fallback:')) {
                try {
                  args = JSON.parse(argsStr);
                } catch {
                  // Skip invalid cache entries
                  continue;
                }
              }
            }

            // Re-compute selector with current state
            const newResult = (
              selectors[selectorName as keyof TSelectors] as any
            )(...args);

            globalSelectorCache.set(cacheKey, {
              result: newResult,
              stateVersion: currentStateVersion,
              lastUsed: Date.now(),
              computeCount: (cached?.computeCount || 0) + 1
            });

            updatedCount++;
          }
        } catch (error) {
          // Remove invalid cache entries
          globalSelectorCache.delete(cacheKey);
          activeSelectorKeys.delete(cacheKey);
        }
      }
    }

    // Optional: Log performance info in development
    if (typeof window !== 'undefined' && (window as any).__STORE_DEBUG__) {
      console.log(
        `🔄 Updated ${updatedCount} non-cached selector caches for state version ${currentStateVersion}`
      );
    }
  }

  // Cache cleanup to prevent memory leaks
  function cleanupSelectorCache() {
    const cutoff = Date.now() - 300000; // 5 minutes
    let cleanedCount = 0;

    for (const [cacheKey, entry] of globalSelectorCache.entries()) {
      if (entry.lastUsed < cutoff) {
        globalSelectorCache.delete(cacheKey);
        activeSelectorKeys.delete(cacheKey);
        cleanedCount++;
      }
    }

    // Optional: Log cleanup info in development
    if (
      typeof window !== 'undefined' &&
      (window as any).__STORE_DEBUG__ &&
      cleanedCount > 0
    ) {
      console.log(
        `🧹 Cleaned up ${cleanedCount} unused selector cache entries`
      );
    }
  }

  // Periodic cleanup (only in browser environment)
  if (typeof window !== 'undefined') {
    const cleanupInterval = setInterval(cleanupSelectorCache, 60000); // Every minute

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(cleanupInterval);
      globalSelectorCache.clear();
      activeSelectorKeys.clear();
    });
  }

  // Create event map
  const events: EventMap = new Map();

  // Create a batcher for update batching
  const {
    batch,
    shouldNotify,
    getBatchedActions,
    addBatchedAction,
    isBatching
  } = createBatcher();

  // Create a deep reactive proxy that detects all mutations (permanent, not recreated)
  const statesProxy = createReactiveProxy(
    states,
    (target, key, newValue, oldValue) => {
      // Increment state version when any mutation occurs (for cache invalidation)
      stateVersion++;

      // For async mutations, notify immediately (unless explicitly suppressed)
      if (!suppressProxyNotifications) {
        scheduleNotification();
      }
    }
  );

  // DevTools setup
  let devTools: DevTools | null = null;
  let pauseDevTools = false;

  // Microtask batching for performance
  let microtaskScheduled = false;
  let pendingDevToolsActions: { type: string; payload: any }[] = [];

  // Setup DevTools if enabled
  if (typeof window !== 'undefined' && props.config?.devtools) {
    const w = window as unknown as {
      __REDUX_DEVTOOLS_EXTENSION__?: DevTools;
    };
    const devToolsExtension = w.__REDUX_DEVTOOLS_EXTENSION__;
    const devToolsName = props.config?.name || 'Store';
    if (devToolsExtension) {
      devTools = devToolsExtension.connect({
        name: devToolsName,
        trace: true,
        traceLimit: 25,
        features: {
          jump: true,
          skip: true,
          reorder: true,
          dispatch: true,
          persist: true
        },
        instanceId: devToolsName
      });
      devTools?.init(states);
      devTools?.subscribe((message) => {
        if (message.type === 'DISPATCH') {
          switch (message.payload.type) {
            case 'JUMP_TO_ACTION':
            case 'JUMP_TO_STATE':
              try {
                const newState = JSON.parse(message.state || '{}');
                pauseDevTools = true;
                // Update state in place to maintain proxy reference
                Object.keys(states).forEach((key) => delete states[key]);
                Object.assign(states, newState);
                stateVersion++;
                notifySubscribers();
                pauseDevTools = false;
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to parse jump state:', error);
              }
              break;
            case 'RESET':
              reset();
              break;
          }
        }
      });
    }
  }

  // Event management functions
  function trigger<TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ) {
    const eventCallbacks = events.get(eventName as string);
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => {
        callback(payload);
      });
    }
  }

  function on<TEventName extends keyof TEvents>(
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ): EventListener {
    if (!events.has(eventName as string)) {
      events.set(eventName as string, new Set());
    }
    const eventCallbacks = events.get(eventName as string)!;
    const typedCallback = callback as EventCallback;
    eventCallbacks.add(typedCallback);

    return {
      off: () => {
        eventCallbacks.delete(typedCallback);
      }
    };
  }

  // Invalidate function for cached selectors
  function invalidate(selectorName: keyof TSelectors) {
    const selectorNameStr = String(selectorName);

    if (!isCachedSelector(selectorNameStr)) {
      return; // Only cached selectors can be invalidated
    }

    // Remove all cache entries for this selector
    const keysToRemove: string[] = [];
    for (const cacheKey of persistentSelectorCache.keys()) {
      if (extractSelectorName(cacheKey) === selectorNameStr) {
        keysToRemove.push(cacheKey);
      }
    }

    keysToRemove.forEach((key) => persistentSelectorCache.delete(key));

    // Increment state version to trigger React re-renders for affected components
    // This is necessary even though we're only invalidating cache, because React
    // needs to detect that something changed to re-run the selector
    stateVersion++;

    // Re-compute and cache the selector with no arguments (base case)
    if (selectors[selectorName]) {
      try {
        const baseResult = (selectors[selectorName] as any)();
        const baseCacheKey = createSelectorCacheKey(selectorNameStr, []);

        persistentSelectorCache.set(baseCacheKey, {
          result: baseResult,
          stateVersion,
          lastUsed: Date.now(),
          computeCount: 1
        });

        activeSelectorKeys.add(baseCacheKey);
      } catch {
        // Selector might require arguments, skip base case computation
      }
    }

    // Force notification to update React components
    // This ensures that components using this cached selector will re-render
    scheduleNotification();
  }

  // Initialize actions and selectors with provided functions or empty objects
  const actionProxy =
    (props?.actions as unknown as TActions) || ({} as TActions);
  const selectorProxy =
    (props?.selectors as unknown as TSelectors) || ({} as TSelectors);

  const actions = props.actions
    ? props.actions({
        states: statesProxy,
        actions: actionProxy,
        selectors: selectorProxy,
        trigger,
        notify: () => {
          // Force immediate notification for async operations
          // Increment state version to bust selector cache and force immediate updates
          stateVersion++;
          notifySubscribers();
        },
        invalidate
      })
    : ({} as TActions);

  const selectors = props.selectors
    ? props.selectors({
        states: statesProxy,
        selectors: selectorProxy
      })
    : ({} as TSelectors);

  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // Subscribers for reactivity with memoization
  const subscriberMap = new Map<
    number,
    {
      selector: (state: TState) => unknown;
      callback: () => void;
      lastValue: unknown;
      memoizedSelector?: (state: TState) => unknown;
      lastStateVersion?: number; // Track state version for whole state subscriptions
    }
  >();
  let nextSubscriberId = 0;

  const selectorCache = new WeakMap();

  function getState() {
    return states;
  }

  function memoizeSelector<T>(
    selector: (state: TState) => T
  ): (state: TState) => T {
    // Return a memoized version of the selector using stateVersion for better performance
    return (state: TState) => {
      const cache = selectorCache.get(selector);

      if (!cache || cache.lastStateVersion !== stateVersion) {
        // If no cache entry or state version changed, compute the result
        const result = selector(state);
        selectorCache.set(selector, {
          lastStateVersion: stateVersion,
          lastResult: result
        });
        return result;
      }

      return cache.lastResult as T;
    };
  }

  function subscribe(
    callback: () => void,
    selector?: (state: TState) => unknown
  ) {
    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: TState) => s);

    // Only memoize selectors that actually transform the state
    // For entire store subscriptions (no selector), don't memoize to avoid cache issues
    const shouldMemoize = selector !== undefined;
    const memoizedSelector = shouldMemoize
      ? memoizeSelector(initialSelector)
      : undefined;
    const initialValue = memoizedSelector
      ? memoizedSelector(getState())
      : initialSelector(getState());

    // Track per-selector subscriptions for cached selectors
    if (selector && typeof selector === 'function') {
      // Try to extract selector name from the wrapped selector function
      const selectorStr = selector.toString();
      for (const selectorName of Object.keys(selectors)) {
        if (
          selectorStr.includes(selectorName) &&
          isCachedSelector(selectorName)
        ) {
          if (!selectorSubscribers.has(selectorName)) {
            selectorSubscribers.set(selectorName, new Set());
          }
          selectorSubscribers.get(selectorName)!.add(callback);
          break;
        }
      }
    }

    subscriberMap.set(id, {
      selector: initialSelector,
      memoizedSelector,
      callback,
      lastValue: initialValue,
      lastStateVersion: shouldMemoize ? undefined : stateVersion // Track version for whole state subs
    });

    return () => {
      subscriberMap.delete(id);

      // Clean up per-selector subscriptions
      if (selector && typeof selector === 'function') {
        const selectorStr = selector.toString();
        for (const selectorName of Object.keys(selectors)) {
          if (
            selectorStr.includes(selectorName) &&
            isCachedSelector(selectorName)
          ) {
            selectorSubscribers.get(selectorName)?.delete(callback);
            break;
          }
        }
      }
    };
  }

  // Optimized notification with microtask batching
  function scheduleNotification() {
    if (!microtaskScheduled) {
      microtaskScheduled = true;
      queueMicrotask(() => {
        notifySubscribers();
        microtaskScheduled = false;
      });
    }
  }

  function notifySubscribers() {
    // CRITICAL: Update all selector caches FIRST before notifying subscribers
    // This ensures all predefined selectors run only once per state change
    updateGlobalSelectorCaches();

    const currentState = getState();

    // Use for-of loop directly on Map.values() for better performance
    for (const sub of subscriberMap.values()) {
      const selector = sub.memoizedSelector || sub.selector;
      const newValue = selector(currentState);

      let hasChanged = false;

      if (sub.memoizedSelector) {
        // For specific selectors, use deep equality
        hasChanged = !isDeepEqual(newValue, sub.lastValue);
      } else {
        // For entire store subscriptions, use stateVersion tracking
        hasChanged = sub.lastStateVersion !== stateVersion;
        sub.lastStateVersion = stateVersion;
      }

      if (hasChanged) {
        sub.lastValue = newValue;
        sub.callback();
      }
    }
  }

  function notify() {
    notifySubscribers();
  }

  // Optimized DevTools with deferred sending
  function scheduleDevTools(actionInfo: { type: string; payload: any }) {
    if (devTools && !pauseDevTools) {
      pendingDevToolsActions.push(actionInfo);

      if (!microtaskScheduled) {
        queueMicrotask(() => {
          if (pendingDevToolsActions.length === 1) {
            // Single action - send directly
            devTools!.send(pendingDevToolsActions[0], states);
          } else if (pendingDevToolsActions.length > 1) {
            // Multiple actions - send as batch
            devTools!.send(
              {
                type: 'MICROTASK_BATCH',
                payload: pendingDevToolsActions
              },
              states
            );
          }
          pendingDevToolsActions = [];
        });
      }
    }
  }

  // Create dispatch functions
  const createDispatchObject = () =>
    Object.keys(actions).reduce((acc, actionKey) => {
      acc[actionKey] = (...args: AnyType[]) => {
        const cb = actions[actionKey];
        const actionInfo = { type: String(actionKey), payload: args };

        // Suppress proxy notifications during sync action execution
        suppressProxyNotifications = true;

        // Execute the action with all arguments
        const result = (cb as any)(...args);

        // For sync actions, update state object in place to maintain proxy reference
        // For async actions, let the deep proxy handle everything
        if (!isBatching() && !(result instanceof Promise)) {
          const clonedState = deepClone(states);
          // Clear and update the existing states object instead of reassigning
          Object.keys(states).forEach((key) => delete states[key]);
          Object.assign(states, clonedState);
          stateVersion++;
        }

        // Re-enable proxy notifications after sync action completes
        if (!(result instanceof Promise)) {
          suppressProxyNotifications = false;
        } else {
          // For async actions, re-enable immediately so proxy can handle async mutations
          suppressProxyNotifications = false;
        }

        if (result instanceof Promise) {
          // For async actions, handle the promise properly
          return result
            .then((finalResult) => {
              // Deep proxy handles notifications automatically - just handle DevTools
              scheduleDevTools(actionInfo);
              return finalResult;
            })
            .catch((error) => {
              // Deep proxy handles notifications automatically - just handle DevTools
              scheduleDevTools({
                type: `${actionInfo.type}_ERROR`,
                payload: { ...actionInfo.payload, error: error.message }
              });
              throw error;
            });
        }

        // Handle DevTools for batched vs non-batched actions
        if (isBatching()) {
          // Collect action for batch DevTools message
          addBatchedAction(actionInfo);
        } else {
          // Use optimized DevTools scheduling for non-batched actions
          scheduleDevTools(actionInfo);
        }

        // Only notify if should notify (action always marks state as changed)
        if (shouldNotify()) {
          scheduleNotification();
        }

        return result;
      };
      return acc;
    }, {} as AnyType);

  const dispatchObject = createDispatchObject();

  // Run multiple actions in a batch with a single notification at the end
  function batchActions(callback: () => void) {
    batch(
      () => {
        callback();
        // Update state in place at the end of batch to maintain proxy reference
        const clonedState = deepClone(states);
        Object.keys(states).forEach((key) => delete states[key]);
        Object.assign(states, clonedState);
        stateVersion++;
      },
      () => {
        // Send batched actions to DevTools as a single group
        if (devTools && !pauseDevTools) {
          const batchedActionsList = getBatchedActions();
          if (batchedActionsList.length > 0) {
            devTools.send(
              {
                type: 'BATCH',
                payload: batchedActionsList
              },
              states
            );
          }
        }

        // Always notify after batch
        notifySubscribers();
      }
    );
  }

  // Reset function
  function reset() {
    const prevStates = deepClone(states);
    const resetState = deepClone(initialStates);
    // Update state in place to maintain proxy reference
    Object.keys(states).forEach((key) => delete states[key]);
    Object.assign(states, resetState);
    stateVersion++;
    events.clear(); // Clear all events on reset

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'RESET' }, states);
    }

    if (!isDeepEqual(prevStates, states)) {
      notifySubscribers();
    }
  }

  // Get with function overloading and memoization
  function get(): TState;
  function get<T>(selector: (state: TState) => T): T;
  function get<T>(selector?: (state: TState) => T): TState | T {
    if (!selector) return getState();

    // Use memoized selector for better performance
    const memoizedSel = memoizeSelector(selector);
    return memoizedSel(getState());
  }

  // Create wrapped selector functions for the "get" object
  const wrappedGetSelectors = Object.keys(selectors).reduce(
    (acc, key) => {
      // Create a wrapper function that calls the original selector
      acc[key] = function (...args: any) {
        const cacheKey = createSelectorCacheKey(key, args);
        const cache = getSelectorCache(key);

        // For cached selectors, check if cache exists regardless of state version
        // For regular selectors, check state version too
        const cached = cache.get(cacheKey);
        const isCached = isCachedSelector(key);

        if (cached && (isCached || cached.stateVersion === stateVersion)) {
          cached.lastUsed = Date.now();
          return cached.result;
        }

        // Fallback to direct computation and cache the result
        const result = (selectors[key as keyof TSelectors] as any)(...args);

        cache.set(cacheKey, {
          result,
          stateVersion: isCached
            ? cached?.stateVersion || stateVersion
            : stateVersion,
          lastUsed: Date.now(),
          computeCount: (cached?.computeCount || 0) + 1
        });

        activeSelectorKeys.add(cacheKey);

        return result;
      };

      return acc;
    },
    {} as Record<string, any>
  );

  Object.assign(get, wrappedGetSelectors);

  // Use with React hooks and optimized subscriptions
  function use(): TState;
  function use<T>(selector: (state: TState) => T): T;
  function use<T extends unknown[]>(selector: (state: TState) => T): T;
  function use<T>(selector?: (state: TState) => T): TState | T {
    const stateVersionRef = useRef(stateVersion);
    const selectorRef = useRef(selector);

    // Memoize the selector function to prevent unnecessary recalculations
    const memoizedSelector = useMemo(
      () => (selector ? memoizeSelector(selector) : undefined),
      [selector]
    );

    const valueRef = useRef<T | TState>(
      memoizedSelector ? memoizedSelector(getState()) : getState()
    );

    // Update references if selector changes
    if (selector !== selectorRef.current) {
      selectorRef.current = selector;
      stateVersionRef.current = stateVersion;
      valueRef.current = memoizedSelector
        ? (memoizedSelector(getState()) as T | TState)
        : getState();
    }

    const subscribeFn = useCallback(
      (callback: () => void) => {
        return subscribe(callback, selector);
      },
      [selector]
    );

    const getSnapshot = useCallback(() => {
      const currentStateVersion = stateVersion;
      const hasStateChanged = currentStateVersion !== stateVersionRef.current;

      if (hasStateChanged || !valueRef.current) {
        stateVersionRef.current = currentStateVersion;
        const currentState = getState();

        if (memoizedSelector) {
          // For selectors, use the memoized result
          valueRef.current = memoizedSelector(currentState) as T | TState;
        } else {
          // For whole state, create a new object to ensure React detects the change
          valueRef.current = { ...currentState } as T | TState;
        }
      }

      return valueRef.current;
    }, [memoizedSelector]);

    return useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot);
  }

  // Create wrapped selector functions for the "use" object
  const wrappedSelectors = Object.keys(selectors).reduce(
    (acc, key) => {
      // Create a wrapper function that calls the original selector
      acc[key] = function (...args: any) {
        const cacheKey = createSelectorCacheKey(key, args);
        const cache = getSelectorCache(key);
        const isCached = isCachedSelector(key);

        // Register this selector as actively used for pre-computation
        activeSelectorKeys.add(cacheKey);

        // Create a wrapper that uses the appropriate cache
        const wrappedSelector = (_state: TState) => {
          // Check cache first (persistent cache for cached selectors, regular cache for others)
          const cached = cache.get(cacheKey);

          if (cached && (isCached || cached.stateVersion === stateVersion)) {
            cached.lastUsed = Date.now();
            return cached.result;
          }

          // Fallback computation if cache miss
          const result = (selectors[key as keyof TSelectors] as any)(...args);

          cache.set(cacheKey, {
            result,
            stateVersion: isCached
              ? cached?.stateVersion || stateVersion
              : stateVersion,
            lastUsed: Date.now(),
            computeCount: (cached?.computeCount || 0) + 1
          });

          return result;
        };

        return use(wrappedSelector);
      };

      return acc;
    },
    {} as Record<string, any>
  );

  Object.assign(use, wrappedSelectors);

  return {
    dispatch: dispatchObject as unknown as TActions,
    use: use as typeof use & TSelectors,
    get: get as typeof get & TSelectors,
    reset,
    batch: batchActions,
    on
  };
}

export function createScopedStore<
  TState extends Record<string, unknown> = AnyType,
  TActions extends Record<string, StoreActionFunction<AnyType>> = AnyType,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<AnyType, AnyType>
  > = AnyType,
  TEvents extends Record<string, unknown> = Record<string, unknown>
>(props: StoreProps<TState, TActions, TSelectors, TEvents>) {
  type StoreType = InferStore<TState, TActions, TSelectors, TEvents>;

  const StoreContext = createContext<StoreType | null>(null);

  const Provider = ({ children }: { children: React.ReactNode }) => {
    const store = useMemo(
      () => createStore<TState, TActions, TSelectors, TEvents>(props),
      []
    );

    // Clean up when the component unmounts
    useEffect(() => {
      return () => {
        store.reset();
      };
    }, [store]);

    return createElement(
      StoreContext.Provider,
      { value: store },
      children as any
    );
  };

  function useStore(): StoreType {
    const context = useContext(StoreContext);
    if (!context) {
      throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
  }

  return { Provider, useStore };
}
