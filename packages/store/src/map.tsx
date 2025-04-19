'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from 'react';

import { isDeepEqual } from './store';

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

type MapActionFunction<TState, TPayload = void> = (
  state: TState,
  payload?: TPayload
) => unknown | Promise<unknown>;

type MapSelectorFunction<TState, TPayload = void> = (
  state: TState,
  payload?: TPayload
) => unknown;

type ActionType = (...args: any[]) => any;
type SelectorType = (...args: any[]) => any;

type MapContext<
  TState,
  TActions extends Record<string, MapActionFunction<TState, AnyType>>,
  TSelectors extends Record<string, MapSelectorFunction<TState, AnyType>>
> = {
  states: TState;
  actions: TActions;
  selectors: TSelectors;
  map: InferMap<TState, TActions, TSelectors>;
};

type ActionsContext<
  TState,
  TActions extends Record<string, MapActionFunction<TState, AnyType>>,
  TSelectors extends Record<string, MapSelectorFunction<TState, AnyType>>
> = (context: MapContext<TState, TActions, TSelectors>) => TActions;

type SelectorsContext<
  TState,
  TSelectors extends Record<string, MapSelectorFunction<TState, AnyType>>
> = (context: { states: TState; selectors: TSelectors }) => TSelectors;

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

// Add batcher utility
const createBatcher = () => {
  let isBatching = false;
  let notifyQueued = false;
  let notifyCallback: (() => void) | null = null;

  const batch = (fn: () => void, notify: () => void) => {
    if (!isBatching) {
      // If not already batching, start a new batch
      isBatching = true;
      notifyCallback = notify;
      try {
        fn();
      } finally {
        // End the batch and notify if needed
        isBatching = false;
        if (notifyCallback) {
          const cb = notifyCallback;
          notifyCallback = null;
          notifyQueued = false;
          cb();
        }
      }
    } else {
      // If already batching, just execute the function
      // and queue notification for the parent batch
      fn();
      notifyQueued = true;
    }
  };

  const shouldNotify = () => !isBatching;

  return { batch, shouldNotify };
};

export function createMap<
  TState = any,
  TActions extends Record<string, ActionType> = Record<string, ActionType>,
  TSelectors extends Record<string, SelectorType> = Record<string, SelectorType>
>(
  props: CreateMapProps<TState, TActions, TSelectors>
): InferMap<TState, TActions, TSelectors> {
  const initialMap = props.initialMap
    ? new Map(props.initialMap)
    : new Map<string, TState>();

  let states = new Map<string, TState>(initialMap);

  // Create batcher for update batching
  const { batch, shouldNotify } = createBatcher();

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
                states = new Map(Object.entries(newState));
                notifyAllKeySubscribers();
                notifySizeSubscribers();
                notifyKeysSubscribers();
                pauseDevTools = false;
              } catch (error) {
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

  const subscribers: MapSubscribers<TState> = {
    byKey: new Map(),
    size: new Map(),
    keys: new Map()
  };
  let nextSubscriberId = 0;

  // Create a proxy for the map instance
  const mapProxy = {} as InferMap<TState, TActions, TSelectors>;

  // Initialize actions and selectors with provided functions or empty objects
  const actionProxy = {} as TActions;
  const selectorProxy = {} as TSelectors;

  const actions = props.actions
    ? props.actions({
        states: {} as TState,
        actions: actionProxy,
        selectors: selectorProxy,
        map: mapProxy
      })
    : ({} as TActions);

  const selectors = props.selectors
    ? props.selectors({
        states: {} as TState,
        selectors: selectorProxy
      })
    : ({} as TSelectors);

  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // =====================
  // Subscription Management
  // =====================

  function subscribeToKey(
    key: string,
    callback: () => void,
    selector?: (state: TState) => unknown
  ) {
    if (!subscribers.byKey.has(key)) {
      subscribers.byKey.set(key, new Map());
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
    const keySubscribers = subscribers.byKey.get(key);
    if (!keySubscribers) return;

    const state = states.get(key);
    if (!state) return;

    for (const sub of keySubscribers.values()) {
      const newValue = sub.selector(state);
      if (!isDeepEqual(newValue, sub.lastValue)) {
        sub.lastValue = newValue;
        sub.callback();
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
      if (!isDeepEqual(newKeys, sub.lastValue)) {
        sub.lastValue = newKeys;
        sub.callback();
      }
    }
  }

  // =====================
  // Map Operations
  // =====================

  function set(key: string, state: TState) {
    const hadKey = states.has(key);
    states.set(key, state);

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'SET', payload: { key, state } },
        Object.fromEntries(states)
      );
    }

    notifyKeySubscribers(key);
    if (!hadKey) {
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  function remove(key: string) {
    const hadKey = states.delete(key);

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'REMOVE', payload: { key } },
        Object.fromEntries(states)
      );
    }

    if (hadKey) {
      notifyKeySubscribers(key);
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  function clear() {
    const wasEmpty = states.size === 0;
    states.clear();

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'CLEAR' }, {});
    }

    if (!wasEmpty) {
      notifyAllKeySubscribers();
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  function reset() {
    const hadItems = states.size > 0;
    const hasInitialItems = initialMap.size > 0;

    states.clear();
    states = new Map<string, TState>(initialMap);

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'RESET' }, Object.fromEntries(states));
    }

    if (hadItems || hasInitialItems) {
      notifyAllKeySubscribers();
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  // =====================
  // Hooks and Methods
  // =====================

  function useKey<T>(key: string, selector?: (state: TState) => T): TState | T {
    const stateRef = useRef(states.get(key));
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | TState | undefined>(
      selector && stateRef.current
        ? selector(stateRef.current)
        : stateRef.current
    );

    // Update refs when selector changes
    if (selector !== selectorRef.current) {
      selectorRef.current = selector;
      stateRef.current = states.get(key);
      valueRef.current =
        selector && stateRef.current
          ? selector(stateRef.current)
          : stateRef.current;
    }

    const subscribeFn = useCallback(
      (callback: () => void) => {
        return subscribeToKey(key, callback, selectorRef.current);
      },
      [key]
    );

    const getSnapshot = useCallback(() => {
      const currentState = states.get(key);
      const hasStateChanged = currentState !== stateRef.current;

      if (hasStateChanged || valueRef.current === undefined) {
        stateRef.current = currentState;
        valueRef.current =
          selectorRef.current && currentState
            ? selectorRef.current(currentState)
            : currentState;
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
      if (!isDeepEqual(currentKeys, keysRef.current)) {
        keysRef.current = currentKeys;
      }
      return keysRef.current;
    }, []);

    return useSyncExternalStore(subscribeToKeys, getSnapshot, getSnapshot);
  }

  function get(key: string): TState | undefined;
  function get<T>(key: string, selector: (state: TState) => T): T | undefined;
  function get<T>(
    key: string,
    selector?: (state: TState) => T
  ): TState | T | undefined {
    const state = states.get(key);
    if (!state) return undefined;
    if (!selector) return state;
    return selector(state);
  }

  function getSize() {
    return states.size;
  }

  function getKeys() {
    return Array.from(states.keys());
  }

  async function dispatch<K extends keyof TActions>(
    key: string,
    type: K,
    payload?: Parameters<TActions[K]>[1],
    shouldNotify = true
  ): Promise<ReturnType<TActions[K]>> {
    if (!actions) {
      throw new Error('Actions are not defined');
    }

    const state = states.get(key);
    if (!state) throw new Error(`Key ${key} not found`);

    const cb = actions[type];
    if (typeof cb !== 'function') {
      throw new Error(`Action ${String(type)} not found`);
    }

    const newState = { ...state };
    const result = cb(newState, payload);
    const finalResult = result instanceof Promise ? await result : result;

    states.set(key, newState);

    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: `${String(type)}@${key}`, payload },
        Object.fromEntries(states)
      );
    }

    if (shouldNotify) {
      notifyKeySubscribers(key);
    }

    return finalResult as ReturnType<TActions[K]>;
  }

  function createKeyDispatch(key: string) {
    if (!actions) return {} as TActions;
    return Object.keys(actions).reduce(
      (acc, actionKey) => {
        const typedKey = actionKey as keyof TActions;
        acc[typedKey] = ((...args: any[]) => {
          const cb = actions[typedKey] as ActionType;
          const state = states.get(key);
          if (!state) throw new Error(`Key ${key} not found`);

          const newState = { ...state };
          const result = cb(...args);

          if (result instanceof Promise) {
            return dispatch(key, typedKey, args[0]);
          }

          states.set(key, newState);
          if (devTools && !pauseDevTools) {
            devTools.send(
              { type: `${String(actionKey)}@${key}`, payload: args[0] },
              Object.fromEntries(states)
            );
          }
          if (shouldNotify()) {
            notifyKeySubscribers(key);
          }
          return result;
        }) as TActions[keyof TActions];
        return acc;
      },
      {} as Record<keyof TActions, ActionType>
    ) as TActions;
  }

  // Run multiple actions in a batch with a single notification at the end
  function batchActions(callback: () => void) {
    const prevStates = new Map(states);
    batch(
      () => {
        callback();
        states = new Map(states);
      },
      () => {
        // Check if any state has changed
        let hasChanged = false;
        for (const [key, state] of states) {
          const prevState = prevStates.get(key);
          if (!prevState || !isDeepEqual(prevState, state)) {
            hasChanged = true;
            notifyKeySubscribers(key);
          }
        }
        // Check for removed states
        for (const key of prevStates.keys()) {
          if (!states.has(key)) {
            hasChanged = true;
            notifyKeySubscribers(key);
          }
        }
        if (hasChanged) {
          notifySizeSubscribers();
          notifyKeysSubscribers();
        }
      }
    );
  }

  // Create key-specific get method
  function createKeyGet(key: string) {
    function get(): TState | undefined;
    function get<T>(selector: (state: TState) => T): T | undefined;
    function get<T>(selector?: (state: TState) => T): TState | T | undefined {
      const state = states.get(key);
      if (!state) return undefined;
      if (!selector) return state;
      return selector(state);
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
    if (!props.selectors) return {} as MapSelectorMethods<TState, TSelectors>;
    return Object.keys(props.selectors).reduce<
      MapSelectorMethods<TState, TSelectors>
    >(
      (acc, selectorKey) => {
        const selector = selectors[selectorKey];
        if (!selector) return acc;

        const typedKey = selectorKey as keyof TSelectors;
        (acc as Record<keyof TSelectors, (payload?: AnyType) => AnyType>)[
          typedKey
        ] = (payload?: AnyType) => {
          const state = get(key);
          if (!state) return undefined;

          if (useHook) {
            return useKey(key, (s: TState) => selector(s, payload));
          }
          return selector(state, payload);
        };
        return acc;
      },
      {} as MapSelectorMethods<TState, TSelectors>
    );
  }

  function key(id: string) {
    return {
      dispatch: actions ? createKeyDispatch(id) : ({} as TActions),
      remove: () => remove(id),
      set: (state: TState) => set(id, state),
      get: Object.assign(createKeyGet(id), createSelectorMethods(id, false)),
      use: Object.assign(createKeyUse(id), createSelectorMethods(id, true))
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
    batch: batchActions
  });

  return mapProxy;
}

export function createScopedMap<
  TState = any,
  TActions extends Record<string, ActionType> = Record<string, ActionType>,
  TSelectors extends Record<string, SelectorType> = Record<string, SelectorType>
>(props: CreateMapProps<TState, TActions, TSelectors>) {
  const MapContext = createContext<InferMap<
    TState,
    TActions,
    TSelectors
  > | null>(null);

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

  function useMap(): InferMap<TState, TActions, TSelectors> {
    const context = useContext(MapContext);
    if (!context) {
      throw new Error('useMap must be used within a MapProvider');
    }
    return context;
  }

  return { Provider, useMap };
}
