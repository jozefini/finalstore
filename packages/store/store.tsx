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

  const actions = props.actions({
    states,
    actions: actionProxy,
    selectors: selectorProxy
  });
  const selectors = props.selectors({ states, selectors: selectorProxy });
  Object.assign(actionProxy, actions);
  Object.assign(selectorProxy, selectors);

  // Create the getter function that also has selectors as properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getterFn: SelectorFn<TState> = (selector) => selector(states);
  // Assign all selectors as properties of the getter function
  Object.assign(getterFn, selectors);

  // Create the user function, identical to getter for now
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userFn: SelectorFn<TState> = (selector) => selector(states);
  // Assign all selectors as properties
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
