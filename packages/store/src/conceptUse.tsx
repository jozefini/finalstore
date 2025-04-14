'use client';

import { createStore } from './storeConcept';

export const concept = createStore({
  states: {
    taskId: 1,
    theme: 'light',
    count: 0,
    text: 'Hello'
  },
  actions: ({ states, actions, selectors }) => ({
    incrementTaskId: () => {
      states.taskId++;
    },
    resetTaskId: () => {
      states.taskId = 1;
    },
    toggleTheme: () => {
      states.theme = states.theme === 'light' ? 'dark' : 'light';
    },
    increment: () => {
      states.count++;
    },
    decrement: () => {
      states.count--;
    },
    setText: (text: string) => {
      states.text = text;
    }
  }),
  selectors: ({ states, actions, selectors }) => ({
    getText: () => {
      return states.text;
    },
    isTheme: (payload: 'light' | 'dark') => {
      return states.theme === payload;
    }
  })
});

export function Concept() {
  const isDarkTheme = concept.useSelector.isTheme('light');
  const theme = concept.use((s) => s.theme);
  console.log('isDarkTheme', isDarkTheme);

  return (
    <div>
      Theme: {theme}
      <br />
      Is dark theme: {isDarkTheme ? 'yes' : 'no'}
      <div>
        <button onClick={() => concept.dispatch.toggleTheme()}>
          Toggle theme
        </button>
      </div>
    </div>
  );
}
