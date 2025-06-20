'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createStore } from '../../../../packages/store/src/store';

// Test Store Setup
const initialStates = {
  counter: 0,
  name: 'Test Store',
  items: [] as string[],
  loading: false,
  asyncResult: null as string | null,
  batchCounter: 0,
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
  clearItems: () => void;
  simulateAsyncOperation: () => Promise<string>;
  batchedOperations: () => void;
  multipleSeparateOperations: () => void;
  toggleTheme: () => void;
  updateNestedValue: (value: string) => void;
  heavyOperation: () => void;
  reset: () => void;
};

type TestSelectors = {
  getCounterId: () => string;
  getItemsCount: () => number;
  getFormattedName: () => string;
  isCounterEven: () => boolean;
  getNestedValue: () => string;
};

type TestEvents = {
  counterChanged: { counter: number; timestamp: number };
  itemAdded: { item: string; total: number };
  asyncCompleted: { result: string; duration: number };
  batchExecuted: { operations: number };
  themeChanged: { theme: string };
};

const testStore = createStore<
  TestStates,
  TestActions,
  TestSelectors,
  TestEvents
>({
  states: initialStates,
  actions: ({ states, trigger }) => ({
    increment: () => {
      states.counter += 1;
      trigger('counterChanged', {
        counter: states.counter,
        timestamp: Date.now()
      });
    },
    decrement: () => {
      states.counter -= 1;
      trigger('counterChanged', {
        counter: states.counter,
        timestamp: Date.now()
      });
    },
    setName: (name: string) => {
      states.name = name;
    },
    addItem: (item: string) => {
      states.items.push(item);
      trigger('itemAdded', { item, total: states.items.length });
    },
    clearItems: () => {
      states.items = [];
    },
    simulateAsyncOperation: async () => {
      const startTime = Date.now();
      states.loading = true;
      states.asyncResult = null;

      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const result = `Async result: ${Math.random().toFixed(4)}`;
        states.asyncResult = result;
        states.loading = false;

        const duration = Date.now() - startTime;
        trigger('asyncCompleted', { result, duration });
        return result;
      } catch (error) {
        states.loading = false;
        throw error;
      }
    },
    batchedOperations: () => {
      states.counter += 5;
      states.name = 'Batched Update';
      states.batchCounter += 1;
      states.items.push(`Batch item ${states.batchCounter}`);
      trigger('batchExecuted', { operations: 4 });
    },
    multipleSeparateOperations: () => {
      // These will trigger separate re-renders
      states.counter += 1;
      setTimeout(() => {
        states.name = 'Separate Update 1';
      }, 0);
      setTimeout(() => {
        states.batchCounter += 1;
      }, 10);
      setTimeout(() => {
        states.items.push(`Separate item ${Date.now()}`);
      }, 20);
    },
    toggleTheme: () => {
      states.theme = states.theme === 'light' ? 'dark' : 'light';
      trigger('themeChanged', { theme: states.theme });
    },
    updateNestedValue: (value: string) => {
      states.nested.level1.level2.value = value;
    },
    heavyOperation: () => {
      // Simulate heavy computation
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Busy wait for 100ms
      }
      states.counter += 1;
    },
    reset: () => {
      states.counter = initialStates.counter;
      states.name = initialStates.name;
      states.items = [...initialStates.items];
      states.loading = initialStates.loading;
      states.asyncResult = initialStates.asyncResult;
      states.batchCounter = initialStates.batchCounter;
      states.theme = initialStates.theme;
      states.nested = JSON.parse(JSON.stringify(initialStates.nested));
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
function useRenderCounter(name: string) {
  const renderCount = useRef(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only increment on client side to avoid hydration mismatch
  if (isClient || typeof window !== 'undefined') {
    renderCount.current += 1;
  }

  useEffect(() => {
    if (isClient) {
      console.log(`🔄 ${name} rendered #${renderCount.current}`);
    }
  });

  return renderCount.current;
}

// Safe render count display component
function RenderCountDisplay({
  count,
  className = 'text-sm text-gray-600'
}: {
  count: number;
  className?: string;
}) {
  return (
    <p className={className} suppressHydrationWarning>
      Renders: {count}
    </p>
  );
}

// Component render count display
function ComponentRenderCount({
  count,
  className = 'text-sm text-gray-600'
}: {
  count: number;
  className?: string;
}) {
  return (
    <p className={className} suppressHydrationWarning>
      Component renders: {count}
    </p>
  );
}

// Test Components
function ReactiveCounter() {
  const renderCount = useRenderCounter('ReactiveCounter');
  const counter = testStore.use((state) => state.counter);

  return (
    <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-900">
          🔄 Reactive Counter
        </h3>
        <span className="rounded-full bg-blue-200 px-2 py-1 text-xs font-medium text-blue-800">
          .use()
        </span>
      </div>
      <div className="mb-4 text-center">
        <div className="mb-2 text-4xl font-bold text-blue-900">{counter}</div>
        <p className="text-sm text-blue-700">
          Updates automatically on state change
        </p>
      </div>
      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-blue-600"
      />
    </div>
  );
}

function NonReactiveCounter() {
  const renderCount = useRenderCounter('NonReactiveCounter');
  const [counter, setCounter] = useState(
    testStore.get((state) => state.counter)
  );

  const updateCounter = useCallback(() => {
    setCounter(testStore.get((state) => state.counter));
  }, []);

  return (
    <div className="rounded-lg border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          📷 Non-Reactive Counter
        </h3>
        <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-800">
          .get()
        </span>
      </div>
      <div className="mb-4 text-center">
        <div className="mb-2 text-4xl font-bold text-gray-900">{counter}</div>
        <p className="mb-3 text-sm text-gray-700">Requires manual refresh</p>
        <button
          onClick={updateCounter}
          className="rounded bg-gray-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          🔄 Manual Update
        </button>
      </div>
      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-gray-600"
      />
    </div>
  );
}

function SelectorsTest() {
  const renderCount = useRenderCounter('SelectorsTest');
  const counterId = testStore.use.getCounterId();
  const itemsCount = testStore.use.getItemsCount();
  const formattedName = testStore.use.getFormattedName();
  const isEven = testStore.use.isCounterEven();
  const nestedValue = testStore.use.getNestedValue();

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
        <h4 className="mb-3 text-sm font-medium text-purple-900">
          📊 Computed Values
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-purple-700">Counter ID:</span>
            <code className="rounded bg-purple-100 px-2 py-1 text-purple-900">
              {counterId}
            </code>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-700">Items Count:</span>
            <code className="rounded bg-purple-100 px-2 py-1 text-purple-900">
              {itemsCount}
            </code>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-700">Formatted Name:</span>
            <code className="max-w-32 truncate rounded bg-purple-100 px-2 py-1 text-purple-900">
              {formattedName}
            </code>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-700">Is Even:</span>
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                isEven
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isEven ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-700">Nested Value:</span>
            <code className="max-w-32 truncate rounded bg-purple-100 px-2 py-1 text-purple-900">
              {nestedValue}
            </code>
          </div>
        </div>
      </div>
      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-purple-600"
      />
    </div>
  );
}

function BatchingTest() {
  const renderCount = useRenderCounter('BatchingTest');

  // Track state changes
  const counter = testStore.use((state) => state.counter);
  const name = testStore.use((state) => state.name);
  const batchCounter = testStore.use((state) => state.batchCounter);
  const itemsLength = testStore.use((state) => state.items.length);

  const testBatchedOperations = () => {
    testStore.batch(() => {
      testStore.dispatch.batchedOperations();
    });
    console.log('🔄 Batched operation executed');
  };

  const testSeparateOperations = () => {
    testStore.dispatch.multipleSeparateOperations();
    console.log('🔄 Separate operations executed');
  };

  return (
    <div className="space-y-4">
      {/* Current State */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <h4 className="mb-3 text-sm font-medium text-green-900">
          📈 Current State
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-green-900">{counter}</div>
            <div className="text-green-700">Counter</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-900">
              {itemsLength}
            </div>
            <div className="text-green-700">Items</div>
          </div>
        </div>
        <div className="mt-2 text-center">
          <div className="text-xs text-green-700">Name: {name}</div>
          <div className="text-xs text-green-700">
            Batch Counter: {batchCounter}
          </div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="flex gap-2">
        <button
          onClick={testBatchedOperations}
          className="flex-1 rounded bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
        >
          ⚡ Batched Ops
        </button>
        <button
          onClick={testSeparateOperations}
          className="flex-1 rounded bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          🔄 Separate Ops
        </button>
      </div>

      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-green-600"
      />
    </div>
  );
}

function AsyncTest() {
  const renderCount = useRenderCounter('AsyncTest');
  const loading = testStore.use((state) => state.loading);
  const asyncResult = testStore.use((state) => state.asyncResult);
  const [promiseResult, setPromiseResult] = useState<string | null>(null);

  const handleAsyncOperation = async () => {
    try {
      const result = await testStore.dispatch.simulateAsyncOperation();
      setPromiseResult(result);
      console.log('✅ Async operation completed:', result);
    } catch (error) {
      console.error('❌ Async operation failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <h4 className="text-sm font-medium text-yellow-900">
            ⏳ Async Status
          </h4>
          {loading && (
            <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-500"></div>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-yellow-700">Loading:</span>
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                loading
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {loading ? '🔄 Loading...' : '✅ Ready'}
            </span>
          </div>
          <div>
            <span className="text-yellow-700">State Result:</span>
            <div className="mt-1 break-all rounded bg-yellow-100 p-2 text-xs text-yellow-900">
              {asyncResult || 'None'}
            </div>
          </div>
          <div>
            <span className="text-yellow-700">Promise Result:</span>
            <div className="mt-1 break-all rounded bg-yellow-100 p-2 text-xs text-yellow-900">
              {promiseResult || 'None'}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleAsyncOperation}
        disabled={loading}
        className="w-full rounded bg-yellow-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-yellow-300"
      >
        {loading ? '⏳ Loading...' : '🚀 Start Async Operation'}
      </button>

      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-yellow-600"
      />
    </div>
  );
}

function EventsTest() {
  const renderCount = useRenderCounter('EventsTest');
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const eventHandlers = {
      counterChanged: (payload: { counter: number; timestamp: number }) => {
        const event = `Counter → ${payload.counter} at ${new Date(payload.timestamp).toLocaleTimeString()}`;
        setEvents((prev) => [...prev.slice(-4), event]);
        console.log('📢 Event:', event);
      },
      itemAdded: (payload: { item: string; total: number }) => {
        const event = `Item added: "${payload.item}" (total: ${payload.total})`;
        setEvents((prev) => [...prev.slice(-4), event]);
        console.log('📢 Event:', event);
      },
      asyncCompleted: (payload: { result: string; duration: number }) => {
        const event = `Async completed in ${payload.duration}ms`;
        setEvents((prev) => [...prev.slice(-4), event]);
        console.log('📢 Event:', event);
      },
      batchExecuted: (payload: { operations: number }) => {
        const event = `Batch executed with ${payload.operations} operations`;
        setEvents((prev) => [...prev.slice(-4), event]);
        console.log('📢 Event:', event);
      },
      themeChanged: (payload: { theme: string }) => {
        const event = `Theme → ${payload.theme}`;
        setEvents((prev) => [...prev.slice(-4), event]);
        console.log('📢 Event:', event);
      }
    };

    // Register event listeners
    testStore.on(
      'events-test-counter',
      'counterChanged',
      eventHandlers.counterChanged
    );
    testStore.on('events-test-item', 'itemAdded', eventHandlers.itemAdded);
    testStore.on(
      'events-test-async',
      'asyncCompleted',
      eventHandlers.asyncCompleted
    );
    testStore.on(
      'events-test-batch',
      'batchExecuted',
      eventHandlers.batchExecuted
    );
    testStore.on(
      'events-test-theme',
      'themeChanged',
      eventHandlers.themeChanged
    );

    return () => {
      testStore.off('events-test-counter');
      testStore.off('events-test-item');
      testStore.off('events-test-async');
      testStore.off('events-test-batch');
      testStore.off('events-test-theme');
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Event Log */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-indigo-900">📡 Event Log</h4>
          <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-800">
            Last 5 events
          </span>
        </div>
        <div className="max-h-32 min-h-[100px] overflow-y-auto rounded-lg bg-indigo-100 p-3">
          {events.length === 0 ? (
            <p className="py-4 text-center text-sm italic text-indigo-600">
              No events yet... Trigger some actions above!
            </p>
          ) : (
            <div className="space-y-1">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="rounded bg-white px-2 py-1 font-mono text-xs text-indigo-800"
                >
                  📢 {event}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setEvents([])}
        className="w-full rounded bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
      >
        🗑️ Clear Event Log
      </button>

      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-indigo-600"
      />
    </div>
  );
}

function StateInspector() {
  const renderCount = useRenderCounter('StateInspector');
  const [useReactive, setUseReactive] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Reactive state
  const reactiveState = testStore.use();

  // Non-reactive state
  const [nonReactiveState, setNonReactiveState] = useState(testStore.get());

  useEffect(() => {
    if (autoRefresh && !useReactive) {
      const interval = setInterval(() => {
        setNonReactiveState(testStore.get());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, useReactive]);

  const currentState = useReactive ? reactiveState : nonReactiveState;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setUseReactive(!useReactive)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            useReactive
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {useReactive ? '🔄 Reactive' : '📷 Static'}
        </button>
        {!useReactive && (
          <>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                autoRefresh
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {autoRefresh ? '⏱️ Auto: ON' : '⏱️ Auto: OFF'}
            </button>
            <button
              onClick={() => setNonReactiveState(testStore.get())}
              className="rounded bg-gray-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-600"
            >
              🔄 Refresh
            </button>
          </>
        )}
      </div>

      {/* State Display */}
      <div className="rounded-lg border border-gray-200 bg-gray-50">
        <div className="rounded-t-lg border-b border-gray-200 bg-gray-100 px-4 py-2">
          <h4 className="text-sm font-medium text-gray-900">
            🔍 State Snapshot
          </h4>
        </div>
        <pre className="max-h-40 overflow-auto p-4 font-mono text-xs text-gray-800">
          {JSON.stringify(currentState, null, 2)}
        </pre>
      </div>

      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-gray-600"
      />
    </div>
  );
}

// Test for memory leaks and subscription cleanup
function SubscriptionLeakTest() {
  const renderCount = useRenderCounter('SubscriptionLeakTest');
  const [componentCount, setComponentCount] = useState(0);
  const [showComponents, setShowComponents] = useState(false);

  return (
    <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
      <h4 className="font-semibold text-orange-800">Subscription Leak Test</h4>
      <p className="mb-2 text-sm text-orange-600">
        Tests if components properly clean up subscriptions when unmounted
      </p>

      <div className="mb-2 flex gap-1">
        <button
          onClick={() => setComponentCount((prev) => prev + 5)}
          className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
        >
          Add 5 Components
        </button>
        <button
          onClick={() => setShowComponents(!showComponents)}
          className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
        >
          {showComponents ? 'Hide' : 'Show'} ({componentCount})
        </button>
        <button
          onClick={() => {
            setComponentCount(0);
            setShowComponents(false);
          }}
          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
        >
          Clear All
        </button>
      </div>

      {showComponents && (
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: componentCount }, (_, i) => (
            <TempCounterComponent key={i} id={i} />
          ))}
        </div>
      )}

      <RenderCountDisplay count={renderCount} />
    </div>
  );
}

function TempCounterComponent({ id }: { id: number }) {
  const renderCount = useRenderCounter(`TempCounter-${id}`);
  const counter = testStore.use((state) => state.counter);

  return (
    <div className="rounded bg-orange-100 p-1 text-xs">
      <div>#{id}</div>
      <div>{counter}</div>
      <div className="text-orange-600" suppressHydrationWarning>
        {renderCount}
      </div>
    </div>
  );
}

// Detailed re-render comparison
function RerenderComparisonTest() {
  const renderCount = useRenderCounter('RerenderComparisonTest');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-4), `${timestamp}: ${message}`]);
  };

  const testReactiveRender = () => {
    addLog('🔄 Triggering reactive render test');
    testStore.dispatch.increment();
  };

  const testBatchedRender = () => {
    addLog('🔄 Triggering batched render test');
    testStore.batch(() => {
      testStore.dispatch.increment();
      testStore.dispatch.setName('Batched ' + Date.now());
      testStore.dispatch.addItem('Batched item ' + Date.now());
    });
  };

  const testSeparateRenders = () => {
    addLog('🔄 Triggering separate renders test');
    testStore.dispatch.increment();
    testStore.dispatch.setName('Separate ' + Date.now());
    testStore.dispatch.addItem('Separate item ' + Date.now());
  };

  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
      <h4 className="font-semibold text-teal-800">Detailed Re-render Test</h4>
      <p className="mb-2 text-sm text-teal-600">
        Watch console for detailed render logs
      </p>

      <div className="mb-2 flex gap-1">
        <button
          onClick={testReactiveRender}
          className="rounded bg-teal-600 px-2 py-1 text-xs text-white hover:bg-teal-700"
        >
          Single Update
        </button>
        <button
          onClick={testBatchedRender}
          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
        >
          Batched Updates
        </button>
        <button
          onClick={testSeparateRenders}
          className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
        >
          Separate Updates
        </button>
      </div>

      <div className="max-h-20 overflow-y-auto rounded bg-teal-100 p-2 text-xs">
        {logs.length === 0 ? (
          <p className="text-teal-600">No logs yet...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-teal-800">
              {log}
            </div>
          ))
        )}
      </div>

      <RenderCountDisplay count={renderCount} />
    </div>
  );
}

// Stress test for many simultaneous subscriptions
function StressTest() {
  const renderCount = useRenderCounter('StressTest');
  const [results, setResults] = useState<
    {
      operation: string;
      count: number;
      duration: number;
    }[]
  >([]);

  const stressTestBatch = () => {
    const start = performance.now();
    const count = 1000;

    testStore.batch(() => {
      for (let i = 0; i < count; i++) {
        testStore.dispatch.increment();
      }
    });

    const duration = performance.now() - start;
    setResults((prev) => [
      ...prev.slice(-2),
      {
        operation: 'Batched 1000 increments',
        count,
        duration: parseFloat(duration.toFixed(2))
      }
    ]);
  };

  const stressTestSeparate = () => {
    const start = performance.now();
    const count = 100; // Lower count for separate operations

    for (let i = 0; i < count; i++) {
      testStore.dispatch.increment();
    }

    const duration = performance.now() - start;
    setResults((prev) => [
      ...prev.slice(-2),
      {
        operation: 'Separate 100 increments',
        count,
        duration: parseFloat(duration.toFixed(2))
      }
    ]);
  };

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <h4 className="font-semibold text-red-800">Stress Test</h4>
      <p className="mb-2 text-sm text-red-600">
        Performance comparison of batch vs separate operations
      </p>

      <div className="mb-2 flex gap-1">
        <button
          onClick={stressTestBatch}
          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
        >
          Batch 1000 Ops
        </button>
        <button
          onClick={stressTestSeparate}
          className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
        >
          Separate 100 Ops
        </button>
      </div>

      <div className="rounded bg-red-100 p-2 text-xs">
        {results.length === 0 ? (
          <p className="text-red-600">No results yet...</p>
        ) : (
          results.map((result, index) => (
            <div key={index} className="text-red-800">
              {result.operation}: {result.duration}ms ({result.count}{' '}
              operations)
            </div>
          ))
        )}
      </div>

      <RenderCountDisplay count={renderCount} />
    </div>
  );
}

function PerformanceTest() {
  const renderCount = useRenderCounter('PerformanceTest');
  const [results, setResults] = useState<
    {
      operation: string;
      duration: number;
      timestamp: number;
    }[]
  >([]);

  const measureOperation = (name: string, operation: () => void) => {
    const start = performance.now();
    operation();
    const end = performance.now();
    const duration = end - start;

    const result = {
      operation: name,
      duration: parseFloat(duration.toFixed(3)),
      timestamp: Date.now()
    };

    setResults((prev) => [...prev.slice(-4), result]);
    console.log('⏱️ Performance:', result);
  };

  const testOperations = [
    {
      name: 'Single Increment',
      operation: () => testStore.dispatch.increment(),
      icon: '⚡',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'Heavy Operation',
      operation: () => testStore.dispatch.heavyOperation(),
      icon: '🔥',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      name: 'Batched 100x',
      operation: () =>
        testStore.batch(() => {
          for (let i = 0; i < 100; i++) {
            testStore.dispatch.increment();
          }
        }),
      icon: '📦',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'Separate 10x',
      operation: () => {
        for (let i = 0; i < 10; i++) {
          testStore.dispatch.increment();
        }
      },
      icon: '🔄',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Test Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {testOperations.map((test, index) => (
          <button
            key={index}
            onClick={() => measureOperation(test.name, test.operation)}
            className={`${test.color} flex items-center justify-center gap-1 rounded px-3 py-2 text-sm font-medium text-white transition-colors`}
          >
            <span>{test.icon}</span>
            {test.name}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h4 className="mb-3 text-sm font-medium text-red-900">
          ⏱️ Performance Results
        </h4>
        <div className="max-h-32 min-h-[80px] overflow-y-auto rounded-lg bg-red-100 p-3">
          {results.length === 0 ? (
            <p className="py-4 text-center text-sm italic text-red-600">
              No benchmarks yet... Click a test above!
            </p>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex justify-between rounded bg-white px-2 py-1 font-mono text-xs text-red-800"
                >
                  <span>{result.operation}</span>
                  <span className="font-bold">{result.duration}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RenderCountDisplay
        count={renderCount}
        className="text-center text-xs text-red-600"
      />
    </div>
  );
}

export function StoreUITests() {
  const renderCount = useRenderCounter('StoreUITests');
  const [activeTab, setActiveTab] = useState<
    'basic' | 'performance' | 'advanced'
  >('basic');

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          Store Interactive Tests
        </h1>
        <p className="mb-2 text-lg text-gray-600">
          Test store functionality with visual feedback and performance metrics
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600">
            Open console for detailed logs
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => testStore.dispatch.increment()}
            className="flex items-center gap-1 rounded bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <span>+</span>
            Increment
          </button>
          <button
            onClick={() => testStore.dispatch.decrement()}
            className="flex items-center gap-1 rounded bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <span>-</span>
            Decrement
          </button>
          <button
            onClick={() => testStore.dispatch.setName(`Name-${Date.now()}`)}
            className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Change Name
          </button>
          <button
            onClick={() => testStore.dispatch.addItem(`Item-${Date.now()}`)}
            className="rounded bg-purple-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
          >
            Add Item
          </button>
          <button
            onClick={() => testStore.dispatch.toggleTheme()}
            className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
          >
            Toggle Theme
          </button>
          <button
            onClick={() =>
              testStore.dispatch.updateNestedValue(`Val-${Date.now()}`)
            }
            className="rounded bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            Update Nested
          </button>
          <button
            onClick={() => testStore.dispatch.reset()}
            className="rounded bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {[
            { key: 'basic', label: 'Basic Tests', icon: '🔧' },
            { key: 'performance', label: 'Performance', icon: '⚡' },
            { key: 'advanced', label: 'Advanced', icon: '🚀' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(tab.key as 'basic' | 'performance' | 'advanced')
              }
              className={`flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Tests Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Reactivity Comparison */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Reactivity Comparison
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Compare reactive (.use) vs non-reactive (.get) behavior
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ReactiveCounter />
              <NonReactiveCounter />
            </div>
          </div>

          {/* Selectors & State */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Selectors
              </h2>
              <SelectorsTest />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                State Inspector
              </h2>
              <StateInspector />
            </div>
          </div>

          {/* Batching & Events */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Batching
              </h2>
              <BatchingTest />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Events
              </h2>
              <EventsTest />
            </div>
          </div>

          {/* Async Operations */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Async Operations
            </h2>
            <AsyncTest />
          </div>
        </div>
      )}

      {/* Performance Tests Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Performance Benchmarks
              </h2>
              <PerformanceTest />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Stress Testing
              </h2>
              <StressTest />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Re-render Analysis
            </h2>
            <RerenderComparisonTest />
          </div>
        </div>
      )}

      {/* Advanced Tests Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Render Isolation
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              These components should only re-render when their specific state
              changes
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <CounterOnlyComponent />
              <NameOnlyComponent />
              <ItemsOnlyComponent />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Batch vs Separate Comparison
            </h2>
            <BatchComparisonTest />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Subscription Management
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Tests for memory leaks and proper cleanup
            </p>
            <SubscriptionLeakTest />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="py-8 text-center">
        <ComponentRenderCount
          count={renderCount}
          className="text-sm text-gray-500"
        />
      </div>
    </div>
  );
}

// Advanced test components
function CounterOnlyComponent() {
  const renderCount = useRenderCounter('CounterOnly');
  const counter = testStore.use((state) => state.counter);

  return (
    <div className="rounded border border-blue-200 bg-blue-50 p-3">
      <h5 className="font-medium text-blue-800">Counter Only</h5>
      <p className="text-xl font-bold text-blue-900">{counter}</p>
      <RenderCountDisplay count={renderCount} />
    </div>
  );
}

function NameOnlyComponent() {
  const renderCount = useRenderCounter('NameOnly');
  const name = testStore.use((state) => state.name);

  return (
    <div className="rounded border border-green-200 bg-green-50 p-3">
      <h5 className="font-medium text-green-800">Name Only</h5>
      <p className="text-sm font-bold text-green-900">{name}</p>
      <RenderCountDisplay count={renderCount} />
    </div>
  );
}

function ItemsOnlyComponent() {
  const renderCount = useRenderCounter('ItemsOnly');
  const itemsCount = testStore.use((state) => state.items.length);

  return (
    <div className="rounded border border-purple-200 bg-purple-50 p-3">
      <h5 className="font-medium text-purple-800">Items Only</h5>
      <p className="text-xl font-bold text-purple-900">{itemsCount}</p>
      <RenderCountDisplay count={renderCount} />
    </div>
  );
}

function BatchComparisonTest() {
  const renderCount = useRenderCounter('BatchComparison');
  const [results, setResults] = useState<
    {
      type: string;
      rendersBefore: number;
      rendersAfter: number;
    }[]
  >([]);

  const testBatchedUpdate = () => {
    const rendersBefore = renderCount;
    testStore.batch(() => {
      testStore.dispatch.increment();
      testStore.dispatch.setName('Batched');
      testStore.dispatch.addItem('Batched item');
    });

    setTimeout(() => {
      setResults((prev) => [
        ...prev.slice(-4),
        {
          type: 'Batched',
          rendersBefore,
          rendersAfter: renderCount
        }
      ]);
    }, 100);
  };

  const testSeparateUpdates = () => {
    const rendersBefore = renderCount;
    testStore.dispatch.increment();
    testStore.dispatch.setName('Separate');
    testStore.dispatch.addItem('Separate item');

    setTimeout(() => {
      setResults((prev) => [
        ...prev.slice(-4),
        {
          type: 'Separate',
          rendersBefore,
          rendersAfter: renderCount
        }
      ]);
    }, 100);
  };

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <button
          onClick={testBatchedUpdate}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
        >
          Test Batched Updates
        </button>
        <button
          onClick={testSeparateUpdates}
          className="rounded bg-orange-600 px-3 py-1 text-sm text-white hover:bg-orange-700"
        >
          Test Separate Updates
        </button>
      </div>

      <div className="text-sm">
        <ComponentRenderCount count={renderCount} className="mb-1 text-sm" />
        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((result, index) => (
              <p key={index} className="text-xs">
                {result.type}: {result.rendersAfter - result.rendersBefore} new
                renders
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
