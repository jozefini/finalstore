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

// =====================
// Type Helpers
// =====================

/* eslint-disable @typescript-eslint/no-explicit-any */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AnyType = any;
type IsOptionalPayload<T> = unknown extends T
  ? true
  : undefined extends T
    ? true
    : false;

type ActionArgs<T> =
  IsOptionalPayload<T> extends true
    ? [payload?: T, shouldNotify?: boolean]
    : [payload: T, shouldNotify?: boolean];

// =====================
// Collection Types
// =====================
type ActionFunction<TState, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => void | Promise<void>;

type SelectorFunction<TState, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => any;

type CreateCollectionProps<
  TStates,
  TActions extends Record<string, ActionFunction<TStates, any>>,
  TSelectors extends Record<string, SelectorFunction<TStates, any>>
> = {
  states: TStates;
  actions: TActions;
  selectors: TSelectors;
  initialMap?: Map<string, TStates>;
  config?: {
    devtools?: boolean;
    name?: string;
  };
};

type Subscriber<T> = {
  selector: (state: T) => unknown;
  callback: () => void;
  lastValue: unknown;
};

type CollectionSubscribers<States> = {
  byKey: Map<string, Map<number, Subscriber<States>>>;
  size: Map<number, Subscriber<number>>;
  keys: Map<number, Subscriber<string[]>>;
};

type InferCollection<
  TStates,
  TActions,
  TSelectors extends Record<string, SelectorFunction<TStates, any>> = Record<
    string,
    never
  >
> = {
  clear: () => void;
  reset: () => void;
  useSize: () => number;
  useKeys: () => string[];
  getSize: () => number;
  getKeys: () => string[];
  key: (key: string) => {
    dispatch: {
      [K in keyof TActions]: TActions[K] extends ActionFunction<
        TStates,
        infer P
      >
        ? undefined extends P
          ? () => void
          : (payload: P) => void
        : never;
    };
    remove: () => void;
    set: (state: TStates) => void;
    get: {
      (): TStates | undefined;
      <T>(selector: (state: TStates) => T): T;
    };
    use: {
      (): TStates | undefined;
      <T>(selector: (state: TStates) => T): T;
    };
    getSelector: {
      [K in keyof TSelectors]: TSelectors[K] extends SelectorFunction<
        TStates,
        infer P
      >
        ? undefined extends P
          ? () => ReturnType<TSelectors[K]>
          : (payload: P) => ReturnType<TSelectors[K]>
        : never;
    };
    useSelector: {
      [K in keyof TSelectors]: TSelectors[K] extends SelectorFunction<
        TStates,
        infer P
      >
        ? undefined extends P
          ? () => ReturnType<TSelectors[K]>
          : (payload: P) => ReturnType<TSelectors[K]>
        : never;
    };
  };
};

// =====================
// Collection
// =====================

export function createCollection<
  States,
  Actions extends Record<string, ActionFunction<States, any>>,
  Selectors extends Record<string, SelectorFunction<States, any>>
>(
  props: CreateCollectionProps<States, Actions, Selectors>
): InferCollection<States, Actions, Selectors> {
  const initialMap = props.initialMap
    ? props.initialMap
    : new Map<string, States>();

  let states = new Map<string, States>(initialMap);
  const actions = props.actions;

  // DevTools setup
  let devTools: AnyType = null;
  let pauseDevTools = false;

  // Setup DevTools if enabled
  if (typeof window !== 'undefined' && props.config?.devtools) {
    const devToolsExtension = (window as AnyType).__REDUX_DEVTOOLS_EXTENSION__;
    const devToolsName = props.config?.name || 'Collection';
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
      // Convert Map to object for DevTools
      const statesObject = Object.fromEntries(states);
      devTools.init(statesObject);
      devTools.subscribe((message: AnyType) => {
        if (message.type === 'DISPATCH') {
          switch (message.payload.type) {
            case 'JUMP_TO_ACTION':
            case 'JUMP_TO_STATE':
              try {
                const newState = JSON.parse(message.state);
                pauseDevTools = true;
                // Convert object back to Map
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

  const subscribers: CollectionSubscribers<States> = {
    byKey: new Map(),
    size: new Map(),
    keys: new Map()
  };
  let nextSubscriberId = 0;

  // =====================
  // Subscription Management
  // =====================

  function subscribeToKey(
    key: string,
    callback: () => void,
    selector?: (state: States) => unknown
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
    const initialSelector = selector || ((s: States) => s);
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
  // Collection Operations
  // =====================

  function set(key: string, state: States) {
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
    states = new Map<string, States>(initialMap);

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

  function use(key: string): States | undefined;
  function use<T>(key: string, selector: (state: States) => T): T;
  function use<T>(key: string, selector?: (state: States) => T): States | T {
    const stateRef = useRef(states.get(key));
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | States | undefined>(
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
      | States;
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

  function get(key: string): States | undefined;
  function get<T>(key: string, selector: (state: States) => T): T;
  function get<T>(key: string, selector?: (state: States) => T): States | T {
    const state = states.get(key);
    if (!state) return undefined as States;
    if (!selector) return state;
    return selector(state);
  }

  function getSize() {
    return states.size;
  }

  function getKeys() {
    return Array.from(states.keys());
  }

  async function dispatch<K extends keyof Actions>(
    key: string,
    type: K,
    ...args: ActionArgs<Actions[K]>
  ): Promise<void> {
    const state = states.get(key);
    if (!state) return;
    const cb = actions[type];
    if (typeof cb !== 'function') return;

    const [payload, shouldNotify = true] = args;
    const newState = { ...state };
    const result = cb(
      newState,
      payload ?? (undefined as unknown as Actions[K])
    );

    // Handle async actions
    if (result instanceof Promise) {
      await result;
    }

    states.set(key, newState);

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: `${String(type)}@${key}`, payload },
        Object.fromEntries(states)
      );
    }

    if (shouldNotify) {
      notifyKeySubscribers(key);
    }
  }

  // Create dispatch object for a specific key
  function createKeyDispatch(key: string) {
    return Object.keys(actions).reduce((acc, actionKey) => {
      acc[actionKey] = (payload?: any) => {
        void dispatch(key, actionKey, payload);
      };
      return acc;
    }, {} as any);
  }

  // Create key-specific get method
  function createKeyGet(key: string) {
    function get(): States | undefined;
    function get<T>(selector: (state: States) => T): T;
    function get<T>(selector?: (state: States) => T): States | T {
      const state = states.get(key);
      if (!state) return undefined as States;
      if (!selector) return state;
      return selector(state);
    }
    return get;
  }

  // Create key-specific use method
  function createKeyUse(key: string) {
    function use(): States | undefined;
    function use<T>(selector: (state: States) => T): T;
    function use<T>(selector?: (state: States) => T): States | T {
      return useKey(key, selector);
    }
    return use;
  }

  // Rename existing use to useKey (internal function)
  function useKey<T>(key: string, selector?: (state: States) => T): States | T {
    const stateRef = useRef(states.get(key));
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | States | undefined>(
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
      | States;
  }

  // Update key method to include get and use
  function key(id: string) {
    // Create selector methods for both get and use
    const createSelectorMethods = (useHook?: boolean) => {
      if (!props.selectors) return {};

      return Object.keys(props.selectors).reduce((acc, key) => {
        acc[key] = (payload?: any) => {
          const selector = props.selectors[key];
          const state = states.get(id);
          if (!state) return undefined;

          if (useHook) {
            return useKey(id, (s) => selector(s, payload));
          }
          return selector(state, payload);
        };
        return acc;
      }, {} as any);
    };

    return {
      dispatch: createKeyDispatch(id),
      remove: () => remove(id),
      set: (state: States) => set(id, state),
      get: createKeyGet(id),
      use: createKeyUse(id),
      getSelector: createSelectorMethods(false),
      useSelector: createSelectorMethods(true)
    };
  }

  return {
    clear,
    reset,
    useSize,
    useKeys,
    getSize,
    getKeys,
    key
  };
}

// =====================
// Context Collection
// =====================

export function createScopedCollection<
  States,
  Actions extends Record<string, ActionFunction<States, any>>,
  Selectors extends Record<string, SelectorFunction<States, any>>
>(props: CreateCollectionProps<States, Actions, Selectors>) {
  const StoreContext = createContext<InferCollection<
    States,
    Actions,
    Selectors
  > | null>(null);
  const Provider = ({ children }: { children: ReactNode }) => {
    const store = useMemo(
      () => createCollection<States, Actions, Selectors>(props),
      [props]
    );
    useEffect(() => {
      return () => {
        store.reset();
      };
    }, [store]);
    return createElement(StoreContext.Provider, { value: store }, children);
  };
  function useStore(): InferCollection<States, Actions, Selectors> {
    const context = useContext(StoreContext);
    if (!context) {
      throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
  }
  return { Provider, useStore };
}
