'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  actions: ActionsContext<TState, TActions, TSelectors>;
  selectors: SelectorsContext<TState, TSelectors>;
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
  silentDispatch: TActions;
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

  // Actions
  const actions = props.actions({
    states: statesProxy,
    actions: actionProxy,
    selectors: selectorProxy
  });
  const selectors = props.selectors({
    states: statesProxy,
    selectors: selectorProxy
  });
  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // Subscribers for reactivity
  const subscribers = new Map<
    number,
    {
      selector: (state: TState) => unknown;
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
    selector?: (state: TState) => unknown
  ) {
    const id = nextSubscriberId++;
    const initialSelector = selector || ((s: TState) => s);
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

  // Create dispatch functions
  const createDispatchObject = (shouldNotify: boolean) =>
    Object.keys(actions).reduce((acc, actionKey) => {
      acc[actionKey] = (payload?: AnyType) => {
        const cb = actions[actionKey];

        // Execute the action
        const result = cb(payload);

        // Create a new reference for the state object so React detects changes
        states = { ...states };

        if (result instanceof Promise) {
          // For async actions, return the Promise chain
          return dispatch(actionKey, payload, shouldNotify);
        } else {
          // For sync actions, execute immediately and return the result

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

  // Dedicated async dispatch helper
  async function dispatch<K extends keyof TActions>(
    type: K,
    payload?: PayloadByAction<TActions>[K],
    shouldNotify = true
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

    if (shouldNotify) {
      notify();
    }

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

  // Get with function overloading
  function get(): TState;
  function get<T>(selector: (state: TState) => T): T;
  function get<T>(selector?: (state: TState) => T): TState | T {
    if (!selector) return getState();
    return selector(getState());
  }
  Object.assign(get, selectors);

  // Use with React hooks
  function use(): TState;
  function use<T>(selector: (state: TState) => T): T;
  function use<T extends unknown[]>(selector: (state: TState) => T): T;
  function use<T>(selector?: (state: TState) => T): TState | T {
    const stateRef = useRef(getState());
    const selectorRef = useRef(selector);
    const valueRef = useRef<T | TState>(
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
  Object.assign(use, selectors);

  return {
    dispatch: dispatchObject as unknown as TActions,
    silentDispatch: silentDispatchObject as unknown as TActions,
    use: use as typeof use & TSelectors,
    get: get as typeof get & TSelectors,
    reset
  };
}

// EXAMPLE:

type City = 'New York' | 'Los Angeles' | 'Chicago';
type StateType = {
  name: string;
  age: number;
  city: City;
};
type ActionType = {
  setName(name: string): string;
  toggleAdult(): number;
  reset(): void;
};
type SelectorType = {
  isAdult(): boolean;
  isFrom(city: City): boolean;
};
export const store = createStore<StateType, ActionType, SelectorType>({
  states: {
    name: 'John',
    age: 20,
    city: 'New York'
  },
  actions: ({ states, actions }) => ({
    setName: (name: string) => {
      states.name = name;
      return states.name;
    },
    toggleAdult: () => {
      states.age = states.age >= 18 ? 0 : 18;
      return states.age;
    },
    reset: () => {
      states.name = '';
      states.age = 0;
      states.city = 'New York';
    }
  }),
  selectors: ({ states, selectors }) => ({
    isAdult: () => states.age >= 18,
    isFrom: (city: City) => {
      if (selectors.isAdult()) {
        return true;
      }
      return states.city === city;
    }
  }),
  config: {
    name: 'UserStore',
    devtools: true
  }
});

const btnStyle =
  'bg-gray-200 text-gray-800 active:bg-gray-300 rounded-md px-4 py-2 m-1';
export const StoreExamples = () => {
  const name = store.use((s) => s.name);
  const age = store.use((s) => s.age);
  const isAdultCb = store.use.isAdult();

  return (
    <div className="rounded border p-4">
      <div className="mb-4">
        <div>
          <strong>Name:</strong> {name}
        </div>
        <div>
          <strong>Age:</strong> {age}
        </div>
        <div>
          <strong>IsAdult:</strong> {isAdultCb ? 'Yes' : 'No'}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className={btnStyle}
          onClick={() =>
            store.dispatch.setName('John' + Math.random().toFixed(2))
          }
        >
          Change Name
        </button>
        <button
          className={btnStyle}
          onClick={() =>
            store.silentDispatch.setName('John' + Math.random().toFixed(2))
          }
        >
          Silent Change Name
        </button>
        <button
          className={btnStyle}
          onClick={() => store.dispatch.toggleAdult()}
        >
          Toggle Adult
        </button>
        <button className={btnStyle} onClick={() => store.reset()}>
          Reset
        </button>
      </div>
    </div>
  );
};
