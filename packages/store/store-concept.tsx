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
};
type SelectorFn<State> = <R>(selector: (state: State) => R) => R;
type UseOrGet<TState, TSelectors> = SelectorFn<TState> & TSelectors;
type InferStore<TState, TActions, TSelectors> = {
  dispatch: TActions;
  silentDispatch: TActions;
  use: UseOrGet<TState, TSelectors>;
  get: UseOrGet<TState, TSelectors>;
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
  TActions extends Record<string, unknown> = AnyType,
  TSelectors extends Record<string, unknown> = AnyType
>(
  props: StoreProps<TState, TActions, TSelectors>
): InferStore<TState, TActions, TSelectors> {
  const { states } = props;
  const actionProxy =
    (props?.actions as unknown as TActions) || ({} as TActions);
  const selectorProxy =
    (props?.selectors as unknown as TSelectors) || ({} as TSelectors);

  // Actions
  const actions = props.actions({
    states,
    actions: actionProxy,
    selectors: selectorProxy
  });
  const selectors = props.selectors({ states, selectors: selectorProxy });
  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // Get
  const getterFn: SelectorFn<TState> = (selector) => selector(states);
  Object.assign(getterFn, selectors);

  // Use
  const userFn: SelectorFn<TState> = (selector) => selector(states);
  Object.assign(userFn, selectors);

  return {
    dispatch: actions,
    silentDispatch: actions,
    use: userFn as UseOrGet<TState, TSelectors>,
    get: getterFn as UseOrGet<TState, TSelectors>
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
  loadName(id: string): Promise<string>;
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
    loadName: async (id: string) => {
      const response = await fetch(`https://api.example.com/users/${id}`);
      const data = await response.json();
      return data.name;
    },
    reset: () => {
      actions.setName('');
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
  })
});

store.dispatch.setName('John');
store.dispatch.reset();
store.silentDispatch.setName('John');
store.silentDispatch.reset();
store.use.isFrom('New York');
store.use.isAdult();
store.get.isFrom('New York');
store.get.isAdult();
store.get.isFrom('New York');
store.get((s) => s.name); // Function form
store.get.isAdult(); // Property form
store.use((s) => s.age); // Function form
store.use.isFrom('New York'); // Property form
