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
import type {
  AnyType,
  CollectionActionFunction,
  CollectionSelectorFunction,
  CollectionSubscribers,
  CreateCollectionProps,
  InferCollection
} from './types';

// =====================
// Collection
// =====================

export function createCollection<
  States,
  Actions extends Record<string, CollectionActionFunction<States, AnyType>>,
  Selectors extends Record<string, CollectionSelectorFunction<States, AnyType>>
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
    payload?: Actions[K] extends CollectionActionFunction<States, infer P>
      ? P
      : never,
    shouldNotify = true
  ): Promise<ReturnType<Actions[K]>> {
    const state = states.get(key);
    if (!state) throw new Error(`Key ${key} not found`);

    const cb = actions[type];
    if (typeof cb !== 'function')
      throw new Error(`Action ${String(type)} not found`);

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

    return finalResult as ReturnType<Actions[K]>;
  }

  function createKeyDispatch(key: string, shouldNotify = true) {
    return Object.keys(actions).reduce((acc, actionKey) => {
      acc[actionKey] = (payload?: AnyType) => {
        const cb = actions[actionKey];
        const state = states.get(key);
        if (!state) throw new Error(`Key ${key} not found`);

        const newState = { ...state };

        if (cb.constructor.name === 'AsyncFunction') {
          return dispatch(key, actionKey, payload, shouldNotify);
        } else {
          const result = cb(newState, payload);
          states.set(key, newState);
          if (devTools && !pauseDevTools) {
            devTools.send(
              { type: `${String(actionKey)}@${key}`, payload },
              Object.fromEntries(states)
            );
          }
          if (shouldNotify) {
            notifyKeySubscribers(key);
          }
          return result;
        }
      };
      return acc;
    }, {} as AnyType);
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
    return function use<T>(selector?: (state: States) => T): States | T {
      return useKey(key, selector);
    };
  }

  // Create selector methods for both get and use
  function createSelectorMethods(useHook?: boolean) {
    if (!props.selectors) return {};
    return Object.keys(props.selectors).reduce((acc, key) => {
      acc[key] = (payload?: AnyType) => {
        const state = get(key);
        if (!state) return undefined;

        if (useHook) {
          return useKey(key, (s: States) => props.selectors[key](s, payload));
        }
        return props.selectors[key](state, payload);
      };
      return acc;
    }, {} as AnyType);
  }

  function key(id: string) {
    return {
      dispatch: createKeyDispatch(id, true),
      silentDispatch: createKeyDispatch(id, false),
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
  Actions extends Record<string, CollectionActionFunction<States, AnyType>>,
  Selectors extends Record<string, CollectionSelectorFunction<States, AnyType>>
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
