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

// type PayloadByAction<TStates, TActions> = {
//   [K in keyof TActions]: TActions[K] extends ActionFunction<TStates, infer P>
//     ? P
//     : never;
// };

type CreateCollectionProps<TStates, TActions> = {
  states: TStates;
  actions: {
    [K in keyof TActions]: ActionFunction<TStates, TActions[K]>;
  };
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

type InferCollection<TStates, TActions> = {
  insert: (key: string, state: TStates) => void;
  remove: (key: string) => void;
  clear: () => void;
  reset: () => void;
  use: {
    (key: string): TStates | undefined;
    <T>(key: string, selector: (state: TStates) => T): T;
  };
  useSize: () => number;
  useKeys: () => string[];
  get: {
    (key: string): TStates | undefined;
    <T>(key: string, selector: (state: TStates) => T): T;
  };
  getSize: () => number;
  getKeys: () => string[];
  dispatch: <K extends keyof TActions>(
    key: string,
    type: K,
    ...args: ActionArgs<TActions[K]>
  ) => Promise<void>;
};

// =====================
// Collection
// =====================

export function createCollection<
  States,
  Actions extends Record<string, unknown>
>(props: CreateCollectionProps<States, Actions>) {
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

  function insert(key: string, state: States) {
    const hadKey = states.has(key);
    states.set(key, state);

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send(
        { type: 'INSERT', payload: { key, state } },
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
    const result = cb(newState, payload ?? (undefined as Actions[K]));

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

  return {
    insert,
    remove,
    clear,
    reset,
    use,
    useSize,
    useKeys,
    get,
    getSize,
    getKeys,
    dispatch
  };
}

// =====================
// Context Collection
// =====================

export function createScopedCollection<
  States,
  Actions extends Record<string, unknown>
>(props: CreateCollectionProps<States, Actions>) {
  const StoreContext = createContext<InferCollection<States, Actions> | null>(
    null
  );
  const Provider = ({ children }: { children: ReactNode }) => {
    const store = useMemo(
      () => createCollection<States, Actions>(props),
      [props]
    );
    useEffect(() => {
      return () => {
        store.reset();
      };
    }, [store]);
    return createElement(StoreContext.Provider, { value: store }, children);
  };
  function useStore(): InferCollection<States, Actions> {
    const context = useContext(StoreContext);
    if (!context) {
      throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
  }
  return { Provider, useStore };
}
