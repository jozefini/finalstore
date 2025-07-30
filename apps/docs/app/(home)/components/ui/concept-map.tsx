'use client';

import { useRef } from 'react';

import { createMap } from '../../../../../../packages/store/src/map';

type States = {
  text: string;
  completed: boolean;
};
type Actions = {
  toggle: () => void;
  text: (text: string) => void;
};
type Selectors = {
  text: () => string;
  isCompleted: () => boolean;
};
// type MapSelectors = {
//   completedTasks: () => States[];
//   pendingTasks: () => States[];
//   totalTasks: () => number;
// };

export const collection = createMap<States, Actions, Selectors>({
  states: {
    text: '',
    completed: true
  },
  actions: ({ states }) => ({
    toggle: () => {
      states.completed = !states.completed;
      // invalidate('isCompleted');
      // invalidateMap(['completedTasks', 'pendingTasks']);
    },
    text: (text: string) => {
      states.text = text;
      // invalidate('text');
    }
  }),
  // cacheSelectors: ['text', 'isCompleted'],
  // cacheMapSelectors: ['completedTasks', 'pendingTasks', 'totalTasks'],
  selectors: ({ states }) => ({
    text: () => {
      return states.text;
    },
    isCompleted: () => {
      return states.completed;
    }
  }),
  // mapSelectors: ({ map }) => ({
  //   completedTasks: () => {
  //     return map
  //       .filter((item) => item.states.completed)
  //       .map((item) => item.states);
  //   },
  //   pendingTasks: () => {
  //     return map
  //       .filter((item) => !item.states.completed)
  //       .map((item) => item.states);
  //   },
  //   totalTasks: () => {
  //     return map.filter(() => true).map((item) => item.states).length;
  //   }
  // })
  config: {
    devtools: true,
    name: 'ConceptMap'
  }
});

// Isolated task checkbox component - only re-renders when completed state changes
const TaskCheckbox = ({ id }: { id: string }) => {
  const completed = collection.key(id).use.isCompleted();

  return (
    <input
      type="checkbox"
      checked={completed}
      onChange={() => collection.key(id).dispatch.toggle()}
      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  );
};

// Isolated text display - only re-renders when text changes
const TaskText = ({ id }: { id: string }) => {
  const text = collection.key(id).use.text();

  return <span className="text-lg text-gray-800">{text}</span>;
};

// Isolated text input - only re-renders when text changes
const TaskInput = ({ id }: { id: string }) => {
  const text = collection.key(id).use.text();
  console.log('Render: TaskInput', id);

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => collection.key(id).dispatch.text(e.target.value)}
      placeholder="Task text"
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
  );
};

// Task item component - combines isolated components
const TaskItem = ({ id }: { id: string }) => {
  console.log('Render: TaskItem', id);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <TaskCheckbox id={id} />
      <TaskText id={id} />
      <TaskInput id={id} />
      <button
        onClick={() => collection.key(id).remove()}
        className="ml-auto rounded-md bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
      >
        Delete
      </button>
    </div>
  );
};

// Stats component - demonstrates map selectors
const TaskStats = () => {
  const completed = []; // collection.use.completedTasks();
  const pending = []; // collection.use.pendingTasks();
  const total = 0; // collection.use.totalTasks();
  console.log('Render: TaskStats');

  return (
    <div className="mb-6 grid grid-cols-3 gap-4">
      <div className="rounded-lg bg-green-50 p-4 text-center">
        <div className="text-sm text-green-600">Completed</div>
        <div className="text-2xl font-bold text-green-700">
          {completed.length}
        </div>
      </div>
      <div className="rounded-lg bg-yellow-50 p-4 text-center">
        <div className="text-sm text-yellow-600">Pending</div>
        <div className="text-2xl font-bold text-yellow-700">
          {pending.length}
        </div>
      </div>
      <div className="rounded-lg bg-blue-50 p-4 text-center">
        <div className="text-sm text-blue-600">Total</div>
        <div className="text-2xl font-bold text-blue-700">{total}</div>
      </div>
    </div>
  );
};

// Main test component
export function MapExample() {
  const currentId = useRef(0);
  const keys = collection.useKeys();

  const addTask = () => {
    const id = currentId.current.toString();
    collection.key(id).set({
      text: `Task ${id}`,
      completed: false
    });
    currentId.current++;
  };

  const addMultipleTasks = () => {
    collection.batch(() => {
      for (let i = 0; i < 3; i++) {
        const id = (currentId.current + i).toString();
        collection.key(id).set({
          text: `Batch Task ${id}`,
          completed: false
        });
      }
      currentId.current += 3;
    });
  };

  const toggleAll = () => {
    collection.batch(() => {
      keys.forEach((id) => {
        collection.key(id).dispatch.toggle();
      });
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex gap-4">
        <button
          onClick={addTask}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add Task
        </button>
        <button
          onClick={addMultipleTasks}
          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Add 3 Tasks
        </button>
        <button
          onClick={toggleAll}
          className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          Toggle All
        </button>
        <button
          onClick={() => collection.clear()}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Clear All
        </button>
      </div>

      <TaskStats />

      <div className="space-y-4">
        {keys.map((id) => (
          <TaskItem key={id} id={id} />
        ))}
      </div>
    </div>
  );
}
