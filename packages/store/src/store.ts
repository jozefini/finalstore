'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import {
  AnyType,
  cache,
  CacheWrapper,
  createDevToolsIntegration,
  createEventSystem,
  EventPayload,
  isCacheWrapper,
  LRUCache,
  PriorityScheduler,
  SelectorCacheEntry,
  SetFunction,
  Signal,
  StructuralNode,
  withDependencyTracking
} from './shared';

// Types
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
    const { result, dependencies } = withDependencyTracking(fn);

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
    selectorDependencies.set(selectorName, dependencies);

    // Subscribe to signals
    for (const signal of dependencies) {
      let selectors = signalToSelectors.get(signal);
      if (!selectors) {
        selectors = new Set();
        signalToSelectors.set(signal, selectors);
      }
      selectors.add(selectorName);
    }

    return result;
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
  const { trigger, on, clear: clearEvents } = createEventSystem<TEvents>();

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
  const devToolsIntegration = props.config?.devtools
    ? createDevToolsIntegration({
        name: props.config.name || 'Store',
        onJump: (newState) => {
          // Update state using the structural sharing system
          currentStateNode = new StructuralNode(newState);
          stateVersion++;

          // CRITICAL: Clear all selector caches during DevTools time-travel
          globalSelectorCache.clear();
          persistentSelectorCache.clear();

          // Optional: Log cache clearing in development
          if (
            typeof window !== 'undefined' &&
            (window as AnyType).__STORE_DEBUG__
          ) {
            console.log(
              '🔄 DevTools: Cleared all selector caches for time-travel'
            );
          }

          // Notify subscribers of the state change
          scheduler.scheduleNormal(() => {
            notifySubscribers();
          });
        },
        onReset: () => {
          scheduler.scheduleNormal(() => {
            currentStateNode = new StructuralNode(
              initialStates as Record<string, AnyType>
            );
            stateVersion++;
            clearEvents();

            // Clear all selector caches on reset as well
            globalSelectorCache.clear();
            persistentSelectorCache.clear();

            // Optional: Log cache clearing in development
            if (
              typeof window !== 'undefined' &&
              (window as AnyType).__STORE_DEBUG__
            ) {
              console.log('🔄 DevTools: Cleared all selector caches for reset');
            }

            notifySubscribers();
          });
        },
        getState: () => currentStateNode.getData()
      })
    : null;

  // DevTools action tracking
  let isBatchingDevTools = false;
  let batchedDevToolsActions: { type: string; payload: AnyType }[] = [];

  function sendToDevTools(actionInfo: { type: string; payload: AnyType }) {
    if (devToolsIntegration) {
      if (isBatchingDevTools) {
        batchedDevToolsActions.push(actionInfo);
      } else {
        scheduler.scheduleNormal(() => {
          devToolsIntegration.send(actionInfo);
        });
      }
    }
  }

  function sendBatchToDevTools(actions: { type: string; payload: AnyType }[]) {
    if (devToolsIntegration && actions.length > 0) {
      scheduler.scheduleNormal(() => {
        if (actions.length === 1) {
          devToolsIntegration.send(actions[0]);
        } else {
          devToolsIntegration.send({
            type: 'BATCH',
            payload: actions
          });
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
      clearEvents();
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
