'use client';

import { useRef } from 'react';

import { createMap, createStore } from './index';

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
    },
    isTheme: (payload: 'light' | 'dark') => {
      return states.theme === payload;
    }
  })
});

const collection = createMap<
  {
    text: string;
    completed: boolean;
  },
  {
    toggle: () => void;
    text: (text: string) => void;
  },
  {
    isCompleted: () => boolean;
  }
>({
  states: {
    text: '',
    completed: false
  },
  actions: ({ states, map, selectors, actions }) => ({
    toggle: () => {
      states.completed = !states.completed;
    },
    text: (text: string) => {
      states.text = text;
    }
  }),
  selectors: ({ states, selectors }) => ({
    isCompleted: () => {
      return states.completed;
    }
  })
});

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

export function StoreExample() {
  // Basic state usage
  const count = store.use((s) => s.count);
  const taskId = store.use((s) => s.taskId);
  const text = store.use((s) => s.text);

  // Using custom selector
  const isDarkTheme = store.use.isTheme('dark');
  const customText = store.use.getText();

  // Example of batched actions
  const handleBatchedActions = () => {
    store.batch(() => {
      store.dispatch.increment();
      store.dispatch.setText('Updated in batch');
      store.dispatch.toggleTheme();
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Store Example</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Counter Section</h3>
        <p>Count: {count}</p>
        <button onClick={() => store.dispatch.increment()}>Increment</button>
        <button onClick={() => store.dispatch.decrement()}>Decrement</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Task Section</h3>
        <p>Current Task ID: {taskId}</p>
        <button onClick={() => store.dispatch.incrementTaskId()}>
          Next Task
        </button>
        <button onClick={() => store.dispatch.resetTaskId()}>
          Reset Task ID
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Theme Section</h3>
        <p>Is Dark Theme: {isDarkTheme ? 'Yes' : 'No'}</p>
        <button onClick={() => store.dispatch.toggleTheme()}>
          Toggle Theme
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Text Section</h3>
        <p>Current Text: {text}</p>
        <p>Custom Selector Text: {customText}</p>
        <input
          value={text}
          onChange={(e) => store.dispatch.setText(e.target.value)}
          placeholder="Enter text"
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Batch Actions Example</h3>
        <button onClick={handleBatchedActions}>
          Run Multiple Actions (Increment + Set Text + Toggle Theme)
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Todo List Example</h3>
        <TodoList />
      </div>
    </div>
  );
}

export function MapExample() {
  const todos = collection.useKeys();
  const totalTodos = collection.useSize();
  const currentId = useRef(0);

  // Example of batched actions with map
  const handleBatchedTodoActions = () => {
    const id = currentId.current.toString();
    collection.batch(() => {
      // Add new todo
      collection.key(id).set({
        text: `Batched Todo ${id}`,
        completed: false
      });
      // Update existing todo if it exists
      if (todos.length > 0) {
        const firstTodoId = todos[0];
        collection.key(firstTodoId).dispatch.toggle();
        collection.key(firstTodoId).dispatch.text('Updated in batch');
      }
    });
    currentId.current++;
  };

  // Example of using selectors
  const getFirstTodoStatus = () => {
    if (todos.length === 0) return null;
    const firstTodoId = todos[0];
    const isCompleted = collection.key(firstTodoId).get.isCompleted();
    const text = collection.key(firstTodoId).get((s) => s.text);
    return { isCompleted, text };
  };

  const firstTodoStatus = getFirstTodoStatus();

  return (
    <div style={{ padding: '20px' }}>
      <h2>Map Example</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3>Todo Stats</h3>
        <p>Total Todos: {totalTodos}</p>
        {firstTodoStatus && (
          <p>
            First Todo: {firstTodoStatus.text}
            (Status: {firstTodoStatus.isCompleted ? 'Completed' : 'Pending'})
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Todo Actions</h3>
        <button
          onClick={() => {
            const id = currentId.current.toString();
            collection.key(id).set({
              text: `Todo ${id}`,
              completed: false
            });
            currentId.current++;
          }}
        >
          Add Single Todo
        </button>
        <button onClick={handleBatchedTodoActions}>
          Add & Update Todos (Batched)
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Todo List</h3>
        {todos.map((id) => (
          <div
            key={id}
            style={{
              marginBottom: '10px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <TodoItem id={id} />
            <button
              onClick={() => {
                collection.batch(() => {
                  collection.key(id).dispatch.toggle();
                  collection
                    .key(id)
                    .dispatch.text(
                      `${collection.key(id).get((s) => s.text)} (Toggled)`
                    );
                });
              }}
            >
              Toggle & Update (Batched)
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Bulk Actions</h3>
        <button
          onClick={() => {
            collection.batch(() => {
              todos.forEach((id) => {
                collection.key(id).dispatch.toggle();
              });
            });
          }}
        >
          Toggle All Todos
        </button>
        <button onClick={() => collection.clear()}>Clear All Todos</button>
      </div>
    </div>
  );
}
