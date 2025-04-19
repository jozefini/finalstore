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
type ActionsContext<TState, TActions, TSelectors> = (store: {
  states: TState;
  actions: TActions;
  selectors: TSelectors;
}) => TActions;
type SelectorsContext<TState, TSelectors> = (store: {
  states: TState;
  selectors: TSelectors;
}) => TSelectors;
type StoreProps<TState, TActions, TSelectors> = {
  states: TState;
  actions?: ActionsContext<TState, TActions, TSelectors>;
  selectors?: SelectorsContext<TState, TSelectors>;
  config?: {
    name?: string;
    devtools?: boolean;
  };
};

// Action and selector types
type StoreActionFunction<TPayload = undefined> = (
  payload: TPayload
) => unknown | Promise<unknown>;

type StoreSelectorFunction<TResult, TPayload = undefined> = (
  payload?: TPayload
) => TResult;

type PayloadByAction<TActions> = {
  [K in keyof TActions]: TActions[K] extends StoreActionFunction<infer P>
    ? P
    : never;
};

// DevTools Types
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

// Update the InferStore type to match our implementation
type InferStore<TState, TActions, TSelectors> = {
  dispatch: TActions;
  use: {
    (): TState;
    <T>(selector: (state: TState) => T): T;
  } & {
    [K in keyof TSelectors]: TSelectors[K];
  };
  get: {
    (): TState;
    <T>(selector: (state: TState) => T): T;
  } & {
    [K in keyof TSelectors]: TSelectors[K];
  };
  reset: () => void;
  batch: (callback: () => void) => void; // Batching API
};

// Utility for batching updates
const createBatcher = () => {
  let isBatching = false;
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
          // Always call notify when batch finishes at top level
          const cb = notifyCallback;
          notifyCallback = null;
          cb();
        }
      }
    } else {
      // If already batching, just execute the function
      // and queue notification for the parent batch
      fn();
    }
  };

  const shouldNotify = () => !isBatching;

  return { batch, shouldNotify };
};

// HELPERS:

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

// STORE:

export function createStore<
  TState extends Record<string, unknown> = AnyType,
  TActions extends Record<string, StoreActionFunction<AnyType>> = AnyType,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<AnyType, AnyType>
  > = AnyType
>(
  props: StoreProps<TState, TActions, TSelectors>
): InferStore<TState, TActions, TSelectors> {
  const initialStates = { ...props.states };
  let states = { ...initialStates };

  // Create a batcher for update batching
  const { batch, shouldNotify } = createBatcher();

  // Create a proxy for states that always points to the current value
  const statesProxy = new Proxy({} as TState, {
    get: (_target, prop) => {
      return states[prop as keyof TState];
    },
    set: (_target, prop, value) => {
      states[prop as keyof TState] = value;
      return true;
    }
  });

  const actionProxy =
    (props?.actions as unknown as TActions) || ({} as TActions);
  const selectorProxy =
    (props?.selectors as unknown as TSelectors) || ({} as TSelectors);

  // DevTools setup
  let devTools: DevTools | null = null;
  let pauseDevTools = false;

  // Setup DevTools if enabled
  if (typeof window !== 'undefined' && props.config?.devtools) {
    const w = window as unknown as {
      __REDUX_DEVTOOLS_EXTENSION__?: DevTools;
    };
    const devToolsExtension = w.__REDUX_DEVTOOLS_EXTENSION__;
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
      devTools?.init(states);
      devTools?.subscribe((message) => {
        if (message.type === 'DISPATCH') {
          switch (message.payload.type) {
            case 'JUMP_TO_ACTION':
            case 'JUMP_TO_STATE':
              try {
                const newState = JSON.parse(message.state || '{}');
                pauseDevTools = true;
                states = newState;
                notify();
                pauseDevTools = false;
              } catch (error) {
                // eslint-disable-next-line no-console
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

  // Initialize actions and selectors with provided functions or empty objects
  const actions = props.actions
    ? props.actions({
        states: statesProxy,
        actions: actionProxy,
        selectors: selectorProxy
      })
    : ({} as TActions);

  const selectors = props.selectors
    ? props.selectors({
        states: statesProxy,
        selectors: selectorProxy
      })
    : ({} as TSelectors);

  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // Subscribers for reactivity with memoization
  const subscriberMap = new Map<
    number,
    {
      selector: (state: TState) => unknown;
      callback: () => void;
      lastValue: unknown;
      memoizedSelector?: (state: TState) => unknown;
    }
  >();
  let nextSubscriberId = 0;

  const selectorCache = new WeakMap();

  function getState() {
    return states;
  }

  function memoizeSelector<T>(
    selector: (state: TState) => T
  ): (state: TState) => T {
    // Return a memoized version of the selector
    return (state: TState) => {
      const cache = selectorCache.get(selector);

      if (!cache || cache.lastState !== state) {
        // If no cache entry or state reference changed, compute the result
        const result = selector(state);
        selectorCache.set(selector, { lastState: state, lastResult: result });
        return result;
      }

      return cache.lastResult as T;
    };
  }

  function subscribe(
    callback: () => void,
    selector?: (state: TState) => unknown
  ) {
    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: TState) => s);
    // Memoize the selector for better performance
    const memoizedSelector = memoizeSelector(initialSelector);
    const initialValue = memoizedSelector(getState());

    subscriberMap.set(id, {
      selector: initialSelector,
      memoizedSelector,
      callback,
      lastValue: initialValue
    });

    return () => {
      subscriberMap.delete(id);
    };
  }

  function notify() {
    const subs = Array.from(subscriberMap.values());
    const currentState = getState();

    for (const sub of subs) {
      const selector = sub.memoizedSelector || sub.selector;
      const newValue = selector(currentState);

      if (!isDeepEqual(newValue, sub.lastValue)) {
        sub.lastValue = newValue;
        sub.callback();
      }
    }
  }

  // Create dispatch functions
  const createDispatchObject = () =>
    Object.keys(actions).reduce((acc, actionKey) => {
      acc[actionKey] = (payload?: AnyType) => {
        const cb = actions[actionKey];

        // Execute the action
        const result = cb(payload);

        // Create a new reference for the state object so React detects changes
        states = { ...states };

        if (result instanceof Promise) {
          // For async actions, return the Promise chain
          return dispatch(actionKey, payload);
        }

        // Send to DevTools
        if (devTools && !pauseDevTools) {
          devTools.send({ type: String(actionKey), payload }, states);
        }

        if (shouldNotify()) {
          notify();
        }

        return result;
      };
      return acc;
    }, {} as AnyType);

  const dispatchObject = createDispatchObject();

  // Run multiple actions in a batch with a single notification at the end
  function batchActions(callback: () => void) {
    const prevState = { ...states };
    batch(
      () => {
        callback();
        states = { ...states };
      },
      () => {
        if (!isDeepEqual(prevState, states)) {
          notify();
        }
      }
    );
  }

  // Dedicated async dispatch helper
  async function dispatch<K extends keyof TActions>(
    type: K,
    payload?: PayloadByAction<TActions>[K]
  ): Promise<ReturnType<TActions[K]>> {
    const cb = actions[type];
    if (typeof cb !== 'function')
      throw new Error(`Action ${String(type)} not found`);

    // Execute the action
    const result = cb(payload);

    // Create a new reference for the state object so React detects changes
    states = { ...states };

    // We know this is async at this point
    const finalResult = await result;

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: String(type), payload }, states);
    }

    notify();

    return finalResult as ReturnType<TActions[K]>;
  }

  // Reset function
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

  // Get with function overloading and memoization
  function get(): TState;
  function get<T>(selector: (state: TState) => T): T;
  function get<T>(selector?: (state: TState) => T): TState | T {
    if (!selector) return getState();

    // Use memoized selector for better performance
    const memoizedSel = memoizeSelector(selector);
    return memoizedSel(getState());
  }

  // Create wrapped selector functions for the "get" object
  const wrappedGetSelectors = Object.keys(selectors).reduce(
    (acc, key) => {
      // Create a wrapper function that calls the original selector
      acc[key] = function (...args: any) {
        // Convert the predefined selector to a regular state selector
        // for use with the memoization system
        const wrappedSelector = (_state: TState) => {
          return (selectors[key as keyof TSelectors] as any)(...args);
        };

        return get(wrappedSelector);
      };

      return acc;
    },
    {} as Record<string, any>
  );

  Object.assign(get, wrappedGetSelectors);

  // Use with React hooks and optimized subscriptions
  function use(): TState;
  function use<T>(selector: (state: TState) => T): T;
  function use<T extends unknown[]>(selector: (state: TState) => T): T;
  function use<T>(selector?: (state: TState) => T): TState | T {
    const stateRef = useRef(getState());
    const selectorRef = useRef(selector);

    // Memoize the selector function to prevent unnecessary recalculations
    const memoizedSelector = useMemo(
      () => (selector ? memoizeSelector(selector) : undefined),
      [selector]
    );

    const valueRef = useRef<T | TState>(
      memoizedSelector ? memoizedSelector(getState()) : getState()
    );

    // Update references if selector changes
    if (selector !== selectorRef.current) {
      selectorRef.current = selector;
      stateRef.current = getState();
      valueRef.current = memoizedSelector
        ? (memoizedSelector(stateRef.current) as T | TState)
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
        valueRef.current = memoizedSelector
          ? (memoizedSelector(currentState) as T | TState)
          : currentState;
      }

      return valueRef.current;
    }, [memoizedSelector]);

    return useSyncExternalStore(subscribeFn, getSnapshot, getSnapshot);
  }

  // Create wrapped selector functions for the "use" object
  const wrappedSelectors = Object.keys(selectors).reduce(
    (acc, key) => {
      // Create a wrapper function that calls the original selector
      acc[key] = function (...args: any) {
        // Convert the predefined selector to a regular state selector
        // for use with the subscription system
        const wrappedSelector = (_state: TState) => {
          return (selectors[key as keyof TSelectors] as any)(...args);
        };

        return use(wrappedSelector);
      };

      return acc;
    },
    {} as Record<string, any>
  );

  Object.assign(use, wrappedSelectors);

  return {
    dispatch: dispatchObject as unknown as TActions,
    use: use as typeof use & TSelectors,
    get: get as typeof get & TSelectors,
    reset,
    batch: batchActions
  };
}

export function createScopedStore<
  TState extends Record<string, unknown> = AnyType,
  TActions extends Record<string, StoreActionFunction<AnyType>> = AnyType,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<AnyType, AnyType>
  > = AnyType
>(props: StoreProps<TState, TActions, TSelectors>) {
  type StoreType = InferStore<TState, TActions, TSelectors>;
  type ReactNode = React.ReactNode;

  const StoreContext = createContext<StoreType | null>(null);

  const Provider = ({ children }: { children: ReactNode }) => {
    const store = useMemo(
      () => createStore<TState, TActions, TSelectors>(props),
      []
    );

    // Clean up when the component unmounts
    useEffect(() => {
      return () => {
        store.reset();
      };
    }, [store]);

    return createElement(StoreContext.Provider, { value: store }, children);
  };

  function useStore(): StoreType {
    const context = useContext(StoreContext);
    if (!context) {
      throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
  }

  return { Provider, useStore };
}
