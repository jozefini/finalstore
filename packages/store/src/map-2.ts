'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import {
  AnyType,
  cache,
  CacheWrapper,
  createDevToolsIntegration,
  isCacheWrapper,
  LRUCache,
  PriorityScheduler,
  SelectorCacheEntry,
  SetFunction,
  StructuralNode
} from './shared';

// Types
type MapActionsContext<TState, TActions, TSelectors> = (context: {
  set: SetFunction<TState>;
  get: () => TState;
  actions: TActions;
  selectors: TSelectors;
  clearCache: (selectorName: keyof TSelectors | (keyof TSelectors)[]) => void;
}) => TActions;

type MapSelectorsContext<TState, TSelectors> = (context: {
  get: () => TState;
  selectors: TSelectors;
  cache: <T>(fn: (...args: AnyType[]) => T) => CacheWrapper<T>;
}) => {
  [K in keyof TSelectors]: TSelectors[K] | CacheWrapper<AnyType>;
};

type MapProps<TState, TActions, TSelectors> = {
  map?: Map<string, TState>;
  defaultStates: TState;
  actions?: MapActionsContext<TState, TActions, TSelectors>;
  selectors?: MapSelectorsContext<TState, TSelectors>;
  config?: {
    name?: string;
    devtools?: boolean;
    cacheSize?: number;
  };
};

type MapActionFunction<TPayload = undefined> = TPayload extends undefined
  ? () => unknown | Promise<unknown>
  : (payload: TPayload) => unknown | Promise<unknown>;

type MapSelectorFunction<
  TResult,
  TPayload = undefined
> = TPayload extends undefined ? () => TResult : (payload: TPayload) => TResult;

type InferMap<TState, TActions, TSelectors> = {
  clear: () => void;
  reset: () => void;
  getSize: () => number;
  getKeys: () => string[];
  useSize: () => number;
  useKeys: () => string[];
  batch: (callback: () => void) => void;
  key: (key: string) => {
    dispatch: TActions;
    remove: () => void;
    set: (state: TState) => void;
    get: {
      (): TState | undefined;
      <T>(selector: (state: TState) => T): T | undefined;
    } & TSelectors;
    use: {
      (): TState | undefined;
      <T>(selector: (state: TState) => T): T | undefined;
    } & TSelectors;
  };
};

// Main map implementation
export function createMap<
  TState extends Record<string, unknown> = AnyType,
  TActions extends Record<string, MapActionFunction<AnyType>> = AnyType,
  TSelectors extends Record<
    string,
    MapSelectorFunction<AnyType, AnyType>
  > = AnyType
>(
  props: MapProps<TState, TActions, TSelectors>
): InferMap<TState, TActions, TSelectors> {
  // Map state management with structural sharing per key
  const initialMap = props.map || new Map<string, TState>();
  const defaultStates = props.defaultStates;
  const mapStates = new Map<string, StructuralNode>();
  const mapVersions = new Map<string, number>();
  let globalVersion = 0;

  // Initialize map with structural nodes
  for (const [key, state] of initialMap) {
    mapStates.set(key, new StructuralNode(state as Record<string, AnyType>));
    mapVersions.set(key, 0);
  }

  // Initialize cached values
  let cachedSize = mapStates.size;
  let cachedKeys: string[] = Array.from(mapStates.keys());
  let keysVersion = 0;

  function updateCachedValues(): void {
    cachedSize = mapStates.size;
    cachedKeys = Array.from(mapStates.keys());
    keysVersion++;
  }

  // Enhanced caching system per key
  const cacheSize = props.config?.cacheSize || 1000;
  const globalSelectorCache = new LRUCache<string, SelectorCacheEntry>(
    cacheSize
  );
  const persistentSelectorCache = new LRUCache<string, SelectorCacheEntry>(
    cacheSize * 2
  );

  // Priority scheduler
  const scheduler = new PriorityScheduler();

  // Detect cached selectors
  const cachedSelectorNames = new Set<string>();

  if (props.selectors) {
    const tempSelectors = props.selectors({
      get: () => defaultStates,
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
    key: string,
    selectorName: string,
    fn: () => T,
    args: AnyType[] = []
  ): T {
    const isCached = isCachedSelector(selectorName);
    const cacheKey = `${key}:${selectorName}:${JSON.stringify(args)}`;

    if (isCached) {
      // For cached selectors, use the cache system
      const cache = getSelectorCache(selectorName);
      const cached = cache.get(cacheKey);

      // Check if cached result is still valid
      if (cached?.isValid) {
        cached.lastUsed = Date.now();
        return cached.result;
      }

      // Execute and cache the result
      const result = fn();

      cache.set(cacheKey, {
        result,
        lastUsed: Date.now(),
        computeCount: (cached?.computeCount || 0) + 1,
        isValid: true
      });

      return result;
    }

    // For non-cached selectors, always execute fresh
    return fn();
  }

  // Initialize selectors
  const selectors = {} as TSelectors;

  if (props.selectors) {
    const selectorDefinitions = props.selectors({
      get: () => defaultStates,
      selectors: selectors,
      cache
    });

    for (const [key, selectorDef] of Object.entries(selectorDefinitions)) {
      if (isCacheWrapper(selectorDef)) {
        selectors[key as keyof TSelectors] = ((...args: AnyType[]) =>
          selectorDef.fn(...args)) as AnyType;
      } else {
        selectors[key as keyof TSelectors] = selectorDef;
      }
    }
  }

  // Subscriber management per key
  const subscribers = new Map<
    string,
    Map<number, { callback: () => void; selector?: (state: TState) => AnyType }>
  >();
  const globalSubscribers = new Map<
    number,
    { callback: () => void; type: 'size' | 'keys' }
  >();
  let nextSubscriberId = 0;

  function subscribeToKey(
    key: string,
    callback: () => void,
    selector?: (state: TState) => AnyType
  ): () => void {
    if (!subscribers.has(key)) {
      subscribers.set(key, new Map());
    }

    const keySubscribers = subscribers.get(key)!;
    const id = nextSubscriberId++;
    keySubscribers.set(id, { callback, selector });

    return () => {
      const subs = subscribers.get(key);
      if (subs) {
        subs.delete(id);
        if (subs.size === 0) {
          subscribers.delete(key);
        }
      }
    };
  }

  function subscribeToGlobal(
    callback: () => void,
    type: 'size' | 'keys'
  ): () => void {
    const id = nextSubscriberId++;
    globalSubscribers.set(id, { callback, type });
    return () => globalSubscribers.delete(id);
  }

  function notifyKeySubscribers(key: string): void {
    const keySubscribers = subscribers.get(key);
    if (!keySubscribers) return;

    for (const { callback } of keySubscribers.values()) {
      scheduler.scheduleNormal(callback);
    }
  }

  function notifyGlobalSubscribers(type: 'size' | 'keys'): void {
    for (const { callback, type: subType } of globalSubscribers.values()) {
      if (subType === type) {
        scheduler.scheduleNormal(callback);
      }
    }
  }

  // Clear cache function
  const clearCache = (
    key: string,
    selectorNames: keyof TSelectors | (keyof TSelectors)[]
  ): void => {
    const names = Array.isArray(selectorNames)
      ? selectorNames
      : [selectorNames];

    scheduler.scheduleHigh(() => {
      for (const name of names) {
        const cache = getSelectorCache(String(name));
        const keysToDelete: string[] = [];
        for (const [cacheKey] of cache.entries()) {
          if (
            typeof cacheKey === 'string' &&
            cacheKey.startsWith(`${key}:${String(name)}:`)
          ) {
            keysToDelete.push(cacheKey);
          }
        }
        keysToDelete.forEach((cacheKey) => cache.delete(cacheKey));
      }
    });
  };

  // DevTools integration
  const getDevToolsState = () => {
    const result: Record<string, AnyType> = {};
    for (const [key, node] of mapStates) {
      result[key] = node.getData();
    }
    return result;
  };

  const devToolsIntegration = props.config?.devtools
    ? createDevToolsIntegration({
        name: props.config.name || 'Map',
        onJump: (newState) => {
          // Update map states
          mapStates.clear();
          mapVersions.clear();
          globalVersion++;

          for (const [key, state] of Object.entries(newState)) {
            mapStates.set(
              key,
              new StructuralNode(state as Record<string, AnyType>)
            );
            mapVersions.set(key, globalVersion);
          }

          // Clear all selector caches during DevTools time-travel
          globalSelectorCache.clear();
          persistentSelectorCache.clear();

          // Notify all subscribers
          scheduler.scheduleNormal(() => {
            for (const key of mapStates.keys()) {
              notifyKeySubscribers(key);
            }
            notifyGlobalSubscribers('size');
            notifyGlobalSubscribers('keys');
          });
        },
        onReset: () => reset(),
        getState: getDevToolsState
      })
    : null;

  function sendToDevTools(actionInfo: { type: string; payload: AnyType }) {
    if (devToolsIntegration) {
      scheduler.scheduleNormal(() => {
        devToolsIntegration.send(actionInfo);
      });
    }
  }

  // Map operations
  function setKey(key: string, state: TState): void {
    const hadKey = mapStates.has(key);
    const newNode = new StructuralNode(state as Record<string, AnyType>);

    mapStates.set(key, newNode);
    mapVersions.set(key, ++globalVersion);

    sendToDevTools({ type: 'SET_KEY', payload: { key, state } });

    notifyKeySubscribers(key);
    if (!hadKey) {
      updateCachedValues();
      notifyGlobalSubscribers('size');
      notifyGlobalSubscribers('keys');
    }
  }

  function removeKey(key: string): void {
    const hadKey = mapStates.delete(key);
    mapVersions.delete(key);

    if (hadKey) {
      globalVersion++;
      updateCachedValues();
      sendToDevTools({ type: 'REMOVE_KEY', payload: { key } });
      notifyKeySubscribers(key);
      notifyGlobalSubscribers('size');
      notifyGlobalSubscribers('keys');
    }
  }

  function clear(): void {
    const hadKeys = mapStates.size > 0;
    const keysToNotify = Array.from(mapStates.keys());

    mapStates.clear();
    mapVersions.clear();
    globalVersion++;

    if (hadKeys) {
      updateCachedValues();
      sendToDevTools({ type: 'CLEAR', payload: null });

      for (const key of keysToNotify) {
        notifyKeySubscribers(key);
      }
      notifyGlobalSubscribers('size');
      notifyGlobalSubscribers('keys');
    }
  }

  function reset(): void {
    const hadKeys = mapStates.size > 0;
    const keysToNotify = Array.from(mapStates.keys());

    mapStates.clear();
    mapVersions.clear();
    globalVersion++;

    // Restore initial map
    for (const [key, state] of initialMap) {
      mapStates.set(key, new StructuralNode(state as Record<string, AnyType>));
      mapVersions.set(key, globalVersion);
    }

    updateCachedValues();
    sendToDevTools({ type: 'RESET', payload: null });

    // Notify all affected keys
    const allKeys = new Set([...keysToNotify, ...initialMap.keys()]);
    for (const key of allKeys) {
      notifyKeySubscribers(key);
    }
    notifyGlobalSubscribers('size');
    notifyGlobalSubscribers('keys');
  }

  function getSize(): number {
    return mapStates.size;
  }

  function getKeys(): string[] {
    return Array.from(mapStates.keys());
  }

  function getCachedSize(): number {
    return cachedSize;
  }

  function getCachedKeys(): string[] {
    return cachedKeys;
  }

  // Reactive subscriptions for global map state
  const subscribeSize = (callback: () => void) => {
    const id = Symbol();
    globalSubscribers.set(id, { callback, type: 'size' });
    return () => globalSubscribers.delete(id);
  };

  const subscribeKeys = (callback: () => void) => {
    const id = Symbol();
    globalSubscribers.set(id, { callback, type: 'keys' });
    return () => globalSubscribers.delete(id);
  };

  function useSize(): number {
    return useSyncExternalStore(subscribeSize, getCachedSize, getCachedSize);
  }

  function useKeys(): string[] {
    return useSyncExternalStore(subscribeKeys, getCachedKeys, getCachedKeys);
  }

  // Batch operations
  function batch(callback: () => void): void {
    scheduler.enterBatch();
    try {
      callback();
    } finally {
      scheduler.exitBatch();
    }
  }

  // Key interface
  function key(keyId: string) {
    // Create reactive proxy for state mutations
    function createStateProxy(node: StructuralNode): TState {
      return new Proxy({} as TState, {
        get(_, prop) {
          const propPath = String(prop);
          return node.get(propPath);
        },
        set(_, prop, value) {
          const propPath = String(prop);
          const newNode = node.set(propPath, value);

          if (newNode !== node) {
            mapStates.set(keyId, newNode);
            mapVersions.set(keyId, ++globalVersion);

            scheduler.scheduleNormal(() => {
              notifyKeySubscribers(keyId);
            });
          }

          return true;
        }
      });
    }

    // Get current state
    const getCurrentState = (): TState | undefined => {
      const node = mapStates.get(keyId);
      if (!node) return undefined;
      return createStateProxy(node);
    };

    // Set function for actions
    const setState: SetFunction<TState> = (updater) => {
      const node = mapStates.get(keyId);
      if (!node) return;

      const proxy = createStateProxy(node);
      updater(proxy);
    };

    // Initialize actions for this key
    const dispatch = {} as TActions;

    if (props.actions) {
      const actionCreators = props.actions({
        set: setState,
        get: getCurrentState as () => TState,
        actions: dispatch,
        selectors,
        clearCache: (selectorNames) => clearCache(keyId, selectorNames)
      });

      // Wrap actions with DevTools tracking
      const wrappedActions = {} as TActions;
      for (const [actionName, actionFn] of Object.entries(actionCreators)) {
        wrappedActions[actionName as keyof TActions] = ((
          ...args: AnyType[]
        ) => {
          const actionInfo = {
            type: `${actionName}@${keyId}`,
            payload: args.length === 1 ? args[0] : args
          };

          const result = (actionFn as AnyType)(...args);

          if (result instanceof Promise) {
            return result
              .then((finalResult) => {
                sendToDevTools(actionInfo);
                return finalResult;
              })
              .catch((error) => {
                sendToDevTools({
                  type: `${actionName}@${keyId}_ERROR`,
                  payload: { ...actionInfo.payload, error: error.message }
                });
                throw error;
              });
          } else {
            sendToDevTools(actionInfo);
            return result;
          }
        }) as AnyType;
      }

      Object.assign(dispatch, wrappedActions);
    }

    // Get function with selector support
    function get(): TState | undefined;
    function get<T>(selector: (state: TState) => T): T | undefined;
    function get<T>(selector?: (state: TState) => T): TState | T | undefined {
      const node = mapStates.get(keyId);
      if (!node) return undefined;

      const state = node.getData() as TState;
      if (!selector) return state;
      return selector(state);
    }

    // Use function with React hooks
    function use(): TState | undefined;
    function use<T>(selector: (state: TState) => T): T | undefined;
    function use<T>(selector?: (state: TState) => T): TState | T | undefined {
      const selectorRef = useRef(selector);
      const lastSnapshotRef = useRef<AnyType>(undefined);
      const lastVersionRef = useRef(-1);

      useEffect(() => {
        selectorRef.current = selector;
      }, [selector]);

      const subscribeFn = useCallback((callback: () => void) => {
        return subscribeToKey(keyId, callback, selectorRef.current);
      }, []);

      const getSnapshot = useCallback(() => {
        const currentVersion = mapVersions.get(keyId) || -1;
        const currentSelector = selectorRef.current;

        // Check if we can return cached snapshot
        if (
          lastVersionRef.current === currentVersion &&
          lastSnapshotRef.current !== undefined
        ) {
          return lastSnapshotRef.current;
        }

        const node = mapStates.get(keyId);
        if (!node) {
          lastVersionRef.current = currentVersion;
          lastSnapshotRef.current = undefined;
          return undefined;
        }

        let newSnapshot: AnyType;
        const state = node.getData() as TState;

        if (!currentSelector) {
          newSnapshot = state;
        } else {
          try {
            newSnapshot = currentSelector(state);
          } catch (error) {
            console.error('Selector error:', error);
            return lastSnapshotRef.current;
          }
        }

        lastVersionRef.current = currentVersion;
        lastSnapshotRef.current = newSnapshot;
        return newSnapshot;
      }, []);

      const getServerSnapshot = useCallback(() => {
        return undefined;
      }, []);

      return useSyncExternalStore(subscribeFn, getSnapshot, getServerSnapshot);
    }

    // Add selector methods to get/use
    const getSelectorMethods = {} as TSelectors;
    const useSelectorMethods = {} as TSelectors;

    // Create selectors with proper context for this specific key
    if (props.selectors) {
      const keySpecificSelectors = props.selectors({
        get: () => {
          const node = mapStates.get(keyId);
          return node ? (node.getData() as TState) : defaultStates;
        },
        selectors: {} as TSelectors,
        cache
      });

      for (const [selectorName, selectorDef] of Object.entries(
        keySpecificSelectors
      )) {
        // For get methods - direct execution
        getSelectorMethods[selectorName as keyof TSelectors] = ((
          ...args: AnyType[]
        ) => {
          const node = mapStates.get(keyId);
          if (!node) return undefined;

          return executeSelector(
            keyId,
            selectorName,
            () => {
              if (isCacheWrapper(selectorDef)) {
                return selectorDef.fn(...args);
              } else {
                return selectorDef(...args);
              }
            },
            args
          );
        }) as AnyType;

        // For use methods - must use the reactive use hook
        useSelectorMethods[selectorName as keyof TSelectors] = ((
          ...args: AnyType[]
        ) => {
          // Use the reactive use hook with a selector that calls the original selector
          return use((state: TState) => {
            // Create a fresh context for this call
            const freshContext = {
              get: () => state,
              selectors: {} as TSelectors,
              cache
            };

            // Re-create the selector with fresh context
            const freshSelectors = props.selectors!(freshContext);
            const freshSelectorDef = freshSelectors[selectorName];

            if (isCacheWrapper(freshSelectorDef)) {
              return freshSelectorDef.fn(...args);
            } else {
              return (freshSelectorDef as AnyType)(...args);
            }
          });
        }) as AnyType;
      }
    }

    Object.assign(get, getSelectorMethods);
    Object.assign(use, useSelectorMethods);

    return {
      dispatch,
      remove: () => removeKey(keyId),
      set: (state: TState) => setKey(keyId, state),
      get: get as typeof get & TSelectors,
      use: use as typeof use & TSelectors
    };
  }

  return {
    clear,
    reset,
    getSize,
    getKeys,
    useSize,
    useKeys,
    batch,
    key
  };
}
