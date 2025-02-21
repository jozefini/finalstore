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
  function get<T>(selector?: (state: TStates) => T): TStates | T {
    if (!selector) return getState();
    return selector(getState());
  }

  // Update the dispatch object creation to handle both sync and async actions
  const createDispatchObject = (shouldNotify: boolean) =>
    Object.keys(actions).reduce((acc, actionKey) => {
      acc[actionKey] = (payload?: AnyType) => {
        const cb = actions[actionKey];
        const newState = { ...states };
        const result = cb(newState, payload);

        if (result instanceof Promise) {
          // For async actions, return the Promise chain
          return dispatch(actionKey, payload, shouldNotify);
        } else {
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
        }
      };
      return acc;
    }, {} as AnyType);

  const dispatchObject = createDispatchObject(true);
  const silentDispatchObject = createDispatchObject(false);

  // Modify dispatch to handle only async actions
  async function dispatch<K extends keyof TActions>(
    type: K,
    payload?: PayloadByAction<TStates, TActions>[K],
    shouldNotify = true
  ): Promise<ReturnType<TActions[K]>> {
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
      notify();
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

  // Create selector methods
  function createSelectorMethods(
    selectors: TSelectors,
    getState: () => TStates,
    useHook?: typeof use
  ) {
    return Object.keys(selectors).reduce((acc, key) => {
      acc[key] = (payload?: AnyType) => {
        if (useHook) {
          return useHook((state: TStates) => selectors[key](state, payload));
        }
        return selectors[key](getState(), payload);
      };
      return acc;
    }, {} as AnyType);
  }

  // In createStore, before returning:
  const getterMethods = props.selectors
    ? createSelectorMethods(props.selectors, getState)
    : {};

  const useMethods = props.selectors
    ? createSelectorMethods(props.selectors, getState, use)
    : {};

  const baseStore = {
    dispatch: dispatchObject,
    silentDispatch: silentDispatchObject,
    use,
    get,
    getSelector: getterMethods,
    useSelector: useMethods,
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
