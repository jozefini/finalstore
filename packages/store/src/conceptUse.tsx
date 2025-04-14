'use client';

import { createStore } from './storeConcept';

// Define action types explicitly
type Actions = {
  incrementTaskId: () => void;
  resetTaskId: () => void;
  toggleTheme: () => void;
  increment: () => void;
  decrement: () => void;
  setText: (text: string) => void;
};

// Define selector types explicitly
type Selectors = {
  getText: () => string;
  isTheme: (payload: 'light' | 'dark') => boolean;
};

export const concept = createStore<
  { taskId: number; theme: string; count: number; text: string },
  Actions,
  Selectors
>({
  states: {
    taskId: 1,
    theme: 'light',
    count: 0,
    text: 'Hello'
  },
  actions: ({ states, actions }) => ({
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
  selectors: ({ states }) => ({
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
