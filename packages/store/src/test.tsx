type StoreStates = Record<string, any>;

// Helper types for better inference
type ActionFunction<S extends StoreStates, A, SL> = (store: {
  states: S;
  actions: A;
  selectors: SL;
}) => Record<string, (...args: any[]) => any>;

type SelectorFunction<S extends StoreStates, A, SL> = (store: {
  states: S;
  actions: A;
  selectors: SL;
}) => Record<string, (...args: any[]) => any>;

type StoreProps<
  S extends StoreStates,
  A extends Record<string, (...args: any[]) => any> = any,
  SL extends Record<string, (...args: any[]) => any> = any
> = {
  states: S;
  actions: ActionFunction<S, A, SL>;
  selectors: SelectorFunction<S, A, SL>;
};

type InferStore<T> =
  T extends StoreProps<infer S, infer A, infer SL>
    ? {
        states: S;
        actions: ReturnType<T['actions']>;
        selectors: ReturnType<T['selectors']>;
      }
    : never;

function createStore<S extends StoreStates, P extends StoreProps<S>>(
  props: P
): InferStore<P> {
  // Create the store
  const store = {
    states: { ...props.states },
    actions: {} as ReturnType<P['actions']>,
    selectors: {} as ReturnType<P['selectors']>
  };

  // Initialize with circular references
  const actions = props.actions(store as any);
  const selectors = props.selectors(store as any);

  store.actions = actions as unknown as ReturnType<P['actions']>;
  store.selectors = selectors as unknown as ReturnType<P['selectors']>;

  return store as InferStore<P>;
}

// Usage example
export const concept = createStore({
  states: {
    taskId: 1,
    theme: 'light' as 'light' | 'dark',
    count: 0,
    text: 'Hello'
  },
  actions: ({ states, actions, selectors }) => ({
    incrementTaskId: () => {
      states.taskId++;
      console.log(selectors.getText());
    },
    complexAction: (params: { id: number; name: string; enabled: boolean }) => {
      console.log(
        `Complex action with id=${params.id}, name=${params.name}, enabled=${params.enabled}`
      );
      states.text = params.name;
    }
  }),
  selectors: ({ states, selectors }) => ({
    getText: () => {
      console.log(selectors.isTheme('light'));
      return states.text;
    },
    isTheme: (payload: 'light' | 'dark') => {
      return states.theme === payload;
    },
    complexSelector: (params: { min: number; max: number }) => {
      return states.count >= params.min && states.count <= params.max;
    }
  })
});
