'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createStore } from '../../../../../../packages/store/src/store-3';
import { PreviewFrame } from './preview';

// Test Store Setup
const initialStates = {
  counter: 0,
  name: 'Test Store',
  items: [] as string[],
  loading: false,
  asyncResult: null as string | null,
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
  simulateAsyncOperation: () => Promise<string>;
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
  actions: ({ set, notify }) => ({
    increment: () => {
      set((states) => {
        states.counter += 1;
      });
    },
    decrement: () => {
      set((states) => {
        states.counter -= 1;
      });
    },
    setName: (name: string) => {
      set((states) => {
        states.name = name;
      });
    },
    addItem: (item: string) => {
      set((states) => {
        states.items.push(item);
      });
    },
    removeItem: (index: number) => {
      set((states) => {
        states.items.splice(index, 1);
      });
    },
    updateNestedValue: (value: string) => {
      set((states) => {
        states.nested.level1.level2.value = value;
      });
    },
    simulateAsyncOperation: async () => {
      set((states) => {
        states.loading = true;
        states.asyncResult = null;
      });
      notify();

      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const result = `Async result: ${Math.random().toFixed(4)}`;
        set((states) => {
          states.asyncResult = result;
          states.loading = false;
        });
        return result;
      } catch (error) {
        set((states) => {
          states.loading = false;
        });
        throw error;
      }
    }
  }),
  selectors: ({ get }) => ({
    getCounterId: () => `counter-${get().counter}`,
    getItemsCount: () => get().items.length,
    getFormattedName: () => `>>> ${get().name} <<<`,
    isCounterEven: () => get().counter % 2 === 0,
    getNestedValue: () => get().nested.level1.level2.value
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

// Batching Components
function PerformanceTests() {
  const renderCount = useRenderCounter();
  const [activeTab, setActiveTab] = useState<'batching' | 'stress' | 'memory'>(
    'batching'
  );
  const [results, setResults] = useState<
    {
      test: string;
      duration: number;
      renders: number;
      timestamp: number;
    }[]
  >([]);

  const addResult = (test: string, duration: number, renders: number) => {
    setResults((prev) => [
      ...prev.slice(-4),
      { test, duration, renders, timestamp: Date.now() }
    ]);
  };

  // Batching Performance Test
  const testBatchedOps = () => {
    const start = performance.now();
    const rendersBefore = renderCount;

    testStore.batch(() => {
      testStore.dispatch.increment();
      testStore.dispatch.setName('Batch Test');
      testStore.dispatch.addItem('Batch Item');
      testStore.dispatch.updateNestedValue('Batch Value');
    });

    const duration = performance.now() - start;
    const rendersAfter = renderCount;
    addResult('Batched (4 ops)', duration, rendersAfter - rendersBefore);
  };

  const testSeparateOps = () => {
    const start = performance.now();
    const rendersBefore = renderCount;

    testStore.dispatch.increment();
    testStore.dispatch.setName('Separate Test');
    testStore.dispatch.addItem('Separate Item');
    testStore.dispatch.updateNestedValue('Separate Value');

    const duration = performance.now() - start;
    const rendersAfter = renderCount;
    addResult('Separate (4 ops)', duration, rendersAfter - rendersBefore);
  };

  // Stress Test
  const testBatchedStress = () => {
    const start = performance.now();
    const rendersBefore = renderCount;

    testStore.batch(() => {
      for (let i = 0; i < 1000; i++) {
        testStore.dispatch.increment();
      }
    });

    const duration = performance.now() - start;
    const rendersAfter = renderCount;
    addResult('Batched 1000x', duration, rendersAfter - rendersBefore);
  };

  const testSeparateStress = () => {
    const start = performance.now();
    const rendersBefore = renderCount;

    for (let i = 0; i < 1000; i++) {
      testStore.dispatch.increment();
    }

    const duration = performance.now() - start;
    const rendersAfter = renderCount;

    setTimeout(() => {
      addResult('Separate 1000x', duration, rendersAfter - rendersBefore);
    }, 200);
  };

  // Memory/Component Test
  const [componentCount, setComponentCount] = useState(0);
  const [showComponents, setShowComponents] = useState(false);

  return (
    <div className="min-w-xs space-y-3">
      {/* Tab Navigation */}
      <div className="flex rounded bg-gray-100 p-1">
        {[
          { key: 'batching', label: 'Batching', icon: '⚡' },
          { key: 'stress', label: 'Stress', icon: '🔥' },
          { key: 'memory', label: 'Memory', icon: '🧠' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() =>
              setActiveTab(tab.key as 'batching' | 'stress' | 'memory')
            }
            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'batching' && (
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              onClick={testBatchedOps}
              className="flex-1 rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
            >
              ⚡ Batched
            </button>
            <button
              onClick={testSeparateOps}
              className="flex-1 rounded bg-orange-500 px-2 py-1 text-xs text-white hover:bg-orange-600"
            >
              🔄 Separate
            </button>
          </div>
        </div>
      )}

      {activeTab === 'stress' && (
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              onClick={testBatchedStress}
              className="flex-1 rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
            >
              ⚡ Batch 1000x
            </button>
            <button
              onClick={testSeparateStress}
              className="flex-1 rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
            >
              🔥 Separate 1000x
            </button>
          </div>
        </div>
      )}

      {activeTab === 'memory' && (
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setComponentCount((prev) => prev + 10)}
              className="flex-1 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
            >
              +10 Components
            </button>
            <button
              onClick={() => setShowComponents(!showComponents)}
              className="flex-1 rounded bg-purple-500 px-2 py-1 text-xs text-white hover:bg-purple-600"
            >
              {showComponents ? 'Hide' : 'Show'} ({componentCount})
            </button>
            <button
              onClick={() => {
                setComponentCount(0);
                setShowComponents(false);
              }}
              className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
            >
              Clear
            </button>
          </div>
          {showComponents && componentCount > 0 && (
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: componentCount }, (_, i) => (
                <TempCounter key={i} id={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results Display */}
      <div className="rounded border border-gray-200 bg-gray-50 p-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-800">
            Performance Results
          </span>
          <span className="text-xs text-gray-600" suppressHydrationWarning>
            Renders: {renderCount}
          </span>
        </div>
        <div className="max-h-20 min-h-[60px] space-y-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-2 text-center text-xs italic text-gray-500">
              No results yet... Run a test above!
            </p>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className="flex justify-between rounded bg-white px-2 py-1 text-xs"
              >
                <span className="text-gray-700">{result.test}</span>
                <div className="flex gap-2 font-mono">
                  <span className="text-blue-600">
                    {result.duration.toFixed(1)}ms
                  </span>
                  <span className="text-green-600">{result.renders}r</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Temporary counter component for memory testing
function TempCounter({ id }: { id: number }) {
  const counter = testStore.use((state) => state.counter);
  return (
    <div className="rounded bg-blue-100 p-1 text-center text-xs">
      <div className="text-blue-800">#{id}</div>
      <div className="font-mono text-blue-900">{counter}</div>
    </div>
  );
}

function AsyncOperations() {
  const renderCount = useRenderCounter();
  const loading = testStore.use((state) => state.loading);
  const asyncResult = testStore.use((state) => state.asyncResult);
  const [promiseResult, setPromiseResult] = useState<string | null>(null);

  const handleAsyncOperation = async () => {
    try {
      const result = await testStore.dispatch.simulateAsyncOperation();
      setPromiseResult(result);
    } catch (error) {
      console.error('❌ Async operation failed:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Async Button */}
      <button
        onClick={handleAsyncOperation}
        disabled={loading}
        className="w-full rounded bg-yellow-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-yellow-300"
      >
        {loading ? '⏳ Loading...' : '🚀 Start Async Operation'}
      </button>

      {/* Status Display */}
      <div className="min-w-xs rounded border border-yellow-200 bg-yellow-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-yellow-800">
            Async Status
          </span>
          <div className="flex items-center gap-2">
            {loading && (
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
            )}
            <span className="text-xs text-yellow-600" suppressHydrationWarning>
              Renders: {renderCount}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-yellow-700">Loading:</span>
            <span
              className={`rounded px-1 py-0.5 text-xs font-medium ${
                loading
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {loading ? '🔄' : '✅'}
            </span>
          </div>
          <div>
            <span className="text-yellow-700">State Result:</span>
            <div className="mt-1 max-w-full truncate rounded bg-yellow-100 px-2 py-1 font-mono text-yellow-900">
              {asyncResult || 'None'}
            </div>
          </div>
          <div>
            <span className="text-yellow-700">Promise Result:</span>
            <div className="mt-1 max-w-full truncate rounded bg-yellow-100 px-2 py-1 font-mono text-yellow-900">
              {promiseResult || 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchingActions() {
  const renderCount = useRenderCounter();

  // Track state changes
  const counter = testStore.use((state) => state.counter);
  const name = testStore.use((state) => state.name);
  const itemsLength = testStore.use((state) => state.items.length);
  const nestedValue = testStore.use(
    (state) => state.nested.level1.level2.value
  );

  const testBatchedOperations = () => {
    testStore.batch(() => {
      testStore.dispatch.increment();
      testStore.dispatch.setName('Batched Update');
      testStore.dispatch.addItem('Batch Item');
      testStore.dispatch.updateNestedValue('Batched Value');
    });
  };

  const testSeparateOperations = () => {
    testStore.dispatch.increment();
    testStore.dispatch.setName('Separate Update');
    testStore.dispatch.addItem('Separate Item');
    testStore.dispatch.updateNestedValue('Separate Value');
  };

  return (
    <div className="min-w-xs space-y-3">
      {/* Test Buttons */}
      <div className="flex gap-2">
        <button
          onClick={testBatchedOperations}
          className="flex-1 rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600"
        >
          ⚡ Batched Ops
        </button>
        <button
          onClick={testSeparateOperations}
          className="flex-1 rounded bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600"
        >
          🔄 Separate Ops
        </button>
      </div>

      {/* Current State */}
      <div className="rounded border border-green-200 bg-green-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-green-800">
            Current State
          </span>
          <span className="text-xs text-green-600" suppressHydrationWarning>
            Renders: {renderCount}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-green-700">Counter:</span>
            <span className="font-mono text-green-900">{counter}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Items:</span>
            <span className="font-mono text-green-900">{itemsLength}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Name:</span>
            <span className="max-w-20 truncate font-mono text-green-900">
              {name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Nested:</span>
            <span className="max-w-20 truncate font-mono text-green-900">
              {nestedValue}
            </span>
          </div>
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

export function BatchingTest() {
  const batchingCode = `
// Batching Demo - Multiple different actions
const testStore = createStore({
  states: {
    counter: 0,
    name: 'Test Store',
    items: [] as string[],
    nested: { level1: { level2: { value: 'deep value' } } }
  },
  actions: ({ states }) => ({
    increment: () => { states.counter += 1; },
    setName: (name: string) => { states.name = name; },
    addItem: (item: string) => { states.items.push(item); },
    updateNestedValue: (value: string) => {
      states.nested.level1.level2.value = value;
    }
  })
});

// Usage - Batched vs Separate
function BatchingExample() {
  const renderCount = useRenderCounter();
  const counter = testStore.use((state) => state.counter);
  const name = testStore.use((state) => state.name);
  const itemsLength = testStore.use((state) => state.items.length);
  const nestedValue = testStore.use((state) => state.nested.level1.level2.value);

  // Batched: Multiple operations in single render cycle
  const runBatched = () => {
    testStore.batch(() => {
      testStore.dispatch.increment();
      testStore.dispatch.setName('Batched Update');
      testStore.dispatch.addItem('Batch Item');
      testStore.dispatch.updateNestedValue('Batched Value');
    });
  };

  // Separate: Each operation triggers its own render
  const runSeparate = () => {
    testStore.dispatch.increment();
    testStore.dispatch.setName('Separate Update');
    testStore.dispatch.addItem('Separate Item');
    testStore.dispatch.updateNestedValue('Separate Value');
  };

  return (
    <div>
      <button onClick={runBatched}>⚡ Batched (1 render)</button>
      <button onClick={runSeparate}>🔄 Separate (4 renders)</button>
      <div>Counter: {counter}, Items: {itemsLength}</div>
      <div>Name: {name}, Nested: {nestedValue}</div>
      <div>Renders: {renderCount}</div>
    </div>
  );
}`;

  return (
    <PreviewFrame code={batchingCode} title="Batching vs Separate Operations">
      <BatchingActions />
    </PreviewFrame>
  );
}

export function AsyncTest() {
  const asyncCode = `
// Async Operations Demo
const testStore = createStore({
  states: {
    counter: 0,
    loading: false,
    asyncResult: null as string | null
  },
  actions: ({ states, notify }) => ({
    increment: () => { states.counter += 1; },
    simulateAsyncOperation: async () => {
      states.loading = true;
      states.asyncResult = null;
      notify(); // Trigger re-render immediately

      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const result = \`Async result: \${Math.random().toFixed(4)}\`;
        states.asyncResult = result;
        states.loading = false;
        return result; // Return value from action
      } catch (error) {
        states.loading = false;
        throw error;
      }
    }
  })
});

// Usage - State vs Promise Result
function AsyncExample() {
  const renderCount = useRenderCounter();
  const loading = testStore.use((state) => state.loading);
  const asyncResult = testStore.use((state) => state.asyncResult);
  const [promiseResult, setPromiseResult] = useState<string | null>(null);

  const handleAsync = async () => {
    try {
      // Get result from promise return value
      const result = await testStore.dispatch.simulateAsyncOperation();
      setPromiseResult(result);
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleAsync} disabled={loading}>
        {loading ? '⏳ Loading...' : '🚀 Start Async'}
      </button>
      <div>Loading: {loading ? '🔄' : '✅'}</div>
      <div>State Result: {asyncResult || 'None'}</div>
      <div>Promise Result: {promiseResult || 'None'}</div>
      <div>Renders: {renderCount}</div>
    </div>
  );
}`;

  return (
    <PreviewFrame code={asyncCode} title="Async Operations">
      <AsyncOperations />
    </PreviewFrame>
  );
}

export function PerformanceTest() {
  const performanceCode = `
// Performance Testing Suite
const testStore = createStore({
  states: {
    counter: 0,
    name: 'Test Store',
    items: [] as string[],
    nested: { level1: { level2: { value: 'deep value' } } }
  },
  actions: ({ states }) => ({
    increment: () => { states.counter += 1; },
    setName: (name: string) => { states.name = name; },
    addItem: (item: string) => { states.items.push(item); },
    updateNestedValue: (value: string) => {
      states.nested.level1.level2.value = value;
    }
  })
});

// Performance Test Component
function PerformanceTests() {
  const renderCount = useRenderCounter();
  const [activeTab, setActiveTab] = useState('batching');
  const [results, setResults] = useState([]);

  // Batching vs Separate Operations
  const testBatched = () => {
    const start = performance.now();
    const rendersBefore = renderCount;

    testStore.batch(() => {
      testStore.dispatch.increment();
      testStore.dispatch.setName('Batch Test');
      testStore.dispatch.addItem('Batch Item');
      testStore.dispatch.updateNestedValue('Batch Value');
    });

    // Measure after async completion
    setTimeout(() => {
      const duration = performance.now() - start;
      const renders = renderCount - rendersBefore;
      addResult('Batched (4 ops)', duration, renders);
    }, 10);
  };

  // Stress Testing
  const testStress = () => {
    const start = performance.now();

    testStore.batch(() => {
      for (let i = 0; i < 100; i++) {
        testStore.dispatch.increment();
      }
    });

    const duration = performance.now() - start;
    console.log(\`Stress test completed in \${duration.toFixed(2)}ms\`);
  };

  // Memory Testing with Multiple Components
  const [componentCount, setComponentCount] = useState(0);

  return (
    <div>
      <div>Tab: {activeTab}</div>
      <button onClick={testBatched}>⚡ Test Batching</button>
      <button onClick={testStress}>🔥 Stress Test</button>
      <button onClick={() => setComponentCount(count => count + 10)}>
        +10 Components ({componentCount})
      </button>
      <div>Results: {results.length} tests completed</div>
      <div>Renders: {renderCount}</div>
    </div>
  );
}`;

  return (
    <PreviewFrame code={performanceCode} title="Performance Testing Suite">
      <PerformanceTests />
    </PreviewFrame>
  );
}
