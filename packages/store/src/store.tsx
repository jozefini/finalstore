import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode
} from 'react';

import type {
  AnyType,
  CreateStoreProps,
  DevTools,
  InferStore,
  PayloadByAction,
  StoreActionFunction,
  StoreSelectorFunction
} from './types';

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

    // Early return for empty arrays
    if (a.length === 0) return true;

    // Check first element for quick mismatch
    if (!isDeepEqual(a[0], b[0])) return false;

    // If arrays are small, check all elements
    if (a.length <= 3) {
      for (let i = 1; i < a.length; i++) {
        if (!isDeepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // For larger arrays, check middle and end elements
    const mid = Math.floor(a.length / 2);
    const end = a.length - 1;
    return isDeepEqual(a[mid], b[mid]) && isDeepEqual(a[end], b[end]);
  }

  // Handle regular objects
  if (Array.isArray(b)) return false;

  // Type guard for objects
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  // Early return for empty objects
  if (keysA.length === 0) return true;

  // Check first key for quick mismatch
  const firstKey = keysA[0];
  if (
    !Object.prototype.hasOwnProperty.call(objB, firstKey) ||
    !isDeepEqual(objA[firstKey], objB[firstKey])
  ) {
    return false;
  }

  // If object is small, check all keys
  if (keysA.length <= 3) {
    for (let i = 1; i < keysA.length; i++) {
      const key = keysA[i];
      if (
        !Object.prototype.hasOwnProperty.call(objB, key) ||
        !isDeepEqual(objA[key], objB[key])
      ) {
        return false;
      }
    }
    return true;
  }

  // For larger objects, check middle and end keys
  const mid = Math.floor(keysA.length / 2);
  const end = keysA.length - 1;
  const midKey = keysA[mid];
  const endKey = keysA[end];

  return (
    Object.prototype.hasOwnProperty.call(objB, midKey) &&
    Object.prototype.hasOwnProperty.call(objB, endKey) &&
    isDeepEqual(objA[midKey], objB[midKey]) &&
    isDeepEqual(objA[endKey], objB[endKey])
  );
}

// =====================
// Store
// =====================

// Add memoization cache
const selectorCache = new WeakMap<
  Record<string, unknown>,
  Map<string, unknown>
>();

// Add batching mechanism
let batchUpdates = false;
const pendingUpdates = new Set<() => void>();

function batch(callback: () => void) {
  if (batchUpdates) {
    callback();
    return;
  }

  batchUpdates = true;
  try {
    callback();
    if (pendingUpdates.size > 0) {
      const updates = Array.from(pendingUpdates);
      pendingUpdates.clear();
      updates.forEach((update) => update());
    }
  } finally {
    batchUpdates = false;
  }
}

export function createStore<
  TStates,
  TActions extends Record<string, StoreActionFunction<TStates, AnyType>>,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<TStates, AnyType, AnyType>
  >
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
    if (batchUpdates) {
      const subs = Array.from(subscribers.values());
      for (const sub of subs) {
        pendingUpdates.add(() => {
          const currentState = getState();
          const newValue = sub.selector(currentState);
          if (!isDeepEqual(newValue, sub.lastValue)) {
            sub.lastValue = newValue;
            sub.callback();
          }
        });
      }
      return;
    }

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

  // Create the base use and get functions
  const baseUse = (selector?: (state: TStates) => unknown) => {
    const stateRef = useRef(getState());
    const selectorRef = useRef(selector);
    const valueRef = useRef<unknown>(
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
  };

  const baseGet = (selector?: (state: TStates) => unknown) => {
    if (!selector) return getState();
    return selector(getState());
  };

  // Create selector methods for use and get
  const createSelectorMethods = (getStateFn: () => TStates) => {
    if (!props.selectors)
      return {} as Record<string, (payload?: AnyType) => AnyType>;

    return Object.keys(props.selectors).reduce(
      (acc, key) => {
        const selector = props.selectors?.[key];
        if (!selector) return acc;

        acc[key] = (payload?: AnyType) => {
          const state = getStateFn() as Record<string, unknown>;
          const cacheKey = JSON.stringify(payload);

          // Get or create cache for this state object
          let stateCache = selectorCache.get(state);
          if (!stateCache) {
            stateCache = new Map();
            selectorCache.set(state, stateCache);
          }

          // Check cache
          const cachedResult = stateCache.get(`${key}:${cacheKey}`);
          if (cachedResult !== undefined) {
            return cachedResult;
          }

          // Calculate and cache result
          const result = selector(state as TStates, payload);
          stateCache.set(`${key}:${cacheKey}`, result);
          return result;
        };
        return acc;
      },
      {} as Record<string, (payload?: AnyType) => AnyType>
    );
  };

  // Create the use and get objects with both function and selector method support
  const useWithSelectors = Object.assign(
    baseUse,
    createSelectorMethods(getState)
  );
  const getWithSelectors = Object.assign(
    baseGet,
    createSelectorMethods(getState)
  );

  // Update the dispatch object creation to handle both sync and async actions
  const createDispatchObject = (shouldNotify: boolean) =>
    actions
      ? Object.keys(actions).reduce((acc, actionKey) => {
          acc[actionKey] = (payload?: AnyType) => {
            const cb = actions[actionKey];
            const newState = { ...states };
            const result = cb(newState, payload);

            if (result instanceof Promise) {
              // For async actions, return the Promise chain
              return dispatch(actionKey, payload, shouldNotify);
            }
            // For sync actions, execute immediately and return the result
            states = newState;

            // Send to DevTools
            if (devTools && !pauseDevTools) {
              devTools.send({ type: String(actionKey), payload }, states);
            }

            if (shouldNotify) {
              notify();
            }

            return result;
          };
          return acc;
        }, {} as AnyType)
      : {};

  const dispatchObject = createDispatchObject(true);
  const silentDispatchObject = createDispatchObject(false);

  // Modify dispatch to handle only async actions
  async function dispatch<K extends keyof TActions>(
    type: K,
    payload?: PayloadByAction<TStates, TActions>[K],
    shouldNotify = true
  ): Promise<ReturnType<TActions[K]>> {
    if (!actions) throw new Error('Actions are not defined');
    const cb = actions[type];
    if (typeof cb !== 'function')
      throw new Error(`Action ${String(type)} not found`);

    const newState = { ...states };
    const result = cb(newState, payload);

    // We know this is async at this point
    const finalResult = await result;

    states = newState;

    // Send to DevTools
    if (devTools && !pauseDevTools) {
      devTools.send({ type: String(type), payload }, states);
    }

    if (shouldNotify) {
      batch(() => {
        notify();
      });
    }

    return finalResult as ReturnType<TActions[K]>;
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

  const baseStore = {
    dispatch: dispatchObject,
    silentDispatch: silentDispatchObject,
    use: useWithSelectors,
    get: getWithSelectors,
    reset
  } as const;

  return baseStore as InferStore<TStates, TActions, TSelectors>;
}

// =====================
// Context Store
// =====================

export function createScopedStore<
  TStates,
  TActions extends Record<string, StoreActionFunction<TStates, unknown>>,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<TStates, AnyType, AnyType>
  > = Record<string, never>
>(props: CreateStoreProps<TStates, TActions, TSelectors>) {
  type StoreType = InferStore<TStates, TActions, TSelectors>;

  const StoreContext = createContext<StoreType | null>(null);

  const Provider = ({ children }: { children: ReactNode }) => {
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
