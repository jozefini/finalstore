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

export type AnyType = any;
type ActionsContext<TState, TActions, TSelectors, TEvents> = (store: {
  states: TState;
  actions: TActions;
  selectors: TSelectors;
  trigger: <TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ) => void;
  notify: () => void;
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
type EventListener = { off: () => void };
type EventMap = Map<string, Set<EventCallback<any>>>;
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
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ) => EventListener;
};

// Utility for batching updates
const createBatcher = () => {
  let isBatching = false;
  let notifyCallback: (() => void) | null = null;
  let batchedActions: { type: string; payload: any }[] = [];

  const batch = (fn: () => void, notify: () => void) => {
    if (!isBatching) {
      // If not already batching, start a new batch
      isBatching = true;
      notifyCallback = notify;
      batchedActions = [];
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
        batchedActions = [];
      }
    } else {
      // If already batching, just execute the function
      // and queue notification for the parent batch
      fn();
    }
  };

  const shouldNotify = () => !isBatching;
  const getBatchedActions = () => batchedActions;
  const addBatchedAction = (action: { type: string; payload: any }) => {
    if (isBatching) {
      batchedActions.push(action);
    }
  };

  return {
    batch,
    shouldNotify,
    getBatchedActions,
    addBatchedAction,
    isBatching: () => isBatching
  };
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

  // State change tracking for optimization
  let stateChanged = false;
  let stateVersion = 0;

  // Create event map
  const events: EventMap = new Map();

  // Create a batcher for update batching
  const {
    batch,
    shouldNotify,
    getBatchedActions,
    addBatchedAction,
    isBatching
  } = createBatcher();

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

  // Microtask batching for performance
  let microtaskScheduled = false;
  let pendingDevToolsActions: { type: string; payload: any }[] = [];

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
                notifySubscribers();
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
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ): EventListener {
    if (!events.has(eventName as string)) {
      events.set(eventName as string, new Set());
    }
    const eventCallbacks = events.get(eventName as string)!;
    const typedCallback = callback as EventCallback;
    eventCallbacks.add(typedCallback);

    return {
      off: () => {
        eventCallbacks.delete(typedCallback);
      }
    };
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
        trigger,
        notify: () => {
          // Force immediate notification for async operations
          // Clone state to ensure reference changes are detected
          states = deepClone(states);
          stateVersion++;
          // Call notifySubscribers directly for immediate updates
          notifySubscribers();
        }
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
    // Return a memoized version of the selector using stateVersion for better performance
    return (state: TState) => {
      const cache = selectorCache.get(selector);

      if (!cache || cache.lastStateVersion !== stateVersion) {
        // If no cache entry or state version changed, compute the result
        const result = selector(state);
        selectorCache.set(selector, {
          lastStateVersion: stateVersion,
          lastResult: result
        });
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

    // Only memoize selectors that actually transform the state
    // For entire store subscriptions (no selector), don't memoize to avoid cache issues
    const shouldMemoize = selector !== undefined;
    const memoizedSelector = shouldMemoize
      ? memoizeSelector(initialSelector)
      : undefined;
    const initialValue = memoizedSelector
      ? memoizedSelector(getState())
      : initialSelector(getState());

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

  // Optimized notification with microtask batching
  function scheduleNotification() {
    if (!microtaskScheduled) {
      microtaskScheduled = true;
      queueMicrotask(() => {
        notifySubscribers();
        microtaskScheduled = false;
      });
    }
  }

  function notifySubscribers() {
    const currentState = getState();

    // Use for-of loop directly on Map.values() for better performance
    for (const sub of subscriberMap.values()) {
      const selector = sub.memoizedSelector || sub.selector;
      const newValue = selector(currentState);

      // For entire store subscriptions (no memoized selector), use reference equality
      // For specific selectors, use deep equality
      const hasChanged = sub.memoizedSelector
        ? !isDeepEqual(newValue, sub.lastValue)
        : newValue !== sub.lastValue;

      if (hasChanged) {
        sub.lastValue = newValue;
        sub.callback();
      }
    }
  }

  function notify() {
    notifySubscribers();
  }

  // Optimized DevTools with deferred sending
  function scheduleDevTools(actionInfo: { type: string; payload: any }) {
    if (devTools && !pauseDevTools) {
      pendingDevToolsActions.push(actionInfo);

      if (!microtaskScheduled) {
        queueMicrotask(() => {
          if (pendingDevToolsActions.length === 1) {
            // Single action - send directly
            devTools!.send(pendingDevToolsActions[0], states);
          } else if (pendingDevToolsActions.length > 1) {
            // Multiple actions - send as batch
            devTools!.send(
              {
                type: 'MICROTASK_BATCH',
                payload: pendingDevToolsActions
              },
              states
            );
          }
          pendingDevToolsActions = [];
        });
      }
    }
  }

  // Create dispatch functions
  const createDispatchObject = () =>
    Object.keys(actions).reduce((acc, actionKey) => {
      acc[actionKey] = (payload?: AnyType) => {
        const cb = actions[actionKey];
        const actionInfo = { type: String(actionKey), payload };

        // Execute the action
        const result = cb(payload);

        // Always mark as changed when action runs (safe approach for all mutations)
        stateChanged = true;

        // Only clone state if not batching (optimization)
        if (!isBatching()) {
          states = deepClone(states);
          stateVersion++; // Increment version for cache invalidation
        }

        if (result instanceof Promise) {
          // For async actions, handle the promise properly
          return result
            .then((finalResult) => {
              // For async actions, always clone and notify since they complete outside the original action context
              states = deepClone(states);
              stateVersion++;

              // Use optimized DevTools scheduling
              scheduleDevTools(actionInfo);

              // Always notify after async completion
              scheduleNotification();
              return finalResult;
            })
            .catch((error) => {
              // Also handle errors - clone state and notify
              states = deepClone(states);
              stateVersion++;

              // Use optimized DevTools scheduling
              scheduleDevTools({
                type: `${actionInfo.type}_ERROR`,
                payload: { ...actionInfo.payload, error: error.message }
              });

              // Always notify after async error
              scheduleNotification();
              throw error;
            });
        }

        // Handle DevTools for batched vs non-batched actions
        if (isBatching()) {
          // Collect action for batch DevTools message
          addBatchedAction(actionInfo);
        } else {
          // Use optimized DevTools scheduling for non-batched actions
          scheduleDevTools(actionInfo);
        }

        // Only notify if should notify (action always marks state as changed)
        if (shouldNotify()) {
          scheduleNotification();
        }

        return result;
      };
      return acc;
    }, {} as AnyType);

  const dispatchObject = createDispatchObject();

  // Run multiple actions in a batch with a single notification at the end
  function batchActions(callback: () => void) {
    batch(
      () => {
        callback();
        // Clone state once at the end of batch (optimization)
        states = deepClone(states);
        stateVersion++;
      },
      () => {
        // Send batched actions to DevTools as a single group
        if (devTools && !pauseDevTools) {
          const batchedActionsList = getBatchedActions();
          if (batchedActionsList.length > 0) {
            devTools.send(
              {
                type: 'BATCH',
                payload: batchedActionsList
              },
              states
            );
          }
        }

        // Always notify after batch
        notifySubscribers();
      }
    );
  }

  // Reset function
  function reset() {
    const prevStates = states;
    states = deepClone(initialStates);
    stateChanged = true;
    stateVersion++;
    events.clear(); // Clear all events on reset

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: 'RESET' }, states);
    }

    if (!isDeepEqual(prevStates, states)) {
      notifySubscribers();
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
    on
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

  const StoreContext = createContext<StoreType | null>(null);

  const Provider = ({ children }: { children: React.ReactNode }) => {
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

    return createElement(
      StoreContext.Provider,
      { value: store },
      children as any
    );
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
