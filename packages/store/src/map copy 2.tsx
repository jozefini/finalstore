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
  mapSelectors?: Map<
    number,
    {
      callback: () => void;
      lastValue: unknown;
    }
  >;
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
  TSelectors extends Record<string, SelectorType> = Record<
    string,
    SelectorType
  >,
  TMapSelectors extends Record<string, SelectorType> = Record<
    string,
    SelectorType
  >
> = {
  states: TState;
  actions?: (context: {
    states: TState;
    actions: TActions;
    selectors: TSelectors;
    map: InferMap<TState, TActions, TSelectors, TMapSelectors>;
    invalidate: (selectorName: keyof TSelectors | (keyof TSelectors)[]) => void;
    invalidateMap: (
      selectorName: keyof TMapSelectors | (keyof TMapSelectors)[]
    ) => void;
  }) => TActions;
  selectors?: (context: {
    states: TState;
    selectors: TSelectors;
  }) => TSelectors;
  mapSelectors?: (context: {
    map: {
      filter: (
        predicate: (item: { states: TState }) => boolean
      ) => { states: TState }[];
    };
  }) => TMapSelectors;
  cacheSelectors?: readonly (keyof TSelectors)[];
  cacheMapSelectors?: readonly (keyof TMapSelectors)[];
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
  TSelectors extends Record<string, SelectorType> = Record<
    string,
    SelectorType
  >,
  TMapSelectors extends Record<string, SelectorType> = Record<
    string,
    SelectorType
  >
> = {
  clear: () => void;
  reset: () => void;
  useSize: () => number;
  useKeys: () => string[];
  getSize: () => number;
  getKeys: () => string[];
  batch: (callback: () => void) => void;
  use: {
    [K in keyof TMapSelectors]: TMapSelectors[K] extends MapSelectorFunction<
      TState,
      infer P
    >
      ? undefined extends P
        ? () => ReturnType<TMapSelectors[K]>
        : (payload: P) => ReturnType<TMapSelectors[K]>
      : never;
  };
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

// Add batcher utility
const createBatcher = () => {
  let isBatching = false;
  let notifyCallback: (() => void) | null = null;

  const batch = (fn: () => void, notify: () => void) => {
    if (!isBatching) {
      isBatching = true;
      notifyCallback = notify;
      try {
        fn();
      } finally {
        isBatching = false;
        if (notifyCallback) {
          const cb = notifyCallback;
          notifyCallback = null;
          cb();
        }
      }
    } else {
      fn();
    }
  };

  const shouldNotify = () => !isBatching;

  return { batch, shouldNotify };
};

export function createMap<
  TState extends Record<string, unknown> = Record<string, unknown>,
  TActions extends Record<string, ActionType> = Record<string, ActionType>,
  TSelectors extends Record<string, SelectorType> = Record<
    string,
    SelectorType
  >,
  TMapSelectors extends Record<string, SelectorType> = Record<
    string,
    SelectorType
  >
>(
  props: CreateMapProps<TState, TActions, TSelectors, TMapSelectors>
): InferMap<TState, TActions, TSelectors, TMapSelectors> {
  const initialMap = props.initialMap
    ? new Map(props.initialMap)
    : new Map<string, TState>();

  // Create a single map instance that we'll maintain throughout
  const states = new Map<string, TState>(initialMap);

  // Create a proxy for each state entry that detects mutations
  function createStateProxy(state: TState): TState {
    console.log('Creating proxy for state:', JSON.stringify(state));
    return new Proxy(
      { ...state },
      {
        get: (target, prop: string | symbol) => {
          // Limit logging to avoid console spam
          if (
            prop !== 'toJSON' &&
            prop !== 'toString' &&
            prop !== 'valueOf' &&
            prop !== Symbol.toPrimitive
          ) {
            console.log(
              'Proxy GET:',
              String(prop),
              target[prop as keyof TState]
            );
          }
          return target[prop as keyof TState];
        },
        set: (target, prop: string | symbol, value) => {
          console.log(
            'Proxy SET:',
            String(prop),
            'old:',
            target[prop as keyof TState],
            'new:',
            value
          );
          target[prop as keyof TState] = value;
          stateVersion++;
          mapStateVersion++;
          return true;
        }
      }
    );
  }

  // Function to set state that ensures proxy wrapping
  function setState(key: string, state: TState) {
    console.log(
      'setState called for key:',
      key,
      'with state:',
      JSON.stringify(state)
    );
    const newState = { ...props.states, ...state };
    console.log('setState merged with template:', JSON.stringify(newState));
    const proxy = createStateProxy(newState);
    states.set(key, proxy);
    console.log('Map after setState:', Array.from(states.keys()));
  }

  // Initialize the map with proxied states
  for (const [key, state] of states.entries()) {
    setState(key, state);
  }

  // Special function to clear and update map contents without changing reference
  function updateMapContents(newEntries: Iterable<[string, TState]>) {
    states.clear();
    for (const [key, value] of newEntries) {
      states.set(key, createStateProxy(value));
    }
  }

  const optimizationsDisabled = props.config?.disableOptimizations ?? false;

  // State change tracking for optimization
  let stateVersion = 0;
  let mapStateVersion = 0;

  // Cache configuration
  const cachedSelectorNames = new Set(props.cacheSelectors || []);
  const cachedMapSelectorNames = new Set(props.cacheMapSelectors || []);

  // Global selector cache system
  type SelectorCacheEntry = {
    result: any;
    stateVersion: number;
    lastUsed: number;
    computeCount: number;
  };

  const globalSelectorCache = new Map<string, SelectorCacheEntry>();
  const persistentSelectorCache = new Map<string, SelectorCacheEntry>();
  const mapSelectorCache = new Map<string, SelectorCacheEntry>();
  const activeSelectorKeys = new Set<string>();
  const activeMapSelectorKeys = new Set<string>();

  // Cache key generation for selectors with arguments
  function createSelectorCacheKey(selectorName: string, args: any[]): string {
    if (args.length === 0) return selectorName;
    try {
      const argsHash = JSON.stringify(args);
      return `${selectorName}:${argsHash}`;
    } catch {
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

  function isCachedMapSelector(selectorName: string): boolean {
    return cachedMapSelectorNames.has(selectorName as keyof TMapSelectors);
  }

  // Get appropriate cache for selector
  function getSelectorCache(
    selectorName: string
  ): Map<string, SelectorCacheEntry> {
    return isCachedSelector(selectorName)
      ? persistentSelectorCache
      : globalSelectorCache;
  }

  // Invalidation functions
  function invalidate(selectorName: keyof TSelectors | (keyof TSelectors)[]) {
    if (Array.isArray(selectorName)) {
      let hasInvalidated = false;
      selectorName.forEach((name) => {
        const selectorNameStr = String(name);
        if (isCachedSelector(selectorNameStr)) {
          const keysToRemove: string[] = [];
          for (const cacheKey of persistentSelectorCache.keys()) {
            if (extractSelectorName(cacheKey) === selectorNameStr) {
              keysToRemove.push(cacheKey);
            }
          }
          keysToRemove.forEach((key) => persistentSelectorCache.delete(key));
          hasInvalidated = true;
        }
      });
      if (hasInvalidated) {
        stateVersion++;
        scheduleNotification('__selectors__');
      }
    } else {
      const selectorNameStr = String(selectorName);
      if (isCachedSelector(selectorNameStr)) {
        const keysToRemove: string[] = [];
        for (const cacheKey of persistentSelectorCache.keys()) {
          if (extractSelectorName(cacheKey) === selectorNameStr) {
            keysToRemove.push(cacheKey);
          }
        }
        keysToRemove.forEach((key) => persistentSelectorCache.delete(key));
        stateVersion++;
        scheduleNotification('__selectors__');
      }
    }
  }

  function invalidateMap(
    selectorName: keyof TMapSelectors | (keyof TMapSelectors)[]
  ) {
    if (Array.isArray(selectorName)) {
      let hasInvalidated = false;
      selectorName.forEach((name) => {
        const selectorNameStr = String(name);
        if (isCachedMapSelector(selectorNameStr)) {
          const keysToRemove: string[] = [];
          for (const cacheKey of mapSelectorCache.keys()) {
            if (extractSelectorName(cacheKey) === selectorNameStr) {
              keysToRemove.push(cacheKey);
            }
          }
          keysToRemove.forEach((key) => mapSelectorCache.delete(key));
          hasInvalidated = true;
        }
      });
      if (hasInvalidated) {
        mapStateVersion++;
        scheduleNotification('__mapSelectors__');
      }
    } else {
      const selectorNameStr = String(selectorName);
      if (isCachedMapSelector(selectorNameStr)) {
        const keysToRemove: string[] = [];
        for (const cacheKey of mapSelectorCache.keys()) {
          if (extractSelectorName(cacheKey) === selectorNameStr) {
            keysToRemove.push(cacheKey);
          }
        }
        keysToRemove.forEach((key) => mapSelectorCache.delete(key));
        mapStateVersion++;
        scheduleNotification('__mapSelectors__');
      }
    }
  }

  // Track which keys need to be updated with new references
  const pendingReferenceUpdates = new Set<string>();

  // Use shallow equality by default for performance
  const checkEquality = (a: unknown, b: unknown) => {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object')
      return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => (a as any)[key] === (b as any)[key]);
  };

  // Create batcher for update batching
  const { batch, shouldNotify } = createBatcher();

  // Throttled notification mechanism
  const pendingNotifications = new Set<string>();
  const notificationTimer: NodeJS.Timeout | null = null;

  function notifyMapSelectorSubscribers() {
    if (!subscribers.mapSelectors) return;
    for (const sub of subscribers.mapSelectors.values()) {
      sub.callback();
    }
  }

  const scheduleNotification = (key: string) => {
    pendingNotifications.add(key);
    // Process notifications immediately instead of throttling
    processNotifications();
  };

  // DevTools setup
  let devTools: DevTools | null = null;
  let pauseDevTools = false;

  // Setup DevTools if enabled
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
                // Update map contents without changing reference
                updateMapContents(Object.entries(newState));
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

  // Create a proxy for the map instance
  const mapProxy = {} as InferMap<TState, TActions, TSelectors, TMapSelectors>;

  // Initialize actions and selectors with provided functions or empty objects
  function createActionContext(state: TState) {
    console.log('Creating action context with state:', JSON.stringify(state));
    // Create a proxy that tracks mutations
    const stateProxy = createStateProxy(state);
    let hasChanged = false;

    return {
      states: stateProxy,
      actions: actionProxy,
      selectors: selectorProxy,
      map: mapProxy,
      invalidate,
      invalidateMap,
      getState: () => {
        // Check if state was mutated through proxy
        hasChanged = stateVersion > 0;
        console.log(
          'getState called, hasChanged:',
          hasChanged,
          'state:',
          JSON.stringify(stateProxy)
        );
        return { state: stateProxy, hasChanged };
      }
    };
  }

  // Initialize actions and selectors with provided functions or empty objects
  const actionProxy = {} as TActions;
  const selectorProxy = {} as TSelectors;
  const mapSelectorProxy = {} as TMapSelectors;

  // Initialize actions with the actual state
  const actions = props.actions
    ? props.actions(createActionContext({ ...props.states }))
    : ({} as TActions);

  // Initialize selectors with the actual state
  const selectors = props.selectors
    ? props.selectors({
        states: { ...props.states },
        selectors: selectorProxy
      })
    : ({} as TSelectors);

  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // Create map selectors with access to the actual map
  const mapSelectors = props.mapSelectors
    ? props.mapSelectors({
        map: {
          filter: (predicate) => {
            return Array.from(states.entries())
              .filter(([_, state]) => predicate({ states: state }))
              .map(([_, state]) => ({ states: state }));
          }
        }
      })
    : ({} as TMapSelectors);

  Object.assign(mapSelectorProxy, mapSelectors);

  // =====================
  // Subscription Management
  // =====================

  function subscribeToKey(
    key: string,
    callback: () => void,
    selector?: (state: TState) => unknown
  ) {
    console.log('Subscribing to key:', key, 'with selector:', !!selector);

    if (!subscribers.byKey.has(key)) {
      subscribers.byKey.set(key, new Map());
      console.log('Created new subscriber map for key:', key);
    }

    const keySubscribers = subscribers.byKey.get(key);
    if (!keySubscribers)
      return () => {
        return null;
      };

    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: TState) => s);
    const state = states.get(key);
    const initialValue = state ? initialSelector(state) : undefined;

    console.log(
      'Initial subscription state:',
      key,
      'value:',
      initialValue === state ? 'whole state' : JSON.stringify(initialValue)
    );

    keySubscribers.set(id, {
      selector: initialSelector,
      callback,
      lastValue: initialValue
    });

    console.log(
      'Subscriber added with ID:',
      id,
      'total subscribers for key:',
      keySubscribers.size
    );

    return () => {
      console.log('Unsubscribing from key:', key, 'ID:', id);
      const subs = subscribers.byKey.get(key);
      if (subs) {
        subs.delete(id);
        if (subs.size === 0) {
          subscribers.byKey.delete(key);
          console.log('Removed empty subscriber map for key:', key);
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

  // =====================
  // Notification System
  // =====================

  function notifyAllKeySubscribers() {
    for (const keySubscribers of subscribers.byKey.values()) {
      for (const sub of keySubscribers.values()) {
        sub.callback();
      }
    }
  }

  function notifyKeySubscribers(key: string) {
    console.log('notifyKeySubscribers:', { key });
    const keySubscribers = subscribers.byKey.get(key);
    if (!keySubscribers) {
      console.log('No subscribers for key:', key);
      return;
    }

    const state = states.get(key);
    if (!state) {
      console.log('No state for key:', key);
      return;
    }

    console.log('Current state for key:', { key, state });

    for (const sub of keySubscribers.values()) {
      console.log('Processing subscriber:', {
        hasSelector: typeof sub.selector === 'function',
        lastValue: sub.lastValue
      });

      // Check if the selector expects state as a parameter
      let newValue;
      if (typeof sub.selector === 'function') {
        const selectorStr = sub.selector.toString();
        const takesStateParam =
          selectorStr.includes('state =>') || selectorStr.includes('(state');
        try {
          newValue = takesStateParam ? sub.selector(state) : sub.selector();
        } catch (error) {
          // Fallback to passing state if calling without arguments fails
          newValue = sub.selector(state);
        }
      } else {
        newValue = state;
      }
      const oldValue = sub.lastValue;

      console.log('Comparing values:', {
        newValue,
        oldValue,
        isEqual: checkEquality(newValue, oldValue)
      });

      const hasChanged =
        typeof sub.selector === 'function'
          ? !checkEquality(newValue, oldValue)
          : true;

      if (hasChanged) {
        console.log('Value changed, notifying subscriber');
        sub.lastValue = newValue;
        sub.callback();
      } else {
        console.log('No change detected, skipping notification');
      }
    }
  }

  function notifySizeSubscribers() {
    for (const sub of subscribers.size.values()) {
      const newValue = states.size;
      if (newValue !== sub.lastValue) {
        sub.lastValue = newValue;
        sub.callback();
      }
    }
  }

  function notifyKeysSubscribers() {
    const currentKeys = Array.from(states.keys());
    for (const sub of subscribers.keys.values()) {
      const newKeys = currentKeys;
      if (!checkEquality(newKeys, sub.lastValue)) {
        sub.lastValue = newKeys;
        sub.callback();
      }
    }
  }

  function processNotifications() {
    // CRITICAL: Update selector caches first
    updateSelectorCaches();

    if (pendingNotifications.size > 0) {
      const keysThatChanged = Array.from(pendingNotifications);
      pendingNotifications.clear();

      // Process notifications
      for (const key of keysThatChanged) {
        if (key === '__size__') {
          notifySizeSubscribers();
        } else if (key === '__keys__') {
          notifyKeysSubscribers();
        } else if (key === '__selectors__') {
          notifyAllKeySubscribers();
        } else if (key === '__mapSelectors__') {
          notifyMapSelectorSubscribers();
        } else {
          notifyKeySubscribers(key);
        }
      }
    }
  }

  // Update selector caches before notifications
  function updateSelectorCaches() {
    // Update key-specific selector caches
    for (const [key, keySubscribers] of subscribers.byKey.entries()) {
      const state = states.get(key);
      if (!state) continue;

      for (const sub of keySubscribers.values()) {
        if (typeof sub.selector === 'function') {
          // Check if the selector expects state as a parameter
          const selectorStr = sub.selector.toString();
          const takesStateParam =
            selectorStr.includes('state =>') || selectorStr.includes('(state');
          let newValue;
          try {
            newValue = takesStateParam ? sub.selector(state) : sub.selector();
          } catch (error) {
            // Fallback to passing state if calling without arguments fails
            newValue = sub.selector(state);
          }

          if (!checkEquality(newValue, sub.lastValue)) {
            sub.lastValue = newValue;
          }
        }
      }
    }

    // Update map selector caches
    if (subscribers.mapSelectors) {
      for (const sub of subscribers.mapSelectors.values()) {
        const newValue = Array.from(states.entries()).map(
          ([_, state]) => state
        );
        if (!checkEquality(newValue, sub.lastValue)) {
          sub.lastValue = newValue;
        }
      }
    }
  }

  // =====================
  // Map Operations
  // =====================

  function set(key: string, state: TState) {
    console.log('set called:', { key, state });
    const hadKey = states.has(key);

    setState(key, state);

    console.log('After setState:', {
      key,
      state: states.get(key),
      isProxy: typeof states.get(key) === 'object' && states.get(key) !== null,
      stateVersion,
      mapStateVersion
    });

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'SET', payload: { key, state } },
        Object.fromEntries(states)
      );
    }

    // Schedule notifications
    scheduleNotification(key);
    if (!hadKey) {
      scheduleNotification('__size__');
      scheduleNotification('__keys__');
    }
    scheduleNotification('__selectors__');
    scheduleNotification('__mapSelectors__');

    // Process notifications immediately
    processNotifications();
  }

  function remove(key: string) {
    const hadKey = states.delete(key);

    // Increment state version and invalidate non-cached selectors
    stateVersion++;
    mapStateVersion++;

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'REMOVE', payload: { key } },
        Object.fromEntries(states)
      );
    }

    if (hadKey) {
      scheduleNotification(key);
      scheduleNotification('__size__');
      scheduleNotification('__keys__');
      scheduleNotification('__selectors__');
      scheduleNotification('__mapSelectors__');
    }
  }

  function clear() {
    const wasEmpty = states.size === 0;

    // Get all keys for notification before clearing
    const keysToNotify = wasEmpty ? [] : Array.from(states.keys());

    // Clear map contents without changing reference
    states.clear();

    // Increment state version and invalidate non-cached selectors
    stateVersion++;
    mapStateVersion++;

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'CLEAR' }, {});
    }

    if (!wasEmpty) {
      // Queue notifications for all affected keys
      for (const key of keysToNotify) {
        scheduleNotification(key);
      }
      scheduleNotification('__size__');
      scheduleNotification('__keys__');
      scheduleNotification('__selectors__');
      scheduleNotification('__mapSelectors__');

      // Process immediately for clear operation
      processNotifications();
    }
  }

  function reset() {
    const hadItems = states.size > 0;
    const hasInitialItems = initialMap.size > 0;

    // Update map contents without changing reference
    updateMapContents(initialMap);

    // Increment state version and invalidate non-cached selectors
    stateVersion++;
    mapStateVersion++;

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'RESET' }, Object.fromEntries(states));
    }

    if (hadItems || hasInitialItems) {
      notifyAllKeySubscribers();
      notifySizeSubscribers();
      notifyKeysSubscribers();
      scheduleNotification('__selectors__');
      scheduleNotification('__mapSelectors__');
    }
  }

  // =====================
  // Hooks and Methods
  // =====================

  function useKey<T>(key: string, selector?: (state: TState) => T): TState | T {
    console.log('useKey called:', { key, hasSelector: !!selector });

    const stateRef = useRef(states.get(key));
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | TState | undefined>(
      selector && stateRef.current
        ? selector(stateRef.current)
        : stateRef.current
    );
    const stateVersionRef = useRef(stateVersion);

    console.log('useKey refs:', {
      currentState: stateRef.current,
      currentValue: valueRef.current,
      stateVersion: stateVersionRef.current
    });

    // Update refs when selector changes
    if (selector !== selectorRef.current) {
      console.log('Selector changed');
      selectorRef.current = selector;
      stateRef.current = states.get(key);
      stateVersionRef.current = stateVersion;
      valueRef.current =
        selector && stateRef.current
          ? selector(stateRef.current)
          : stateRef.current;
    }

    const subscribeFn = useCallback(
      (callback: () => void) => {
        console.log('Subscribing to key:', key);
        return subscribeToKey(key, callback, selectorRef.current);
      },
      [key]
    );

    const getSnapshot = useCallback(() => {
      console.log('getSnapshot called');
      const currentState = states.get(key);
      const hasStateChanged = stateVersion !== stateVersionRef.current;

      console.log('getSnapshot state:', {
        currentState,
        hasStateChanged,
        currentVersion: stateVersion,
        lastVersion: stateVersionRef.current
      });

      if (
        hasStateChanged ||
        currentState !== stateRef.current ||
        !valueRef.current
      ) {
        console.log('State changed, updating value');
        stateRef.current = currentState;
        stateVersionRef.current = stateVersion;

        if (selectorRef.current && currentState) {
          valueRef.current = selectorRef.current(currentState);
        } else if (currentState) {
          valueRef.current = currentState;
        } else {
          valueRef.current = undefined;
        }

        console.log('New value:', valueRef.current);
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

    const getSnapshot = useCallback(() => {
      const currentKeys = Array.from(states.keys());
      if (!checkEquality(currentKeys, keysRef.current)) {
        keysRef.current = currentKeys;
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

  // Create key-specific actions that update with fresh state
  function createKeyDispatch(key: string) {
    console.log('Creating key dispatch for key:', key);

    if (!actions) {
      console.log('No actions defined for key:', key);
      return {} as TActions;
    }

    return Object.keys(actions).reduce(
      (acc, actionKey) => {
        const typedKey = actionKey as keyof TActions;
        console.log('Creating action:', actionKey, 'for key:', key);

        acc[typedKey] = ((...args: any[]) => {
          console.log(
            `Action ${actionKey} called for key:`,
            key,
            'args:',
            args
          );

          // Get the current state for this key
          const currentState = states.get(key);
          if (!currentState) {
            console.log(`No state found for key ${key} in action ${actionKey}`);
            return;
          }

          console.log(
            `Current state before action ${actionKey}:`,
            JSON.stringify(currentState)
          );

          // Create action context with current state
          const context = createActionContext({ ...currentState });

          // Execute the action
          console.log(`Executing action ${actionKey} for key:`, key);
          (actions[typedKey] as any)(context, ...args);

          // Get the result
          const { state: newState, hasChanged } = context.getState();
          console.log(`Action ${actionKey} result:`, {
            hasChanged,
            newState: JSON.stringify(newState)
          });

          // If state changed, update it
          if (hasChanged) {
            // Set new state with proper template
            const updatedState = { ...props.states, ...newState };
            console.log(
              `Updating state for key ${key} after action ${actionKey}:`,
              JSON.stringify(updatedState)
            );
            states.set(key, createStateProxy(updatedState));
            stateVersion++;
            mapStateVersion++;
            console.log(`New versions after action ${actionKey}:`, {
              stateVersion,
              mapStateVersion
            });

            if (devTools && !pauseDevTools) {
              devTools.send(
                { type: `${String(actionKey)}@${key}`, payload: args[0] },
                Object.fromEntries(states)
              );
            }

            // Schedule notifications
            scheduleNotification(key);
            scheduleNotification('__selectors__');
            scheduleNotification('__mapSelectors__');
            console.log(
              `Notifications scheduled for key ${key} after action ${actionKey}`
            );

            // Process notifications immediately
            processNotifications();
          } else {
            console.log(
              `No state change detected for key ${key} in action ${actionKey}`
            );
          }

          return undefined;
        }) as TActions[keyof TActions];

        return acc;
      },
      {} as Record<keyof TActions, ActionType>
    ) as TActions;
  }

  // Create a shared dispatcher map to avoid creating new dispatchers per key
  const dispatchersByKey = new Map<string, TActions>();

  // Run multiple actions in a batch with a single notification at the end
  function batchActions(callback: () => void) {
    const prevStateEntries = new Map(states.entries());

    batch(
      () => {
        // Execute the batched actions
        callback();
      },
      () => {
        // Determine what changed by comparing before and after states
        const changedKeys = new Set<string>();
        let hasRemovedKeys = false;

        // Check for modified or added keys
        for (const [key, state] of states.entries()) {
          const prevState = prevStateEntries.get(key);

          // If this is a new key or the key's state has changed
          if (!prevState || !checkEquality(prevState, state)) {
            changedKeys.add(key);
            pendingReferenceUpdates.add(key);
          }
        }

        // Check for removed keys
        for (const key of prevStateEntries.keys()) {
          if (!states.has(key)) {
            changedKeys.add(key);
            hasRemovedKeys = true;
          }
        }

        // Notify only if something changed
        if (changedKeys.size > 0 || hasRemovedKeys) {
          // Schedule notifications for all changed keys
          for (const key of changedKeys) {
            scheduleNotification(key);
          }

          if (hasRemovedKeys) {
            scheduleNotification('__size__');
            scheduleNotification('__keys__');
          }

          scheduleNotification('__selectors__');
          scheduleNotification('__mapSelectors__');

          // Process notifications immediately
          processNotifications();
        }
      }
    );
  }

  // Create key-specific get method
  function createKeyGet(key: string) {
    function get(): TState | undefined;
    function get<T>(selector: (state: TState) => T): T | undefined;
    function get<T>(selector?: (state: TState) => T): TState | T | undefined {
      console.log('get called for key:', key, 'with selector:', !!selector);
      const state = states.get(key);
      console.log('get state retrieved:', key, JSON.stringify(state));

      if (!state) {
        console.log('No state found for key:', key);
        return undefined;
      }

      if (!selector) {
        console.log('Returning whole state for key:', key);
        return state;
      }

      const result = selector(state);
      console.log('Selector result for key:', key, JSON.stringify(result));
      return result;
    }
    return get;
  }

  // Create key-specific use method
  function createKeyUse(key: string) {
    return function use<T>(selector?: (state: TState) => T): TState | T {
      return useKey(key, selector);
    };
  }

  // Create selector methods for both get and use
  function createSelectorMethods(
    key: string,
    useHook?: boolean
  ): MapSelectorMethods<TState, TSelectors> {
    console.log(
      'Creating selector methods for key:',
      key,
      'useHook:',
      !!useHook
    );

    if (!selectors) {
      console.log('No selectors defined, returning empty object');
      return {} as MapSelectorMethods<TState, TSelectors>;
    }

    return Object.keys(selectors).reduce<
      MapSelectorMethods<TState, TSelectors>
    >(
      (acc, selectorKey) => {
        const selector = selectors[selectorKey];
        if (!selector) return acc;

        const typedKey = selectorKey as keyof TSelectors;
        (acc as Record<keyof TSelectors, (payload?: AnyType) => AnyType>)[
          typedKey
        ] = ((payload?: AnyType) => {
          console.log(
            `${useHook ? 'use' : 'get'}.${selectorKey} called for key:`,
            key,
            'payload:',
            payload
          );

          if (useHook) {
            // For hooks, create a stable selector function
            const stableSelectorFn = useCallback(
              (state: TState) => {
                console.log(
                  `Executing selector ${selectorKey} for key:`,
                  key,
                  'state:',
                  JSON.stringify(state)
                );
                // Make sure we're passing the state to the selector
                // Check if the selector expects state as a parameter
                const selectorStr = selector.toString();
                const takesStateParam =
                  selectorStr.includes('state =>') ||
                  selectorStr.includes('(state');

                // Call with or without state based on how it was defined
                let result;
                try {
                  result = takesStateParam
                    ? selector(state, payload)
                    : payload
                      ? selector(payload)
                      : selector();
                } catch (error) {
                  // Fallback to passing state if calling without arguments fails
                  result = selector(state, payload);
                }
                console.log(`Selector ${selectorKey} result:`, result);
                return result;
              },
              [payload]
            );

            return useKey(key, stableSelectorFn);
          }

          // For direct calls, get state and compute
          const state = states.get(key);
          console.log(
            `Direct ${selectorKey} call, state for key:`,
            key,
            JSON.stringify(state)
          );

          if (!state) {
            console.log(
              `No state found for key ${key} in direct selector call`
            );
            return undefined;
          }

          // Check if the selector expects state as a parameter
          const selectorStr = selector.toString();
          const takesStateParam =
            selectorStr.includes('state =>') || selectorStr.includes('(state');

          // Call with or without state based on how it was defined
          let result;
          try {
            result = takesStateParam
              ? selector(state, payload)
              : payload
                ? selector(payload)
                : selector();
          } catch (error) {
            // Fallback to passing state if calling without arguments fails
            result = selector(state, payload);
          }
          console.log(`Direct selector ${selectorKey} result:`, result);
          return result;
        }) as TSelectors[keyof TSelectors];

        return acc;
      },
      {} as MapSelectorMethods<TState, TSelectors>
    );
  }

  // Create map selector hooks
  function createMapSelectorMethods(): MapSelectorMethods<
    TState,
    TMapSelectors
  > {
    if (!mapSelectors) return {} as MapSelectorMethods<TState, TMapSelectors>;

    return Object.keys(mapSelectors).reduce<
      MapSelectorMethods<TState, TMapSelectors>
    >(
      (acc, selectorKey) => {
        const selector = mapSelectors[selectorKey];
        if (!selector) return acc;

        const typedKey = selectorKey as keyof TMapSelectors;
        (acc as Record<keyof TMapSelectors, (payload?: AnyType) => AnyType>)[
          typedKey
        ] = ((payload?: AnyType) => {
          const cacheKey = createSelectorCacheKey(
            selectorKey,
            payload ? [payload] : []
          );
          const isCached = isCachedMapSelector(selectorKey);

          // Register this selector as actively used
          activeMapSelectorKeys.add(cacheKey);

          // Create a wrapper that uses the appropriate cache
          const wrappedSelector = () => {
            const cached = mapSelectorCache.get(cacheKey);
            if (
              cached &&
              (isCached || cached.stateVersion === mapStateVersion)
            ) {
              cached.lastUsed = Date.now();
              return cached.result;
            }

            const result = selector({ map: mapProxy }, payload);
            mapSelectorCache.set(cacheKey, {
              result,
              stateVersion: mapStateVersion,
              lastUsed: Date.now(),
              computeCount: (cached?.computeCount || 0) + 1
            });

            return result;
          };

          return useSyncExternalStore(
            (callback) => {
              // Subscribe to map selector changes
              const unsubscribe = subscribeToMapSelectors(callback);
              return unsubscribe;
            },
            wrappedSelector,
            wrappedSelector
          );
        }) as TMapSelectors[keyof TMapSelectors];

        return acc;
      },
      {} as MapSelectorMethods<TState, TMapSelectors>
    );
  }

  // Create a shared map selector methods instance
  const mapSelectorMethods = createMapSelectorMethods();

  // Subscribe to map selector changes
  function subscribeToMapSelectors(callback: () => void) {
    const id = nextSubscriberId++;
    subscribers.mapSelectors = subscribers.mapSelectors || new Map();
    subscribers.mapSelectors.set(id, {
      callback,
      lastValue: undefined
    });

    return () => {
      subscribers.mapSelectors?.delete(id);
    };
  }

  // Create a shared selector map to avoid creating new selectors per key
  const getSelectorsByKey = new Map<
    string,
    MapSelectorMethods<TState, TSelectors>
  >();
  const useSelectorsByKey = new Map<
    string,
    MapSelectorMethods<TState, TSelectors>
  >();

  function key(id: string) {
    // Reuse existing dispatcher or create a new one
    if (!dispatchersByKey.has(id)) {
      dispatchersByKey.set(id, createKeyDispatch(id));
    }

    // Reuse existing selectors or create new ones
    if (!getSelectorsByKey.has(id)) {
      getSelectorsByKey.set(id, createSelectorMethods(id, false));
    }

    if (!useSelectorsByKey.has(id)) {
      useSelectorsByKey.set(id, createSelectorMethods(id, true));
    }

    const keyGet = createKeyGet(id);
    const keyUse = createKeyUse(id);

    return {
      dispatch: dispatchersByKey.get(id) || ({} as TActions),
      remove: () => {
        dispatchersByKey.delete(id);
        getSelectorsByKey.delete(id);
        useSelectorsByKey.delete(id);
        remove(id);
      },
      set: (state: TState) => set(id, state),
      get: Object.assign(keyGet, getSelectorsByKey.get(id) || {}),
      use: Object.assign(keyUse, useSelectorsByKey.get(id) || {})
    };
  }

  Object.assign(mapProxy, {
    clear,
    reset,
    useSize,
    useKeys,
    getSize,
    getKeys,
    key,
    batch: batchActions,
    use: mapSelectorMethods
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
