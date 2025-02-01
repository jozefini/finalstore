'use client';

import {
  createStore,
  createCollection
} from '../../../../../packages/store/src/index';

export const store = createStore({
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
  }
});

export const collection = createCollection({
  states: {
    text: '',
    completed: false
  },
  actions: {
    toggle: (state) => {
      state.completed = !state.completed;
    }
  }
});
