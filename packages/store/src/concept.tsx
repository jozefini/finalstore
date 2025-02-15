'use client';

// Concept:
// Instead of returning dispatch as function,
// we return as object with methods defined as actions
// The existing dispatch function should be removed
import { createStore } from './store-new';

export const concept = createStore({
  states: {
    taskId: 1,
    theme: 'light',
    count: 0,
    text: 'Hello'
  },
  actions: {
    incrementTaskId: (state) => {
      state.taskId++;
    },
    resetTaskId: (state) => {
      state.taskId = 1;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    increment: (state) => {
      state.count++;
    },
    decrement: (state) => {
      state.count--;
    },
    setText: (state, text: string) => {
      state.text = text;
    }
  },
  selectors: {
    getText: (state) => {
      return state.text;
    },
    isTheme: (state, payload: 'light' | 'dark') => {
      return state.theme === payload;
    }
  }
});

// Instead of returning dispatch as function,
// we return as object with methods defined as actions
// The existing dispatch function should be removed
// Here how it should work:
// concept.dispatch.incrementTaskId();
// concept.dispatch.resetTaskId();
// concept.dispatch.toggleTheme();
// concept.dispatch.increment();
// concept.dispatch.decrement();
// concept.dispatch.setText('Hello');

// // Concept for selectors, this should work for get and use methods.
// // but instead of removing get and use, they will still exist as callable,
// // but they would also allow selecting as object nested, e.g.
// store.get(); // get all store
// store.get((s) => s.theme); // get theme
// store.get.getText(); // get text, as a new way to use selectors.
// store.get.isTheme('light'); // get isTheme
// // ANd also subscribed way in react components,
// // this is similar to get but with react re-renders because is subscribing.
// store.use(); // subscribe to the full store
// store.use((s) => s.theme); // subscribe to the theme
// store.use.getText(); // subscribe to the selector
// store.use.isTheme('light'); // subscribe to the selector

export function Concept() {
  const theme = concept.use((s) => s.theme);

  return (
    <div>
      Concept theme: {theme}
      <div>
        <button onClick={() => concept.dispatch.toggleTheme()}>
          Toggle theme
        </button>
      </div>
    </div>
  );
}
