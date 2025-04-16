'use client';

import { createStore } from './storeConcept';

export const concept = createStore({
  states: {
    taskId: 1,
    theme: 'light',
    count: 0,
    text: 'Hello'
  },
  actions: ({ states }) => ({
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
    },
    complexAction: (params: { id: number; name: string; enabled: boolean }) => {
      console.log(
        `Complex action with id=${params.id}, name=${params.name}, enabled=${params.enabled}`
      );
      states.text = params.name;
    }
  }),
  selectors: ({ states }) => ({
    getText: () => {
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

export function Concept() {
  const isDarkTheme = concept.useSelector.isTheme('light');
  const theme = concept.use((s) => s.theme);
  console.log('isDarkTheme', isDarkTheme);

  const handleComplexAction = () => {
    concept.dispatch.complexAction({
      id: 123,
      name: 'Test',
      enabled: true
    });
  };

  const inRange = concept.useSelector.complexSelector({ min: 0, max: 10 });

  return (
    <div>
      Theme: {theme}
      <br />
      Is dark theme: {isDarkTheme ? 'yes' : 'no'}
      <br />
      Count in range: {inRange ? 'yes' : 'no'}
      <div>
        <button onClick={() => concept.dispatch.toggleTheme()}>
          Toggle theme
        </button>
        <button onClick={handleComplexAction}>Complex Action</button>
      </div>
    </div>
  );
}
