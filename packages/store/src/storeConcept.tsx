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
  type FC,
  type ReactNode
} from 'react';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyType = any;

// =====================
// DevTools Types
// =====================
export type DevToolsMessage = {
  type: string;
  payload: {
    type: string;
  };
  state?: string;
};

export type DevTools = {
  connect: (config: unknown) => DevTools;
  init: (state: unknown) => void;
  subscribe: (listener: (message: DevToolsMessage) => void) => void;
  send: (action: unknown, state: unknown) => void;
};

// =====================
// Common Config Types
// =====================
export type StoreConfig = {
  name?: string;
  devtools?: boolean;
};

export type Subscriber<T> = {
  selector: (state: T) => unknown;
  callback: () => void;
  lastValue: unknown;
};

// =====================
// Store Types
// =====================

// Define a generic function type that preserves parameter types
// biome-ignore lint/suspicious/noExplicitAny: Needed for flexible function types
export type GenericFunction = (...args: AnyType[]) => unknown;

// Define a utility type that preserves function signatures
export type FunctionWithExactParams<F extends GenericFunction> = F;

export type StoreActionFunction<TState, TPayload = void> = TPayload extends void
  ? () => unknown | Promise<unknown>
  : (payload: TPayload) => unknown | Promise<unknown>;

export type StoreSelectorFunction<
  TState,
  TResult,
  TPayload = void
> = TPayload extends void ? () => TResult : (payload: TPayload) => TResult;

export type PayloadByAction<TStates, TActions> = {
  [K in keyof TActions]: TActions[K] extends () => unknown
    ? undefined
    : TActions[K] extends (payload: infer P) => unknown
      ? P
      : never;
};

// Modified to support the new context-based structure
export type StoreContext<
  TStates,
  TActions extends Record<string, StoreActionFunction<TStates, AnyType>>,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<TStates, AnyType, AnyType>
  >
> = {
  states: TStates;
  actions: TActions;
  selectors: TSelectors;
};

export type CreateStoreProps<
  TStates,
  TActions extends Record<string, StoreActionFunction<TStates, AnyType>>,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<TStates, AnyType, AnyType>
  >
> = {
  states: TStates;
  actions: (context: StoreContext<TStates, TActions, TSelectors>) => TActions;
  selectors: (
    context: StoreContext<TStates, TActions, TSelectors>
  ) => TSelectors;
  config?: StoreConfig;
};

// Add a type helper to infer if an action is async
export type InferActionReturnType<T> = T extends (
  state: AnyType,
  payload: AnyType
) => infer R
  ? R extends Promise<AnyType>
    ? R
    : R
  : never;

// Fix for detecting action parameters correctly
export type InferActionType<T> = T extends () => unknown
  ? () => ReturnType<T>
  : T;

// Define more specific types for function parameter inference
// biome-ignore lint/suspicious/noExplicitAny: Needed for type inference
export type InferParamTypes<F> = F extends (params: infer P) => unknown
  ? P
  : F extends () => unknown
    ? void
    : never;

// biome-ignore lint/suspicious/noExplicitAny: Needed for type inference
export type InferReturnType<F> = F extends (...args: unknown[]) => infer R
  ? R
  : never;

// =====================
// Type inference helpers
// =====================

// Helper to extract action payload types
export type InferActionPayloads<TActions> = {
  [K in keyof TActions]: TActions[K] extends () => unknown
    ? void
    : TActions[K] extends (payload: infer P) => unknown
      ? P
      : never;
};

// Helper to create correctly typed dispatch methods
export type TypedDispatchMethods<TActions> = {
  [K in keyof TActions]: TActions[K] extends () => infer R
    ? () => R
    : TActions[K] extends (payload: infer P) => infer R
      ? (payload: P) => R
      : never;
};

// Helper to create correctly typed selector methods
export type TypedSelectorMethods<TSelectors> = {
  [K in keyof TSelectors]: TSelectors[K] extends () => infer R
    ? () => R
    : TSelectors[K] extends (payload: infer P) => infer R
      ? (payload: P) => R
      : never;
};

// Update InferStore to use our new helpers
export type InferStore<
  TStates,
  TActions extends Record<string, GenericFunction>,
  TSelectors extends Record<string, GenericFunction>
> = {
  dispatch: {
    [K in keyof TActions]: TActions[K] extends () => unknown
      ? () => ReturnType<TActions[K]>
      : TActions[K] extends (payload: infer P) => unknown
        ? (payload: P) => ReturnType<TActions[K]>
        : never;
  };
  silentDispatch: {
    [K in keyof TActions]: TActions[K] extends () => unknown
      ? () => ReturnType<TActions[K]>
      : TActions[K] extends (payload: infer P) => unknown
        ? (payload: P) => ReturnType<TActions[K]>
        : never;
  };
  use: {
    (): TStates;
    <T>(selector: (state: TStates) => T): T;
  };
  get: {
    (): TStates;
    <T>(selector: (state: TStates) => T): T;
  };
  getSelector: {
    [K in keyof TSelectors]: TSelectors[K] extends () => unknown
      ? () => ReturnType<TSelectors[K]>
      : TSelectors[K] extends (payload: infer P) => unknown
        ? (payload: P) => ReturnType<TSelectors[K]>
        : never;
  };
  useSelector: {
    [K in keyof TSelectors]: TSelectors[K] extends () => unknown
      ? () => ReturnType<TSelectors[K]>
      : TSelectors[K] extends (payload: infer P) => unknown
        ? (payload: P) => ReturnType<TSelectors[K]>
        : never;
  };
  reset: () => void;
};

// /* eslint-disable react-hooks/rules-of-hooks */

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

export function createStore<
  TStates,
  TActions extends Record<string, GenericFunction>,
  TSelectors extends Record<string, GenericFunction>
>(props: {
  states: TStates;
  actions: (context: StoreContext<TStates, TActions, TSelectors>) => TActions;
  selectors: (
    context: StoreContext<TStates, TActions, TSelectors>
  ) => TSelectors;
  config?: StoreConfig;
}): InferStore<TStates, TActions, TSelectors> {
  const initialStates = { ...props.states };
  let states = { ...initialStates };

  // Create mutable context object that will be passed to actions and selectors
  const context: StoreContext<TStates, TActions, TSelectors> = {
    states,
    actions: {} as TActions,
    selectors: {} as TSelectors
  };

  // Initialize actions and selectors with the context
  const actions = props.actions(context);
  const selectors = props.selectors(context);

  // Update the context with the created actions and selectors
  context.actions = actions;
  context.selectors = selectors;

  // DevTools setup
  let devTools: DevTools | null = null;
  let pauseDevTools = false;

  // Set up proxied state to ensure state is mutable within actions
  // but changes are tracked for reactivity
  const createStateProxy = () => {
    return new Proxy(states as object, {
      set: (target, prop, value) => {
        (target as Record<string | symbol, unknown>)[prop] = value;
        return true;
      }
    });
  };

  // Update the context states reference to point to the actual states object
  Object.defineProperty(context, 'states', {
    get: () => states
  });

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

  const subscribers = new Map<
    number,
    {
      selector: (state: typeof states) => unknown;
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
    selector?: (state: typeof states) => unknown
  ) {
    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: typeof states) => s);
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
    const subs = Array.from(subscribers.values());
    for (const sub of subs) {
      const currentState = getState();
      const newValue = sub.selector(currentState);

      if (!isDeepEqual(newValue, sub.lastValue)) {
        sub.lastValue = newValue;
        sub.callback();
      }
    }
  }

  function use(): typeof states;
  function use<T>(selector: (state: typeof states) => T): T;
  function use<T extends unknown[]>(selector: (state: typeof states) => T): T;
  function use<T>(selector?: (state: typeof states) => T): typeof states | T {
    const stateRef = useRef(getState());
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | typeof states>(
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

  function get(): typeof states;
  function get<T>(selector: (state: typeof states) => T): T;
  function get<T>(selector?: (state: typeof states) => T): typeof states | T {
    if (!selector) return getState();
    return selector(getState());
  }

  // Helper function to cast functions while preserving types
  function typedCast<T>(fn: GenericFunction): T {
    return fn as unknown as T;
  }

  // Update the dispatch object creation
  const createDispatchObject = (shouldNotify: boolean) => {
    // Create a correctly typed object
    const dispatchObj = {} as {
      [K in keyof TActions]: TActions[K] extends () => unknown
        ? () => ReturnType<TActions[K]>
        : TActions[K] extends (payload: infer P) => unknown
          ? (payload: P) => ReturnType<TActions[K]>
          : never;
    };

    // Add each action to the object with the correct typing
    Object.keys(actions).forEach((actionKey) => {
      const key = actionKey as keyof TActions;
      const action = actions[key];

      // Create a function with the same signature as the original action
      if (action.length === 0) {
        // No parameters action
        (dispatchObj as Record<string, unknown>)[key as string] = function () {
          const result = action();

          if (result instanceof Promise) {
            return result.then((res) => {
              if (devTools && !pauseDevTools) {
                devTools.send({ type: String(key) }, states);
              }

              if (shouldNotify) {
                notify();
              }

              return res;
            });
          } else {
            if (devTools && !pauseDevTools) {
              devTools.send({ type: String(key) }, states);
            }

            if (shouldNotify) {
              notify();
            }

            return result;
          }
        };
      } else {
        // Action with parameters
        (dispatchObj as Record<string, unknown>)[key as string] = function (
          payload: unknown
        ) {
          const result = action(payload);

          if (result instanceof Promise) {
            return result.then((res) => {
              if (devTools && !pauseDevTools) {
                devTools.send(
                  {
                    type: String(key),
                    payload
                  },
                  states
                );
              }

              if (shouldNotify) {
                notify();
              }

              return res;
            });
          } else {
            if (devTools && !pauseDevTools) {
              devTools.send(
                {
                  type: String(key),
                  payload
                },
                states
              );
            }

            if (shouldNotify) {
              notify();
            }

            return result;
          }
        };
      }
    });

    return dispatchObj;
  };

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

  // Update selector methods creation
  function createSelectorMethods(
    selectors: TSelectors,
    getState: () => TStates,
    useHook?: typeof use
  ) {
    // Create a correctly typed object
    const selectorObj = {} as {
      [K in keyof TSelectors]: TSelectors[K] extends () => unknown
        ? () => ReturnType<TSelectors[K]>
        : TSelectors[K] extends (payload: infer P) => unknown
          ? (payload: P) => ReturnType<TSelectors[K]>
          : never;
    };

    // Add each selector to the object with the correct typing
    Object.keys(selectors).forEach((selectorKey) => {
      const key = selectorKey as keyof TSelectors;
      const selector = selectors[key];

      // Create a function with the same signature as the original selector
      if (selector.length === 0) {
        // No parameters selector
        (selectorObj as Record<string, unknown>)[key as string] = function () {
          if (useHook) {
            return useHook(() => selector());
          }
          return selector();
        };
      } else {
        // Selector with parameters
        (selectorObj as Record<string, unknown>)[key as string] = function (
          payload: unknown
        ) {
          if (useHook) {
            return useHook(() => selector(payload));
          }
          return selector(payload);
        };
      }
    });

    return selectorObj;
  }

  const dispatchObject = createDispatchObject(true);
  const silentDispatchObject = createDispatchObject(false);
  const getterMethods = createSelectorMethods(selectors, getState);
  const useMethods = createSelectorMethods(selectors, getState, use);

  const store = {
    dispatch: dispatchObject,
    silentDispatch: silentDispatchObject,
    use,
    get,
    getSelector: getterMethods,
    useSelector: useMethods,
    reset
  };

  return store as InferStore<typeof states, typeof actions, typeof selectors>;
}

// =====================
// Context Store
// =====================

export function createScopedStore<
  TStates,
  TActions extends Record<string, GenericFunction>,
  TSelectors extends Record<string, GenericFunction>
>(props: {
  states: TStates;
  actions: (context: StoreContext<TStates, TActions, TSelectors>) => TActions;
  selectors: (
    context: StoreContext<TStates, TActions, TSelectors>
  ) => TSelectors;
  config?: StoreConfig;
}) {
  type StoreType = InferStore<TStates, TActions, TSelectors>;

  const StoreContext = createContext<StoreType | null>(null);

  const Provider: FC<{ children: ReactNode }> = ({ children }) => {
    const store = useMemo(
      () => createStore<TStates, TActions, TSelectors>(props),
      []
    );
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
