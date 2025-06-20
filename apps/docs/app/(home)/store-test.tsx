'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createStore } from '../../../../packages/store/src/store';
import { PreviewFrame } from './preview';

// Test Store Setup
const initialStates = {
  counter: 0,
  name: 'Test Store',
  items: [] as string[],
  theme: 'light' as 'light' | 'dark',
  nested: {
    level1: {
      level2: {
        value: 'deep value'
      }
    }
  }
};

type TestStates = typeof initialStates;

type TestActions = {
  increment: () => void;
  decrement: () => void;
  setName: (name: string) => void;
  addItem: (item: string) => void;
  removeItem: (index: number) => void;
  updateNestedValue: (value: string) => void;
};

type TestSelectors = {
  getCounterId: () => string;
  getItemsCount: () => number;
  getFormattedName: () => string;
  isCounterEven: () => boolean;
  getNestedValue: () => string;
};

const testStore = createStore<TestStates, TestActions, TestSelectors>({
  states: initialStates,
  actions: ({ states }) => ({
    increment: () => {
      states.counter += 1;
    },
    decrement: () => {
      states.counter -= 1;
    },
    setName: (name: string) => {
      states.name = name;
    },
    addItem: (item: string) => {
      states.items.push(item);
    },
    removeItem: (index: number) => {
      states.items.splice(index, 1);
    },
    updateNestedValue: (value: string) => {
      states.nested.level1.level2.value = value;
    }
  }),
  selectors: ({ states }) => ({
    getCounterId: () => `counter-${states.counter}`,
    getItemsCount: () => states.items.length,
    getFormattedName: () => `>>> ${states.name} <<<`,
    isCounterEven: () => states.counter % 2 === 0,
    getNestedValue: () => states.nested.level1.level2.value
  }),
  config: {
    name: 'Test Store',
    devtools: true
  }
});

// Re-render counter hook
function useRenderCounter() {
  const renderCount = useRef(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isClient || typeof window !== 'undefined') {
    renderCount.current += 1;
  }

  return renderCount.current;
}

// Compact Components
function StoreActions() {
  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => testStore.dispatch.increment()}
          className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
        >
          +1
        </button>
        <button
          onClick={() => testStore.dispatch.decrement()}
          className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
        >
          -1
        </button>
        <button
          onClick={() =>
            testStore.dispatch.setName(`Name-${Date.now() % 1000}`)
          }
          className="rounded bg-emerald-500 px-2 py-1 text-xs text-white hover:bg-emerald-600"
        >
          Name
        </button>
        <button
          onClick={() =>
            testStore.dispatch.addItem(`Item ${Date.now() % 1000}`)
          }
          className="rounded bg-purple-500 px-2 py-1 text-xs text-white hover:bg-purple-600"
        >
          + Item
        </button>
        <button
          onClick={() => testStore.dispatch.removeItem(0)}
          className="rounded bg-red-400 px-2 py-1 text-xs text-white hover:bg-red-500"
        >
          - Item
        </button>
        <button
          onClick={() =>
            testStore.dispatch.updateNestedValue(`Val-${Date.now() % 1000}`)
          }
          className="rounded bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-600"
        >
          Nested
        </button>
        <button
          onClick={() => testStore.reset()}
          className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {/* State Display */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <ReactiveCounter />
          <NonReactiveCounter />
        </div>
        <SelectorsDisplay />
      </div>
    </div>
  );
}

function ReactiveCounter() {
  const renderCount = useRenderCounter();
  const counter = testStore.use((state) => state.counter);

  return (
    <div className="rounded border border-blue-200 bg-blue-50 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-blue-800">Reactive</span>
        <span className="rounded bg-blue-200 px-1 text-xs text-blue-700">
          .use()
        </span>
      </div>
      <div className="text-lg font-bold text-blue-900">{counter}</div>
      <div className="text-xs text-blue-600" suppressHydrationWarning>
        Renders: {renderCount}
      </div>
    </div>
  );
}

function NonReactiveCounter() {
  const renderCount = useRenderCounter();
  const [counter, setCounter] = useState(
    testStore.get((state) => state.counter)
  );

  const updateCounter = useCallback(() => {
    setCounter(testStore.get((state) => state.counter));
  }, []);

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-800">Static</span>
        <span className="rounded bg-gray-200 px-1 text-xs text-gray-700">
          .get()
        </span>
      </div>
      <div className="text-lg font-bold text-gray-900">{counter}</div>
      <button
        onClick={updateCounter}
        className="mt-1 rounded bg-gray-400 px-1 py-0.5 text-xs text-white hover:bg-gray-500"
      >
        Refresh
      </button>
      <div className="text-xs text-gray-600" suppressHydrationWarning>
        Renders: {renderCount}
      </div>
    </div>
  );
}

function SelectorsDisplay() {
  const renderCount = useRenderCounter();
  const counterId = testStore.use.getCounterId();
  const itemsCount = testStore.use.getItemsCount();
  const formattedName = testStore.use.getFormattedName();
  const nestedValue = testStore.use.getNestedValue();
  const isEven = testStore.use.isCounterEven();

  return (
    <div className="rounded border border-purple-200 bg-purple-50 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-purple-800">Selectors</span>
        <div className="flex items-center gap-2">
          <span className="rounded bg-purple-200 px-1 text-xs text-purple-700">
            computed
          </span>
          <span className="text-xs text-purple-600" suppressHydrationWarning>
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-purple-700">Counter ID:</span>
          <span className="font-mono text-purple-900">{counterId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-purple-700">Items Count:</span>
          <span className="font-mono text-purple-900">{itemsCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-purple-700">Is Even:</span>
          <span
            className={`font-mono ${isEven ? 'text-green-700' : 'text-red-700'}`}
          >
            {isEven ? '✓ Yes' : '✗ No'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-purple-700">Formatted Name:</span>
          <span className="max-w-20 truncate font-mono text-purple-900">
            {formattedName}
          </span>
        </div>
        <div className="col-span-2 flex justify-between">
          <span className="text-purple-700">Nested Value:</span>
          <span className="truncate font-mono text-purple-900">
            {nestedValue}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BasicStoreTest() {
  const storeActionsCode = `
// Store Setup
const testStore = createStore<TestStates, TestActions, TestSelectors>({
  states: {
    counter: 0,
    name: 'Test Store',
    items: [] as string[],
    nested: { level1: { level2: { value: 'deep value' } } }
  },
  actions: ({ states }) => ({
    increment: () => { states.counter += 1; },
    decrement: () => { states.counter -= 1; },
    setName: (name: string) => { states.name = name; },
    addItem: (item: string) => { states.items.push(item); },
    removeItem: (index: number) => { states.items.splice(index, 1); },
    updateNestedValue: (value: string) => {
      states.nested.level1.level2.value = value;
    },
  }),
  selectors: ({ states }) => ({
    getCounterId: () => \`counter-\${states.counter}\`,
    getItemsCount: () => states.items.length,
    isCounterEven: () => states.counter % 2 === 0
  })
});

// Reactive Component
function ReactiveCounter() {
  const counter = testStore.use((state) => state.counter);
  return <div>{counter}</div>;
}

// Non-Reactive Component
function NonReactiveCounter() {
  const [counter, setCounter] = useState(testStore.get((state) => state.counter));
  const refresh = () => setCounter(testStore.get((state) => state.counter));
  return <div>{counter} <button onClick={refresh}>Refresh</button></div>;
}

// Using Selectors
function SelectorsDisplay() {
  const counterId = testStore.use.getCounterId();
  const itemsCount = testStore.use.getItemsCount();
  const isEven = testStore.use.isCounterEven();
  return <div>{counterId} - {itemsCount} items - {isEven ? 'Even' : 'Odd'}</div>;
}`;

  return (
    <PreviewFrame code={storeActionsCode} title="Basic Store Operations">
      <StoreActions />
    </PreviewFrame>
  );
}
