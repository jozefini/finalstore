// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyType = any;

export function createStore<
  TState extends Record<string, unknown> = AnyType,
  TActions extends Record<string, unknown> = AnyType,
  TSelectors extends Record<string, unknown> = AnyType
>(props: {
  states: TState;
  actions: (store: {
    states: TState;
    actions: TActions;
    selectors: TSelectors;
  }) => TActions;
  selectors: (store: { states: TState; selectors: TSelectors }) => TSelectors;
}) {
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

  return {
    states,
    dispatch: actions,
    use: selectors
  } as {
    states: TState;
    dispatch: TActions;
    use: TSelectors;
  };
}

// Concept with typesafety

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
  actions: ({ states, actions, selectors }) => ({
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

// The dispatch object is created automatically, and is typed
// based on the actions and selectors, so if you try to do
// store.dispatch.setName('John') it will be typed as string
store.dispatch.setName('John');
store.dispatch.reset();

// The selectors are typed, so if you try to do
// store.selectors.isFrom('New York') it will be typed as City
const isFromNY = store.use.isFrom('New York');
const isAdult = store.use.isAdult();

/* Task Description
I want to implement this type safety store creation. The biggest sell-point here is the inferred types that this store should do automatically, the user creating the store should not be forced to manually type every state or action or selector.

Try to understand the concept and slowly gain confidence by improving the types and reaching our goals
*/
