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

// =====================
// Types
// =====================

type CreateStoreProps<States, Actions extends Record<string, unknown>> = {
  states: States;
  config?: {
    name?: string;
    devtools?: boolean;
  };
  actions: {
    [K in keyof Actions]: (
      state: States,
      payload: Actions[K]
    ) => void | Promise<void>;
  };
};
export type CreateStore<States, Actions extends Record<string, unknown>> = {
  use: {
    (): States;
    <T>(selector: (state: States) => T): T;
    <T extends unknown[]>(selector: (state: States) => T): T;
  };
  get: {
    (): States;
    <T>(selector: (state: States) => T): T;
  };
  dispatch: <K extends keyof Actions>(type: K, payload: Actions[K]) => void;
  reset: () => void;
};

// =====================
// Utils
// =====================

export function isDeepEqual(a: unknown, b: unknown): boolean {
  // Direct reference equality
  if (a === b) return true;

  // Handle null/undefined
  if (a == null || b == null) return false;

  // Simple type check
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return Object.is(a, b);

  // Type guard for arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle regular objects
  if (Array.isArray(b)) return false;

  // Type guard for objects
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  const keys = Object.keys(objA);
  if (keys.length !== Object.keys(objB).length) return false;

  for (const key of keys) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !isDeepEqual(objA[key], objB[key])
    ) {
      return false;
    }
  }

  return true;
}

// =====================
// Store
// =====================

export function createStore<States, Actions extends Record<string, unknown>>(
  props: CreateStoreProps<States, Actions>
) {
  const initialStates = { ...props.states };
  let states = { ...initialStates };
  const actions = props.actions;

  // DevTools setup
  let devTools: any = null;
  let pauseDevTools = false;

  // Setup DevTools if enabled
  if (typeof window !== 'undefined' && props.config?.devtools) {
    const devToolsExtension = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
    const devToolsName = props.config?.name || 'Store';
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
      devTools.init(states);
      devTools.subscribe((message: any) => {
        if (message.type === 'DISPATCH') {
          switch (message.payload.type) {
            case 'JUMP_TO_ACTION':
            case 'JUMP_TO_STATE':
              try {
                const newState = JSON.parse(message.state);
                pauseDevTools = true;
                states = newState;
                notify();
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

  const subscribers = new Map<
    number,
    {
      selector: (state: States) => unknown;
      callback: () => void;
      lastValue: unknown;
    }
  >();
  let nextSubscriberId = 0;

  function getState() {
    return states;
  }

  function subscribe(
    callback: () => void,
    selector?: (state: States) => unknown
  ) {
    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: States) => s);
    const initialValue = initialSelector(getState());

    subscribers.set(id, {
      selector: initialSelector,
      callback,
      lastValue: initialValue
    });

    return () => {
      subscribers.delete(id);
    };
  }

  function notify() {
    subscribers.forEach((sub) => {
      const currentState = getState();
      const newValue = sub.selector(currentState);

      if (!isDeepEqual(newValue, sub.lastValue)) {
        sub.lastValue = newValue;
        sub.callback();
      }
    });
  }

  function use(): States;
  function use<T>(selector: (state: States) => T): T;
  function use<T extends unknown[]>(selector: (state: States) => T): T;
  function use<T>(selector?: (state: States) => T): States | T {
    const stateRef = useRef(getState());
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | States>(
      selector ? selector(getState()) : getState()
    );

    if (selector !== selectorRef.current) {
      selectorRef.current = selector;
      stateRef.current = getState();
      valueRef.current = selector
        ? selector(stateRef.current)
        : stateRef.current;
    }

    const subscribeFn = useCallback(
      (callback: () => void) => {
        return subscribe(callback, selector);
      },
      [selector]
    );

    const getSnapshot = useCallback(() => {
      const currentState = getState();
      const hasStateChanged = currentState !== stateRef.current;

      if (hasStateChanged || !valueRef.current) {
        stateRef.current = currentState;
        valueRef.current = selector ? selector(currentState) : currentState;
      }

      return valueRef.current;
    }, [selector]);

    return useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot);
  }

  function get(): States;
  function get<T>(selector: (state: States) => T): T;
  function get<T>(selector?: (state: States) => T): States | T {
    if (!selector) return getState();
    return selector(getState());
  }

  async function dispatch<K extends keyof Actions>(
    type: K,
    payload: Actions[K],
    shouldNotify = true
  ): Promise<void> {
    const cb = actions[type];
    if (typeof cb !== 'function') return;

    const newState = { ...states };
    const result = cb(newState, payload);

    // Handle async actions
    if (result instanceof Promise) {
      await result;
    }

    states = newState;

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: String(type), payload }, states);
    }

    if (shouldNotify) {
      notify();
    }
  }

  function reset() {
    const prevStates = states;
    states = { ...initialStates };

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'RESET' }, states);
    }

    if (!isDeepEqual(prevStates, states)) {
      notify();
    }
  }

  return {
    use,
    get,
    dispatch,
    reset
  };
}

// =====================
// Context Store
// =====================

export function createScopedStore<
  States,
  Actions extends Record<string, unknown>
>(props: CreateStoreProps<States, Actions>) {
  const StoreContext = createContext<CreateStore<States, Actions> | null>(null);
  const Provider: FC<{ children: React.ReactNode }> = ({ children }) => {
    // biome-ignore lint: ignore
    const store = useMemo(() => createStore<States, Actions>(props), []);
    useEffect(() => {
      return () => {
        store.reset();
      };
    }, []);
    return (
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    );
  };
  function useStore(): CreateStore<States, Actions> {
    const context = useContext(StoreContext);
    if (!context) {
      throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
  }
  return { Provider, useStore };
}
