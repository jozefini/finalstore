'use client';

import {
  createMap,
  createScopedStore,
  createStore
} from '../../../../../packages/store/src/index';

export const store = createStore({
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
    }
  }),
  selectors: ({ states }) => ({
    getText: () => {
      return states.text;
    }
  })
});

export const scoped = createScopedStore({
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
    }
  }),
  selectors: ({ states }) => ({
    getText: () => {
      return states.text;
    }
  })
});

export const collection = createMap({
  states: {
    text: '',
    completed: false
  },
  actions: ({ states }) => ({
    toggle: (state) => {
      state.completed = !state.completed;
    },
    text: (text: string) => {
      states.text = text;
    }
  }),
  selectors: ({ states }) => ({
    isCompleted: () => {
      return states.completed;
    }
  })
});
