import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type FC
} from 'react';

import { isDeepEqual } from './store';

// =====================
// Types
// =====================

type CreateCollectionProps<States, Actions extends Record<string, unknown>> = {
  actions: {
    [K in keyof Actions]: (
      state: States,
      payload: Actions[K]
    ) => void | Promise<void>;
  };
  initialMap?: Map<string, States>;
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

export type CreateCollection<
  States,
  Actions extends Record<string, unknown>
> = {
  insert: (key: string, state: States) => void;
  remove: (key: string) => void;
  clear: () => void;
  reset: () => void;
  use: {
    (key: string): States | undefined;
    <T>(key: string, selector: (state: States) => T): T;
  };
  useSize: () => number;
  useKeys: () => string[];
  get: {
    (key: string): States | undefined;
    <T>(key: string, selector: (state: States) => T): T;
  };
  getSize: () => number;
  getKeys: () => string[];
  dispatch: <K extends keyof Actions>(
    key: string,
    type: K,
    payload: Actions[K]
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

    const keySubscribers = subscribers.byKey.get(key)!;
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
    subscribers.byKey.forEach((keySubscribers) => {
      keySubscribers.forEach((sub) => {
        sub.callback();
      });
    });
  }

  function notifyKeySubscribers(key: string) {
    const keySubscribers = subscribers.byKey.get(key);
    if (!keySubscribers) return;

    const state = states.get(key);
    if (!state) return;

    keySubscribers.forEach((sub) => {
      const newValue = sub.selector(state);
      if (!isDeepEqual(newValue, sub.lastValue)) {
        sub.lastValue = newValue;
        sub.callback();
      }
    });
  }

  function notifySizeSubscribers() {
    subscribers.size.forEach((sub) => {
      const newValue = states.size;
      if (newValue !== sub.lastValue) {
        sub.lastValue = newValue;
        sub.callback();
      }
    });
  }

  function notifyKeysSubscribers() {
    const currentKeys = Array.from(states.keys());
    subscribers.keys.forEach((sub) => {
      const newKeys = currentKeys;
      if (!isDeepEqual(newKeys, sub.lastValue)) {
        sub.lastValue = newKeys;
        sub.callback();
      }
    });
  }

  // =====================
  // Collection Operations
  // =====================

  function insert(key: string, state: States) {
    const hadKey = states.has(key);
    states.set(key, state);
    notifyKeySubscribers(key);

    if (!hadKey) {
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  function remove(key: string) {
    const hadKey = states.delete(key);
    if (hadKey) {
      notifyKeySubscribers(key);
      notifySizeSubscribers();
      notifyKeysSubscribers();
    }
  }

  function clear() {
    const wasEmpty = states.size === 0;
    states.clear();

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
    payload: Actions[K],
    shouldNotify = true
  ): Promise<void> {
    const state = states.get(key);
    if (!state) return;
    const cb = actions[type];
    if (typeof cb !== 'function') return;

    const newState = { ...state };
    const result = cb(newState, payload);

    // Handle async actions
    if (result instanceof Promise) {
      await result;
    }

    states.set(key, newState);

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
  const StoreContext = createContext<CreateCollection<States, Actions> | null>(
    null
  );
  const Provider: FC<{ children: React.ReactNode }> = ({ children }) => {
    const store = useMemo(() => createCollection<States, Actions>(props), []);
    useEffect(() => {
      return () => {
        store.reset();
      };
    }, []);
    return (
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    );
  };
  function useStore(): CreateCollection<States, Actions> {
    const context = useContext(StoreContext);
    if (!context) {
      throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
  }
  return { Provider, useStore };
}
