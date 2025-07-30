import { createStore } from './store-2';

const initialStates = {
  title: 'Hello'
};
type States = typeof initialStates;
type Actions = {
  setTitle: (text: string) => void;
};
type Selectors = {
  hasTitle: () => boolean;
  isUsingLetterA: () => boolean;
  title: () => string;
};

const Store = createStore<States, Actions, Selectors>({
  /**
   * Initial states are the data that the store manages
   *
   * @param title - The title of the store
   * @returns
   */
  states: initialStates,
  /**
   * Actions are used to mutate the states
   *
   * This also will trigger all default selectors to be re-computed
   * but can also be used to clear the cache of the selectors that
   * are using cached values (opted-out of default re-computation)
   * e.g. very expensive selectors that are not used often
   *
   * @param get - Get the current states
   * @param set - Set the states
   * @param clearCache - Clear the cache of the selectors
   * @returns
   */
  actions: ({ states, clearCache }) => ({
    setTitle: (text: string) => {
      states.title = text;
      clearCache(['hasTitle', 'title']);
    }
  }),
  /**
   * Selectors are used to get the states
   *
   * This will also cache the result of the selector
   * so that it can be used later without re-computing
   *
   * @param get - Get the current states
   * @param cache - Cache the result of the selector
   * @returns
   */
  selectors: ({ states, cache }) => ({
    hasTitle: cache(() => {
      return !!states.title;
    }),
    isUsingLetterA: cache(() => {
      return states.title.includes('a');
    }),
    title: () => states.title
  }),
  /**
   * Config is used to configure the store
   *
   * @param name - The name of the store used in devtools
   * @param devtools - Whether to use devtools
   * @returns
   */
  config: {
    name: 'Store',
    devtools: true
  }
});

// Usage non-subscribed
Store.get().title; // Get entire states -> states.title
Store.get((s) => s.title); // Get only title -> states.title
Store.get.title(); // Get pre-computed title -> states.title
Store.get.hasTitle(); // Get pre-computed and cached hasTitle -> true

// Usage subscribed
const Component = () => {
  Store.use().title; // Subscribe to entire states -> states.title
  Store.use((s) => s.title); // Subscribe to only title -> states.title
  Store.use.title(); // Subscribe to pre-computed title -> states.title
  Store.use.hasTitle(); // Subscribe to pre-computed and cached hasTitle -> true
  return null;
};

// Mutations through actions
Store.dispatch.setTitle('Hello World'); // Set title -> states.title = 'Hello World' && invalidate hasTitle so it will be re-computed
