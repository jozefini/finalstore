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
  actions: ({ states, map }) => ({
    toggle: () => {
      console.log('Toggle action - before:', { completed: states.completed });
      states.completed = !states.completed;
      console.log('Toggle action - after:', { completed: states.completed });
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

const TodoItem = ({ id }: { id: string }) => {
  const text = collection.key(id).use((s) => s.text);
  const completed = collection.key(id).use((s) => s.completed);

  return (
    <div className="mb-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={completed}
            onChange={() => collection.key(id).dispatch.toggle()}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span
            className={`text-lg ${completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}
          >
            {text}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => collection.key(id).dispatch.toggle()}
            className="rounded bg-blue-50 px-3 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-100"
          >
            {completed ? 'Mark Incomplete' : 'Mark Complete'}
          </button>
          <button
            onClick={() => collection.key(id).remove()}
            className="rounded bg-red-50 px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => collection.key(id).dispatch.text(e.target.value)}
          placeholder="Update text"
          className="block w-full flex-1 rounded-md border-gray-300 bg-gray-50 p-2 text-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <button
          onClick={() =>
            collection
              .key(id)
              .dispatch.text(`Updated: ${new Date().toLocaleTimeString()}`)
          }
          className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
        >
          Update Text
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Todos ({total})</h3>
        <button
          onClick={() => {
            const key = currentId.current.toString();
            collection.key(key).set({
              text: `New Todo ${key}`,
              completed: false
            });
            currentId.current++;
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Add New Todo
        </button>
      </div>

      {total === 0 ? (
        <div className="rounded-md bg-gray-100 py-8 text-center text-gray-500">
          No todos yet. Add one to get started!
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((id) => (
            <TodoItem key={id} id={id} />
          ))}

          <div className="mt-4 flex justify-between border-t border-gray-200 pt-4">
            <button
              onClick={() => {
                collection.batch(() => {
                  todos.forEach((id) => {
                    collection.key(id).dispatch.toggle();
                  });
                });
              }}
              className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
            >
              Toggle All Todos
            </button>
            <button
              onClick={() => collection.clear()}
              className="rounded-md bg-red-100 px-4 py-2 text-red-700 transition-colors hover:bg-red-200"
            >
              Clear All Todos
            </button>
          </div>
        </div>
      )}
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
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Store Examples</h2>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Counter Example
          </h3>
          <div className="mb-4">
            <div className="mb-4 text-center text-3xl font-bold">{count}</div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => store.dispatch.increment()}
                className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Increment
              </button>
              <button
                onClick={() => store.dispatch.decrement()}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                Decrement
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Task ID Example
          </h3>
          <div className="mb-4">
            <div className="mb-4 text-center text-3xl font-bold">
              Task #{taskId}
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => store.dispatch.incrementTaskId()}
                className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Next Task
              </button>
              <button
                onClick={() => store.dispatch.resetTaskId()}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                Reset Task ID
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Theme Example
          </h3>
          <div className="mb-4">
            <div
              className={`mb-4 rounded-md p-6 text-center ${isDarkTheme ? 'bg-gray-800 text-white' : 'bg-yellow-100 text-yellow-800'}`}
            >
              Current Theme: {isDarkTheme ? 'Dark' : 'Light'}
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => store.dispatch.toggleTheme()}
                className="rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
              >
                Toggle Theme
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Text Example
          </h3>
          <div className="mb-4">
            <div className="mb-4 rounded-md bg-gray-50 p-3 text-center font-medium">
              {text}
            </div>
            <input
              value={text}
              onChange={(e) => store.dispatch.setText(e.target.value)}
              placeholder="Enter text"
              className="mb-4 w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="mb-2 text-sm text-gray-500">
              Custom Selector: "{customText}"
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Batched Actions Example
        </h3>
        <div className="mb-4 rounded-md bg-gray-50 p-4 text-sm">
          <p>This demonstrates executing multiple actions in a single batch:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Increment the counter</li>
            <li>Set the text to "Updated in batch"</li>
            <li>Toggle the theme</li>
          </ul>
        </div>
        <button
          onClick={handleBatchedActions}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
        >
          Run Multiple Actions in a Batch
        </button>
      </div>

      <div className="mb-8">
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          Todo Collection Example
        </h3>
        <p className="mb-4 text-gray-600">
          This demonstrates using a collection to manage multiple todo items,
          each with their own state.
        </p>
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
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Map Collection Examples
      </h2>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Collection Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md bg-blue-50 p-4 text-center">
            <div className="mb-1 text-sm text-blue-600">Total Todos</div>
            <div className="text-3xl font-bold text-blue-800">{totalTodos}</div>
          </div>

          {firstTodoStatus && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="mb-1 text-sm text-green-600">First Todo</div>
              <div className="truncate font-medium text-green-800">
                {firstTodoStatus.text}
              </div>
              <div
                className={`mt-1 text-sm ${firstTodoStatus.isCompleted ? 'text-green-700' : 'text-yellow-700'}`}
              >
                Status: {firstTodoStatus.isCompleted ? 'Completed' : 'Pending'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Add Todo Actions
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => {
              const id = currentId.current.toString();
              collection.key(id).set({
                text: `Todo ${id}`,
                completed: false
              });
              currentId.current++;
            }}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Add Single Todo
          </button>
          <button
            onClick={handleBatchedTodoActions}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
          >
            Add & Update (Batched)
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Todo Items</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                collection.batch(() => {
                  todos.forEach((id) => {
                    collection.key(id).dispatch.toggle();
                  });
                });
              }}
              className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200"
            >
              Toggle All
            </button>
            <button
              onClick={() => collection.clear()}
              className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 transition-colors hover:bg-red-200"
            >
              Clear All
            </button>
          </div>
        </div>

        {todos.length === 0 ? (
          <div className="rounded-md bg-gray-50 py-10 text-center text-gray-500">
            No todos available. Add some using the buttons above.
          </div>
        ) : (
          <div className="space-y-4">
            {todos.map((id) => (
              <div
                key={id}
                className="overflow-hidden rounded-md border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="flex-1 p-4">
                    <TodoItem id={id} />
                  </div>
                  <div className="border-t border-gray-200 bg-gray-50 p-4 sm:border-l sm:border-t-0">
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
                      className="w-full rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
                    >
                      Toggle & Update Text
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
