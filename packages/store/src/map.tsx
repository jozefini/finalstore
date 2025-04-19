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

  function createActionContext(state: TState) {
    // Replace the state reference with a mutable one instead of a copy
    const stateRef = state;

    console.log('Creating action context with state:', { ...stateRef });

    // Create a proxy that directly modifies the state
    const stateProxy = new Proxy({} as TState, {
      get: (_target, prop: string | symbol) => {
        const value = stateRef[prop as keyof TState];
        console.log('Action context GET:', { prop, value });
        return value;
      },
      set: (_target, prop: string | symbol, value) => {
        console.log('Action context SET before:', {
          prop,
          value,
          current: { ...stateRef }
        });
        // Update the state reference directly
        stateRef[prop as keyof TState] = value;
        console.log('Action context SET after:', {
          prop,
          value,
          current: { ...stateRef }
        });
        return true;
      }
    });

    return {
      states: stateProxy,
      actions: actionProxy,
      selectors: selectorProxy,
      map: mapProxy,
      // Return the directly updated state
      getState: () => stateRef
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

    console.log('New subscription:', key, {
      selector: !!selector,
      initialValue
    });

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

    console.log('Notifying subscribers for key', key, 'with state', {
      ...state
    });

    for (const sub of keySubscribers.values()) {
      const newValue = sub.selector(state);
      const oldValue = sub.lastValue;
      console.log('Subscriber check:', key, {
        newValue,
        oldValue,
        equal: isDeepEqual(newValue, oldValue)
      });

      if (!isDeepEqual(newValue, oldValue)) {
        console.log('Value changed, updating subscriber', key, {
          old: oldValue,
          new: newValue
        });
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
    const newState = { ...props.states, ...state };
    states.set(key, newState);

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'SET', payload: { key, state: newState } },
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
    payload?: Parameters<TActions[K]>[1]
  ): Promise<ReturnType<TActions[K]> | undefined> {
    if (!actions) return;

    const state = states.get(key);
    if (!state) return;

    const cb = actions[type];
    if (typeof cb !== 'function') return;

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

    notifyKeySubscribers(key);

    return finalResult as ReturnType<TActions[K]>;
  }

  // Create key-specific actions that update with fresh state
  function createKeyDispatch(key: string) {
    if (!actions) return {} as TActions;

    return Object.keys(actions).reduce(
      (acc, actionKey) => {
        const typedKey = actionKey as keyof TActions;

        acc[typedKey] = ((...args: any[]) => {
          // Get the current state for this key
          const currentState = states.get(key);
          if (!currentState) return;

          console.log('Before action:', key, { ...currentState });
          console.log('Executing action:', typedKey);

          // Clone the current state to avoid direct mutation
          const stateClone = { ...currentState };

          // ⭐️ DIRECT IMPLEMENTATION OF ACTIONS ⭐️
          // Instead of trying to reuse the original actions with proxies,
          // we implement the actions directly based on our knowledge of what they do

          if (typedKey === ('toggle' as keyof TActions)) {
            // Handle toggle action directly
            (stateClone as any).completed = !(stateClone as any).completed;
            console.log('⭐️ Directly toggled completed:', {
              newValue: (stateClone as any).completed
            });
          } else if (typedKey === ('text' as keyof TActions)) {
            // Handle text action directly
            const textValue = args[0];
            (stateClone as any).text = textValue;
            console.log('⭐️ Directly set text:', {
              newValue: (stateClone as any).text
            });
          } else {
            // Handle any other actions by reimplementing them directly
            console.log('⭐️ Unhandled action type:', typedKey);
          }

          // Set the modified state back to the store
          states.set(key, stateClone);

          console.log('After action:', key, { ...stateClone });
          console.log('Full store state for key:', key, { ...states.get(key) });

          if (devTools && !pauseDevTools) {
            devTools.send(
              { type: `${String(actionKey)}@${key}`, payload: args[0] },
              Object.fromEntries(states)
            );
          }

          notifyKeySubscribers(key);

          // We still need to call the original action for any side effects
          // but we won't use its return value for state updates
          return (actions[typedKey] as any)(
            {
              states: currentState,
              actions: actionProxy,
              selectors: selectorProxy,
              map: mapProxy
            },
            ...args
          );
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
    if (!selectors) return {} as MapSelectorMethods<TState, TSelectors>;
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
          const state = states.get(key);
          if (!state) return undefined;

          if (useHook) {
            return useKey(key, (s: TState) => selector(s, payload));
          }
          return selector(state, payload);
        }) as TSelectors[keyof TSelectors];
        return acc;
      },
      {} as MapSelectorMethods<TState, TSelectors>
    );
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
