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
type ActionsContext<TState, TActions, TSelectors, TEvents> = (store: {
  states: TState;
  actions: TActions;
  selectors: TSelectors;
  trigger: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ) => void;
}) => TActions;
type SelectorsContext<TState, TSelectors> = (store: {
  states: TState;
  selectors: TSelectors;
}) => TSelectors;
type StoreProps<
  TState,
  TActions,
  TSelectors,
  TEvents = Record<string, unknown>
> = {
  states: TState;
  actions?: ActionsContext<TState, TActions, TSelectors, TEvents>;
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

// Event types
type EventCallback<TPayload = unknown> = (payload: TPayload) => void;
type EventMap<TEvents> = Map<string, Map<string, EventCallback<any>>>;
type EventPayload<
  TEvents,
  TEventName extends keyof TEvents
> = TEvents[TEventName];

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
type InferStore<
  TState,
  TActions,
  TSelectors,
  TEvents = Record<string, unknown>
> = {
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
  on: <TEventName extends keyof TEvents>(
    id: string,
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ) => void;
  off: (id: string) => void;
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

export function deepClone<T>(obj: T): T {
  // Handle primitive types, null, and undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  // Handle Array objects
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as any;
  }
  // Handle Map objects
  if (obj instanceof Map) {
    const result = new Map();
    obj.forEach((value, key) => {
      result.set(deepClone(key), deepClone(value));
    });
    return result as any;
  }
  // Handle Set objects
  if (obj instanceof Set) {
    const result = new Set();
    obj.forEach((value) => {
      result.add(deepClone(value));
    });
    return result as any;
  }
  // Handle regular objects
  const result = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key]);
    }
  }
  return result;
}

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
  > = AnyType,
  TEvents extends Record<string, unknown> = Record<string, unknown>
>(
  props: StoreProps<TState, TActions, TSelectors, TEvents>
): InferStore<TState, TActions, TSelectors, TEvents> {
  const initialStates = deepClone(props.states);
  let states = deepClone(initialStates);

  // Create event map
  const events: EventMap<TEvents> = new Map();

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

  // Event management functions
  function trigger<TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ) {
    const eventCallbacks = events.get(eventName as string);
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => {
        callback(payload);
      });
    }
  }

  function on<TEventName extends keyof TEvents>(
    id: string,
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ) {
    if (!events.has(eventName as string)) {
      events.set(eventName as string, new Map());
    }
    const eventCallbacks = events.get(eventName as string)!;
    eventCallbacks.set(id, callback as EventCallback);
  }

  function off(id: string) {
    events.forEach((eventCallbacks) => {
      eventCallbacks.delete(id);
    });
  }

  // Initialize actions and selectors with provided functions or empty objects
  const actionProxy =
    (props?.actions as unknown as TActions) || ({} as TActions);
  const selectorProxy =
    (props?.selectors as unknown as TSelectors) || ({} as TSelectors);

  const actions = props.actions
    ? props.actions({
        states: statesProxy,
        actions: actionProxy,
        selectors: selectorProxy,
        trigger
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
        states = deepClone(states);

        if (result instanceof Promise) {
          // For async actions, handle the promise properly
          return result.then((finalResult) => {
            // Send to DevTools after async completion
            if (devTools && !pauseDevTools) {
              devTools.send({ type: String(actionKey), payload }, states);
            }

            notify();
            return finalResult;
          });
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
    const prevState = deepClone(states);
    batch(
      () => {
        callback();
        states = deepClone(states);
      },
      () => {
        if (!isDeepEqual(prevState, states)) {
          notify();
        }
      }
    );
  }

  // Reset function
  function reset() {
    const prevStates = states;
    states = deepClone(initialStates);
    events.clear(); // Clear all events on reset

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
    batch: batchActions,
    on,
    off
  };
}

export function createScopedStore<
  TState extends Record<string, unknown> = AnyType,
  TActions extends Record<string, StoreActionFunction<AnyType>> = AnyType,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<AnyType, AnyType>
  > = AnyType,
  TEvents extends Record<string, unknown> = Record<string, unknown>
>(props: StoreProps<TState, TActions, TSelectors, TEvents>) {
  type StoreType = InferStore<TState, TActions, TSelectors, TEvents>;
  type ReactNode = React.ReactNode;

  const StoreContext = createContext<StoreType | null>(null);

  const Provider = ({ children }: { children: ReactNode }) => {
    const store = useMemo(
      () => createStore<TState, TActions, TSelectors, TEvents>(props),
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
