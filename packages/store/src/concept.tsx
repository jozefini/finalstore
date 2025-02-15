'use client';

import { useRef } from 'react';

// Concept:
// Instead of returning dispatch as function,
// we return as object with methods defined as actions
// The existing dispatch function should be removed
import { createCollection } from './collection-new';
import { createStore } from './store';

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

const collection = createCollection({
  states: {
    text: '',
    completed: false
  },
  actions: {
    toggle: (state) => {
      state.completed = !state.completed;
    },
    text: (state, text: string) => {
      state.text = text;
    }
  }
});

// Instead of returning dispatch as function,
// we return as object with methods defined as actions
// The existing dispatch function should be removed
// Here how it should work:
collection.key('1').dispatch.toggle();
collection.key('1').dispatch.text('New text');

const TodoItem = ({ id }: { id: string }) => {
  const text = collection.key(id).get((s) => s.text);
  const completed = collection.key(id).use((s) => s.completed);

  return (
    <div>
      {text} {completed ? 'completed' : 'not completed'}
      <div>
        <button onClick={() => collection.key(id).remove()}>( X )</button>
        <button onClick={() => collection.key(id).dispatch.toggle()}>
          Toggle
        </button>
      </div>
    </div>
  );
};

const TodoList = () => {
  const currentId = useRef(0);
  const todos = collection.useKeys();
  const total = collection.useSize();

  return (
    <div>
      <h3>Todos ({total})</h3>
      <div>
        <button
          onClick={() => {
            const key = currentId.current.toString();
            collection.key(key).set({
              text: `Todo ${key}`,
              completed: false
            });
            currentId.current++;
          }}
        >
          Add todo
        </button>
      </div>
      {todos.map((id) => (
        <div key={id}>
          <TodoItem id={id} />
        </div>
      ))}
    </div>
  );
};

export function Concept() {
  const isDarkTheme = concept.useSelector.isTheme('light');
  const theme = concept.use((s) => s.theme);
  console.log('isDarkTheme', isDarkTheme);

  return (
    <div>
      <TodoList />
      <br />
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
