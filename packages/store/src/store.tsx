import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type FC,
  type ReactNode
} from 'react';

// =====================
// Types
// =====================

/* eslint-disable @typescript-eslint/no-explicit-any */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

// =====================
// Type Helpers
// =====================
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
// Store Types
// =====================
type ActionFunction<TState, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => void | Promise<void>;

type PayloadByAction<TStates, TActions> = {
  [K in keyof TActions]: TActions[K] extends ActionFunction<TStates, infer P>
    ? P
    : never;
};

// Update SelectorFunction type to match ActionFunction pattern
type SelectorFunction<TState, TResult, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => TResult;

// Update CreateStoreProps to include optional selectors
type CreateStoreProps<
  TStates,
  TActions extends Record<string, ActionFunction<TStates, any>>,
  TSelectors extends Record<string, SelectorFunction<TStates, any, any>>
> = {
  states: TStates;
  actions: TActions;
  selectors?: TSelectors;
  config?: {
    name?: string;
    devtools?: boolean;
  };
};

// Update InferStore type to use TStates consistently
type InferStore<
  TStates,
  TActions extends Record<string, ActionFunction<TStates, any>>,
  TSelectors extends Record<string, SelectorFunction<TStates, any, any>>
> = {
  dispatch: <K extends keyof TActions>(
    type: K,
    ...args: ActionArgs<PayloadByAction<TStates, TActions>[K]>
  ) => Promise<void>;
  use: {
    (): TStates;
    <T>(selector: (state: TStates) => T): T;
  };
  get: {
    (): TStates;
    <T>(selector: (state: TStates) => T): T;
    <K extends keyof TSelectors>(
      key: K,
      ...args: TSelectors[K] extends SelectorFunction<TStates, any, infer P>
        ? ActionArgs<P>
        : never
    ): TSelectors[K] extends SelectorFunction<TStates, infer R, any>
      ? R
      : never;
  };
  reset: () => void;
} & (TSelectors extends Record<string, SelectorFunction<TStates, any, any>>
  ? {
      select: <K extends keyof TSelectors>(
        key: K,
        ...args: TSelectors[K] extends SelectorFunction<TStates, any, infer P>
          ? ActionArgs<P>
          : never
      ) => (
        state: TStates
      ) => TSelectors[K] extends SelectorFunction<TStates, infer R, any>
        ? R
        : never;
    }
  : Record<string, never>);

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
  TActions extends Record<string, ActionFunction<TStates, any>>,
  TSelectors extends Record<string, SelectorFunction<TStates, any, any>>
>(
  props: CreateStoreProps<TStates, TActions, TSelectors>
): InferStore<TStates, TActions, TSelectors> {
  const initialStates = { ...props.states };
  let states = { ...initialStates };
  const actions = props.actions;

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
      selector: (state: TStates) => unknown;
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
    selector?: (state: TStates) => unknown
  ) {
    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: TStates) => s);
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

  function use(): TStates;
  function use<T>(selector: (state: TStates) => T): T;
  function use<T extends unknown[]>(selector: (state: TStates) => T): T;
  function use<T>(selector?: (state: TStates) => T): TStates | T {
    const stateRef = useRef(getState());
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | TStates>(
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

  function get(): TStates;
  function get<T>(selector: (state: TStates) => T): T;
  function get<K extends keyof TSelectors>(
    key: K,
    ...args: TSelectors[K] extends SelectorFunction<TStates, any, infer P>
      ? ActionArgs<P>
      : never
  ): TSelectors[K] extends SelectorFunction<TStates, infer R, any> ? R : never;
  function get(
    selectorOrKey?: ((state: TStates) => any) | keyof TSelectors,
    ...args: any[]
  ): any {
    if (typeof selectorOrKey === 'undefined') {
      return getState();
    }
    if (typeof selectorOrKey === 'function') {
      return selectorOrKey(getState());
    }
    const selector = props.selectors?.[selectorOrKey];
    if (!selector) {
      throw new Error(`Selector "${String(selectorOrKey)}" not found`);
    }
    const [payload] = args;
    return selector(getState(), payload);
  }

  async function dispatch<K extends keyof TActions>(
    type: K,
    ...args: ActionArgs<PayloadByAction<TStates, TActions>[K]>
  ): Promise<void> {
    const cb = actions[type];
    if (typeof cb !== 'function') return;

    const newState = { ...states };
    const [payload, shouldNotify = true] = args;
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

  // Update select implementation to match dispatch pattern
  function select<K extends keyof TSelectors>(
    key: K,
    ...args: TSelectors[K] extends SelectorFunction<TStates, any, infer P>
      ? ActionArgs<P>
      : never
  ): (
    state: TStates
  ) => TSelectors[K] extends SelectorFunction<TStates, infer R, any>
    ? R
    : never {
    const selector = props.selectors?.[key];
    if (!selector) {
      throw new Error(`Selector "${String(key)}" not found`);
    }
    const [payload] = args;
    return (state: TStates) => selector(state, payload);
  }

  // First create the base store without selectors
  const baseStore = {
    use,
    get,
    dispatch,
    reset
  } as const;

  // Then return the appropriate type based on whether selectors exist
  return (props.selectors ? { ...baseStore, select } : baseStore) as InferStore<
    TStates,
    TActions,
    TSelectors
  >;
}

// =====================
// Context Store
// =====================

export function createScopedStore<
  TStates,
  TActions extends Record<string, ActionFunction<TStates, unknown>>,
  TSelectors extends Record<
    string,
    SelectorFunction<TStates, any, any>
  > = Record<string, never>
>(props: CreateStoreProps<TStates, TActions, TSelectors>) {
  type StoreType = InferStore<TStates, TActions, TSelectors>;

  const StoreContext = createContext<StoreType | null>(null);

  const Provider: FC<{ children: ReactNode }> = ({ children }) => {
    const store = useMemo(
      () => createStore<TStates, TActions, TSelectors>(props),
      [props]
    );
    useEffect(() => {
      return () => {
        store.reset();
      };
    }, [store]);

    return (
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
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
