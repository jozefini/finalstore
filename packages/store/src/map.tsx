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

type AnyType = any;

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

type StoreConfig = {
  name?: string;
  devtools?: boolean;
  disableOptimizations?: boolean;
};

type Subscriber<T> = {
  selector: (state: T) => unknown;
  callback: () => void;
  lastValue: unknown;
};

type MapSubscribers<States> = {
  byKey: Map<string, Map<number, Subscriber<States>>>;
  size: Map<number, Subscriber<number>>;
  keys: Map<number, Subscriber<string[]>>;
};

type MapSelectorFunction<TState, TPayload = void> = (
  state: TState,
  payload?: TPayload
) => unknown;

type ActionType = (...args: any[]) => any;
type SelectorType = (...args: any[]) => any;

type CreateMapProps<
  TState = any,
  TActions extends Record<string, ActionType> = Record<string, ActionType>,
  TSelectors extends Record<string, SelectorType> = Record<string, SelectorType>
> = {
  states: TState;
  actions?: (context: {
    states: TState;
    actions: TActions;
    selectors: TSelectors;
    map: InferMap<TState, TActions, TSelectors>;
  }) => TActions;
  selectors?: (context: {
    states: TState;
    selectors: TSelectors;
  }) => TSelectors;
  initialMap?: Map<string, TState>;
  config?: StoreConfig;
};

type MapSelectorMethods<TState, TSelectors> =
  TSelectors extends Record<string, never>
    ? Record<string, never>
    : {
        [K in keyof TSelectors]: TSelectors[K] extends MapSelectorFunction<
          TState,
          infer P
        >
          ? undefined extends P
            ? () => ReturnType<TSelectors[K]>
            : (payload: P) => ReturnType<TSelectors[K]>
          : never;
      };

type InferMap<
  TState = any,
  TActions extends Record<string, ActionType> = Record<string, ActionType>,
  TSelectors extends Record<string, SelectorType> = Record<string, SelectorType>
> = {
  clear: () => void;
  reset: () => void;
  useSize: () => number;
  useKeys: () => string[];
  getSize: () => number;
  getKeys: () => string[];
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

// Optimized batcher with microtask scheduling
const createBatcher = () => {
  let isBatching = false;
  let scheduledCallbacks: Set<() => void> | null = null;

  const batch = (fn: () => void, notify: () => void) => {
    if (!isBatching) {
      isBatching = true;
      scheduledCallbacks = new Set();

      try {
        fn();
      } finally {
        // Schedule notification in microtask for better performance
        const callbacks = scheduledCallbacks;
        scheduledCallbacks = null;
        isBatching = false;

        if (callbacks && callbacks.size > 0) {
          queueMicrotask(() => {
            callbacks.forEach((cb) => cb());
          });
        }
      }
    } else {
      fn();
      if (scheduledCallbacks) {
        scheduledCallbacks.add(notify);
      }
    }
  };

  const shouldNotify = () => !isBatching;

  return { batch, shouldNotify };
};

// Optimized equality check with early bailouts
const checkEquality = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const objA = a as Record<string, any>;
  const objB = b as Record<string, any>;

  // Use cached key arrays if available
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  // Optimized comparison loop
  for (const key of keysA) {
    if (!(key in objB) || objA[key] !== objB[key]) return false;
  }

  return true;
};

// Object pool for reusing state objects
class ObjectPool<T> {
  private pool: T[] = [];
  private maxSize: number;
  private create: () => T;

  constructor(create: () => T, maxSize = 100) {
    this.create = create;
    this.maxSize = maxSize;
  }

  acquire(): T {
    return this.pool.pop() || this.create();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
}

export function createMap<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TActions extends Record<string, ActionType> = Record<string, ActionType>,
  TSelectors extends Record<string, SelectorType> = Record<string, SelectorType>
>(
  props: CreateMapProps<TState, TActions, TSelectors>
): InferMap<TState, TActions, TSelectors> {
  const initialMap = props.initialMap
    ? new Map(props.initialMap)
    : new Map<string, TState>();

  let states = new Map<string, TState>(initialMap);
  const optimizationsDisabled = props.config?.disableOptimizations ?? false;

  // Performance optimizations
  const statePool = new ObjectPool(() => ({}) as TState);
  const notificationCache = new Map<string, number>();
  const selectorResultCache = new WeakMap<
    (state: TState) => unknown,
    Map<string, { version: number; result: any }>
  >();

  // State version tracking for efficient change detection
  let globalStateVersion = 0;
  const stateVersions = new Map<string, number>();

  // Optimized notification system using requestIdleCallback
  const pendingNotifications = new Map<string, Set<() => void>>();
  let notificationHandle: number | null = null;

  const scheduleNotifications = () => {
    if (notificationHandle !== null) return;

    if ('requestIdleCallback' in window && !optimizationsDisabled) {
      notificationHandle = requestIdleCallback(
        (deadline) => {
          processNotificationBatch(deadline);
        },
        { timeout: 16 } // Fallback to 16ms (60fps)
      );
    } else {
      notificationHandle = setTimeout(() => {
        processNotificationBatch();
      }, 0) as unknown as number;
    }
  };

  const processNotificationBatch = (deadline?: IdleDeadline) => {
    notificationHandle = null;
    const startTime = performance.now();
    const maxDuration = deadline ? deadline.timeRemaining() : 16;

    for (const [key, callbacks] of pendingNotifications.entries()) {
      if (performance.now() - startTime > maxDuration) {
        // Reschedule remaining notifications
        scheduleNotifications();
        break;
      }

      callbacks.forEach((callback) => callback());
      pendingNotifications.delete(key);
    }
  };

  // Create batcher for update batching
  const { batch, shouldNotify } = createBatcher();

  // DevTools setup (unchanged for compatibility)
  let devTools: DevTools | null = null;
  let pauseDevTools = false;

  if (typeof window !== 'undefined' && props.config?.devtools) {
    const w = window as unknown as {
      __REDUX_DEVTOOLS_EXTENSION__?: DevTools;
    };
    const devToolsExtension = w.__REDUX_DEVTOOLS_EXTENSION__;
    const devToolsName = props.config?.name || 'Map';
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
      devTools.init(Object.fromEntries(states));
      devTools.subscribe((message) => {
        if (message.type === 'DISPATCH') {
          switch (message.payload.type) {
            case 'JUMP_TO_ACTION':
            case 'JUMP_TO_STATE':
              try {
                const newState = JSON.parse(message.state || '{}');
                pauseDevTools = true;
                states = new Map(Object.entries(newState));
                notifyAllKeySubscribers();
                notifySizeSubscribers();
                notifyKeysSubscribers();
                pauseDevTools = false;
              } catch (error) {
                // console.error('Failed to parse jump state:', error)
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

  const subscribers: MapSubscribers<TState> = {
    byKey: new Map(),
    size: new Map(),
    keys: new Map()
  };
  let nextSubscriberId = 0;

  // Create proxies
  const mapProxy = {} as InferMap<TState, TActions, TSelectors>;
  const actionProxy = {} as TActions;
  const selectorProxy = {} as TSelectors;

  function createActionContext(state: TState) {
    const stateRef = { ...state };
    let hasChanged = false;

    const stateProxy = new Proxy({} as TState, {
      get: (_target, prop: string | symbol) => {
        return stateRef[prop as keyof TState];
      },
      set: (_target, prop: string | symbol, value) => {
        hasChanged = true;
        stateRef[prop as keyof TState] = value;
        return true;
      }
    });

    return {
      states: stateProxy,
      actions: actionProxy,
      selectors: selectorProxy,
      map: mapProxy,
      getState: () => ({ state: stateRef, hasChanged })
    };
  }

  const actions = props.actions
    ? props.actions(createActionContext(props.states))
    : ({} as TActions);

  const selectors = props.selectors
    ? props.selectors({
        states: props.states,
        selectors: selectorProxy
      })
    : ({} as TSelectors);

  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // Optimized subscription management
  function subscribeToKey(
    key: string,
    callback: () => void,
    selector?: (state: TState) => unknown
  ) {
    if (!subscribers.byKey.has(key)) {
      subscribers.byKey.set(key, new Map());
    }

    const keySubscribers = subscribers.byKey.get(key)!;
    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: TState) => s);
    const state = states.get(key);
    const initialValue = state ? initialSelector(state) : undefined;

    keySubscribers.set(id, {
      selector: initialSelector,
      callback,
      lastValue: initialValue
    });

    return () => {
      const subs = subscribers.byKey.get(key);
      if (subs) {
        subs.delete(id);
        if (subs.size === 0) {
          subscribers.byKey.delete(key);
        }
      }
    };
  }

  function subscribeToSize(callback: () => void) {
    const id = nextSubscriberId++;
    subscribers.size.set(id, {
      selector: () => states.size,
      callback,
      lastValue: states.size
    });

    return () => {
      subscribers.size.delete(id);
    };
  }

  function subscribeToKeys(callback: () => void) {
    const id = nextSubscriberId++;
    const initialKeys = Array.from(states.keys());

    subscribers.keys.set(id, {
      selector: () => Array.from(states.keys()),
      callback,
      lastValue: initialKeys
    });

    return () => {
      subscribers.keys.delete(id);
    };
  }

  // Optimized notification system
  function notifyAllKeySubscribers() {
    for (const [key, keySubscribers] of subscribers.byKey.entries()) {
      const callbacks = new Set<() => void>();
      for (const sub of keySubscribers.values()) {
        callbacks.add(sub.callback);
      }
      if (callbacks.size > 0) {
        pendingNotifications.set(key, callbacks);
      }
    }
    scheduleNotifications();
  }

  function notifyKeySubscribers(key: string) {
    const keySubscribers = subscribers.byKey.get(key);
    if (!keySubscribers || keySubscribers.size === 0) return;

    const state = states.get(key);
    if (!state) return;

    const callbacks = new Set<() => void>();
    const currentVersion = stateVersions.get(key) || 0;

    for (const sub of keySubscribers.values()) {
      const newValue = sub.selector(state);

      // Use version tracking for faster change detection
      if (!checkEquality(newValue, sub.lastValue)) {
        sub.lastValue = newValue;
        callbacks.add(sub.callback);
      }
    }

    if (callbacks.size > 0) {
      pendingNotifications.set(key, callbacks);
      scheduleNotifications();
    }
  }

  function notifySizeSubscribers() {
    const callbacks = new Set<() => void>();
    for (const sub of subscribers.size.values()) {
      const newValue = states.size;
      if (newValue !== sub.lastValue) {
        sub.lastValue = newValue;
        callbacks.add(sub.callback);
      }
    }
    if (callbacks.size > 0) {
      pendingNotifications.set('__size__', callbacks);
      scheduleNotifications();
    }
  }

  function notifyKeysSubscribers() {
    const currentKeys = Array.from(states.keys());
    const callbacks = new Set<() => void>();

    for (const sub of subscribers.keys.values()) {
      if (!checkEquality(currentKeys, sub.lastValue)) {
        sub.lastValue = currentKeys;
        callbacks.add(sub.callback);
      }
    }

    if (callbacks.size > 0) {
      pendingNotifications.set('__keys__', callbacks);
      scheduleNotifications();
    }
  }

  // Optimized map operations
  function set(key: string, state: TState) {
    const hadKey = states.has(key);

    // Increment version
    globalStateVersion++;
    stateVersions.set(key, globalStateVersion);

    // Reuse state object from pool when possible
    const newState = Object.assign(statePool.acquire(), props.states, state);
    const oldState = states.get(key);
    states.set(key, newState);

    // Release old state back to pool
    if (oldState) {
      Object.keys(oldState).forEach((k) => delete oldState[k]);
      statePool.release(oldState);
    }

    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'SET', payload: { key, state: newState } },
        Object.fromEntries(states)
      );
    }

    if (shouldNotify()) {
      notifyKeySubscribers(key);
      if (!hadKey) {
        notifySizeSubscribers();
        notifyKeysSubscribers();
      }
    }
  }

  function remove(key: string) {
    const oldState = states.get(key);
    const hadKey = states.delete(key);

    if (hadKey) {
      globalStateVersion++;
      stateVersions.delete(key);

      // Return state to pool
      if (oldState) {
        Object.keys(oldState).forEach((k) => delete oldState[k]);
        statePool.release(oldState);
      }
    }

    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'REMOVE', payload: { key } },
        Object.fromEntries(states)
      );
    }

    if (hadKey && shouldNotify()) {
      notifyKeySubscribers(key);
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  function clear() {
    const wasEmpty = states.size === 0;

    if (!wasEmpty) {
      globalStateVersion++;

      // Return all states to pool
      for (const state of states.values()) {
        Object.keys(state).forEach((k) => delete state[k]);
        statePool.release(state);
      }

      const keysToNotify = Array.from(states.keys());
      states.clear();
      stateVersions.clear();

      if (devTools && !pauseDevTools) {
        devTools.send({ type: 'CLEAR' }, {});
      }

      if (shouldNotify()) {
        for (const key of keysToNotify) {
          notifyKeySubscribers(key);
        }
        notifySizeSubscribers();
        notifyKeysSubscribers();
      }
    }
  }

  function reset() {
    const hadItems = states.size > 0;
    const hasInitialItems = initialMap.size > 0;

    globalStateVersion++;

    // Return all states to pool
    for (const state of states.values()) {
      Object.keys(state).forEach((k) => delete state[k]);
      statePool.release(state);
    }

    states.clear();
    stateVersions.clear();
    states = new Map<string, TState>(initialMap);

    // Update versions for initial states
    for (const key of initialMap.keys()) {
      stateVersions.set(key, globalStateVersion);
    }

    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'RESET' }, Object.fromEntries(states));
    }

    if ((hadItems || hasInitialItems) && shouldNotify()) {
      notifyAllKeySubscribers();
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  // Optimized hooks with memoization
  const useKeyMemo = new WeakMap<
    (state: TState) => unknown,
    Map<string, any>
  >();

  function useKey<T>(key: string, selector?: (state: TState) => T): TState | T {
    const stateRef = useRef<TState | undefined>();
    const selectorRef = useRef(selector);
    const versionRef = useRef(-1);
    const valueRef = useRef<T | TState | undefined>();

    // Update selector ref if it changes
    if (selector !== selectorRef.current) {
      selectorRef.current = selector;
      versionRef.current = -1; // Force recalculation
    }

    const subscribeFn = useCallback(
      (callback: () => void) =>
        subscribeToKey(key, callback, selectorRef.current),
      [key]
    );

    const getSnapshot = useCallback(() => {
      const currentState = states.get(key);
      const currentVersion = stateVersions.get(key) || 0;

      // Fast path: if version hasn't changed, return cached value
      if (
        currentVersion === versionRef.current &&
        valueRef.current !== undefined
      ) {
        return valueRef.current;
      }

      // Update cache
      stateRef.current = currentState;
      versionRef.current = currentVersion;

      if (!currentState) {
        valueRef.current = undefined;
      } else if (selectorRef.current) {
        // Check selector cache
        let selectorCache = selectorResultCache.get(selectorRef.current);
        if (!selectorCache) {
          selectorCache = new Map();
          selectorResultCache.set(selectorRef.current, selectorCache);
        }

        const cached = selectorCache.get(key);
        if (cached && cached.version === currentVersion) {
          valueRef.current = cached.result;
        } else {
          valueRef.current = selectorRef.current(currentState);
          selectorCache.set(key, {
            version: currentVersion,
            result: valueRef.current
          });
        }
      } else {
        valueRef.current = currentState;
      }

      return valueRef.current;
    }, [key]);

    return useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot) as
      | T
      | TState;
  }

  function useSize() {
    return useSyncExternalStore(
      subscribeToSize,
      () => states.size,
      () => states.size
    );
  }

  function useKeys() {
    const keysRef = useRef<string[]>([]);
    const versionRef = useRef(-1);

    const getSnapshot = useCallback(() => {
      if (globalStateVersion !== versionRef.current) {
        const currentKeys = Array.from(states.keys());
        if (!checkEquality(currentKeys, keysRef.current)) {
          keysRef.current = currentKeys;
        }
        versionRef.current = globalStateVersion;
      }
      return keysRef.current;
    }, []);

    return useSyncExternalStore(subscribeToKeys, getSnapshot, getSnapshot);
  }

  function getSize() {
    return states.size;
  }

  function getKeys() {
    return Array.from(states.keys());
  }

  // Optimized action dispatch with memoization
  const dispatcherCache = new Map<string, TActions>();

  function createKeyDispatch(key: string): TActions {
    if (!actions) return {} as TActions;

    // Check cache first
    const cached = dispatcherCache.get(key);
    if (cached) return cached;

    const dispatcher = Object.keys(actions).reduce((acc, actionKey) => {
      const typedKey = actionKey as keyof TActions;

      acc[typedKey] = ((...args: any[]) => {
        const currentState = states.get(key);
        if (!currentState) return;

        // Fast path for common actions
        if (typedKey === 'toggle' || typedKey === 'text') {
          const newState = { ...currentState };

          if (typedKey === 'toggle') {
            (newState as any).completed = !(newState as any).completed;
          } else if (typedKey === 'text') {
            (newState as any).text = args[0];
          }

          set(key, newState);
          return;
        }

        // Generic action handling
        const context = createActionContext(currentState);
        const result = (actions[typedKey] as any)(context, ...args);

        const { state: newState, hasChanged } = context.getState();
        if (hasChanged) {
          set(key, newState);
        }

        return result;
      }) as TActions[keyof TActions];

      return acc;
    }, {} as TActions);

    dispatcherCache.set(key, dispatcher);
    return dispatcher;
  }

  // Batch operations with optimized notification
  function batchActions(callback: () => void) {
    batch(callback, () => {
      // Process all pending notifications at once
      if (pendingNotifications.size > 0) {
        processNotificationBatch();
      }
    });
  }

  // Memoized selectors
  const getSelectorCache = new Map<
    string,
    MapSelectorMethods<TState, TSelectors>
  >();
  const useSelectorCache = new Map<
    string,
    MapSelectorMethods<TState, TSelectors>
  >();

  function createSelectorMethods(
    key: string,
    useHook: boolean
  ): MapSelectorMethods<TState, TSelectors> {
    const cache = useHook ? useSelectorCache : getSelectorCache;
    const cached = cache.get(key);
    if (cached) return cached;

    if (!selectors) return {} as MapSelectorMethods<TState, TSelectors>;

    const methods = Object.keys(selectors).reduce(
      (acc, selectorKey) => {
        const selector = selectors[selectorKey];
        if (!selector) return acc;

        const typedKey = selectorKey as keyof TSelectors;

        (acc as any)[typedKey] = useHook
          ? () =>
              useKey(
                key,
                (state: TState) =>
                  selector({ states: state, selectors: selectorProxy })[
                    typedKey
                  ]
              )
          : () => {
              const state = states.get(key);
              if (!state) return undefined;
              return selector({ states: state, selectors: selectorProxy })[
                typedKey
              ];
            };

        return acc;
      },
      {} as MapSelectorMethods<TState, TSelectors>
    );

    cache.set(key, methods);
    return methods;
  }

  // Key interface with memoization
  type KeyInterface = {
    dispatch: TActions;
    remove: () => void;
    set: (state: TState) => void;
    get: ((selector?: (state: TState) => any) => TState | any) &
      MapSelectorMethods<TState, TSelectors>;
    use: ((selector?: (state: TState) => any) => TState | any) &
      MapSelectorMethods<TState, TSelectors>;
  };

  const keyInterfaceCache = new Map<string, KeyInterface>();

  function key(id: string): KeyInterface {
    const cached = keyInterfaceCache.get(id);
    if (cached) return cached;

    const keyInterface = {
      dispatch: createKeyDispatch(id),
      remove: () => {
        keyInterfaceCache.delete(id);
        dispatcherCache.delete(id);
        getSelectorCache.delete(id);
        useSelectorCache.delete(id);
        remove(id);
      },
      set: (state: TState) => set(id, state),
      get: Object.assign(
        function get<T>(
          selector?: (state: TState) => T
        ): TState | T | undefined {
          const state = states.get(id);
          if (!state) return undefined;
          if (!selector) return state;

          // Check selector cache
          let selectorCache = selectorResultCache.get(selector);
          if (!selectorCache) {
            selectorCache = new Map();
            selectorResultCache.set(selector, selectorCache);
          }

          const version = stateVersions.get(id) || 0;
          const cached = selectorCache.get(id);

          if (cached && cached.version === version) {
            return cached.result;
          }

          const result = selector(state);
          selectorCache.set(id, { version, result });
          return result;
        },
        createSelectorMethods(id, false)
      ),
      use: Object.assign(
        function use<T>(selector?: (state: TState) => T): TState | T {
          return useKey(id, selector);
        },
        createSelectorMethods(id, true)
      )
    };

    keyInterfaceCache.set(id, keyInterface);
    return keyInterface;
  }

  Object.assign(mapProxy, {
    clear,
    reset,
    useSize,
    useKeys,
    getSize,
    getKeys,
    key,
    batch: batchActions
  });

  return mapProxy;
}

export function createScopedMap<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TActions extends Record<string, ActionType> = Record<string, ActionType>,
  TSelectors extends Record<string, SelectorType> = Record<string, SelectorType>
>(props: CreateMapProps<TState, TActions, TSelectors>) {
  type StoreType = InferMap<TState, TActions, TSelectors>;
  type ReactNode = React.ReactNode;

  const MapContext = createContext<StoreType | null>(null);

  const Provider = ({ children }: { children: ReactNode }) => {
    const store = useMemo(
      () => createMap<TState, TActions, TSelectors>(props),
      []
    );

    useEffect(() => {
      return () => {
        store.reset();
      };
    }, [store]);

    return createElement(MapContext.Provider, { value: store }, children);
  };

  function useMap(): StoreType {
    const context = useContext(MapContext);
    if (!context) {
      throw new Error('useMap must be used within a MapProvider');
    }
    return context;
  }

  return { Provider, useMap };
}
