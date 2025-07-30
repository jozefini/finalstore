'use client';

import React, { useState } from 'react';

import { createStore } from '../../../../../../packages/store/src/store-3'; // Your store implementation

const initialStates = {
  title: 'Hello',
  count: 0
};
type States = typeof initialStates;
type Actions = {
  setTitle: (text: string) => void;
  increment: () => void;
  reset: () => void;
};
type Selectors = {
  hasTitle: () => boolean;
  isUsingLetterA: () => boolean;
  title: () => string;
  titleLength: () => number;
};

// Create the store with the concept
const Store = createStore<States, Actions, Selectors>({
  states: initialStates,
  actions: ({ set, clearCache }) => ({
    setTitle: (text: string) => {
      set((states) => {
        states.title = text;
      });
      clearCache('hasTitle');
      clearCache('isUsingLetterA');
    },
    increment: () => {
      set((states) => {
        states.count++;
      });
    },
    reset: () => {
      set((states) => {
        states.title = 'Hello';
        states.count = 0;
      });
      clearCache(['hasTitle', 'isUsingLetterA']);
    }
  }),
  selectors: ({ get, cache }) => ({
    hasTitle: cache(() => {
      console.log('🔄 Computing hasTitle (cached)');
      return !!get().title;
    }),
    isUsingLetterA: cache(() => {
      console.log('🔄 Computing isUsingLetterA (cached)');
      return get().title.toLowerCase().includes('a');
    }),
    title: () => {
      console.log('🔄 Computing title (not cached)');
      return get().title;
    },
    titleLength: () => {
      console.log('🔄 Computing titleLength (not cached)');
      return get().title.length;
    }
  }),
  config: {
    name: 'TestStore',
    devtools: true
  }
});

// Test Component for Non-Subscribed Usage
const NonSubscribedTests = () => {
  const [results, setResults] = useState<string[]>([]);

  const runTests = () => {
    const testResults: string[] = [];

    // Test Store.get().title
    const entireState = Store.get();
    testResults.push(`Store.get().title: "${entireState.title}"`);

    // Test Store.get((s) => s.title)
    const selectorResult = Store.get((s) => s.title);
    testResults.push(`Store.get((s) => s.title): "${selectorResult}"`);

    // Test Store.get.title()
    const precomputedTitle = Store.get.title();
    testResults.push(`Store.get.title(): "${precomputedTitle}"`);

    // Test Store.get.hasTitle()
    const cachedHasTitle = Store.get.hasTitle();
    testResults.push(`Store.get.hasTitle(): ${cachedHasTitle}`);

    // Test Store.get.isUsingLetterA()
    const cachedLetterA = Store.get.isUsingLetterA();
    testResults.push(`Store.get.isUsingLetterA(): ${cachedLetterA}`);

    // Test Store.get.titleLength()
    const lengthResult = Store.get.titleLength();
    testResults.push(`Store.get.titleLength(): ${lengthResult}`);

    setResults(testResults);
  };

  return (
    <div className="rounded-lg bg-blue-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-blue-800">
        Non-Subscribed Tests (Store.get)
      </h2>
      <button
        onClick={runTests}
        className="mb-4 rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
      >
        Run Non-Subscribed Tests
      </button>
      <div className="space-y-2 font-mono text-sm">
        {results.map((result, index) => (
          <div key={index} className="rounded border bg-white p-2">
            {result}
          </div>
        ))}
      </div>
    </div>
  );
};

const SubscribedToTitle = () => {
  const title = Store.use((s) => s.title);
  return <div>Subscribed to s.title: {title}</div>;
};

// Test Component for Subscribed Usage
const SubscribedTests = () => {
  // Test Store.use().title - Subscribe to entire state
  const entireState = Store.use();

  // Test Store.use((s) => s.title) - Subscribe with selector
  const selectedTitle = Store.use((s) => s.title);

  // Test Store.use.title() - Subscribe to pre-computed title
  const precomputedTitle = Store.use.title();

  // Test Store.use.hasTitle() - Subscribe to cached hasTitle
  const cachedHasTitle = Store.use.hasTitle();

  // Test Store.use.isUsingLetterA() - Subscribe to cached isUsingLetterA
  const cachedLetterA = Store.use.isUsingLetterA();

  // Test Store.use.titleLength() - Subscribe to non-cached titleLength
  const titleLength = Store.use.titleLength();

  return (
    <div className="rounded-lg bg-green-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-green-800">
        Subscribed Tests (Store.use)
      </h2>
      <SubscribedToTitle />
      <SubscribedToTitle />
      <SubscribedToTitle />
      <SubscribedToTitle />
      <SubscribedToTitle />
      <div className="space-y-3">
        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">Store.use().title:</div>
          <div className="font-mono text-sm">{`"${entireState.title}"`}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">{`Store.use((s) => s.title):`}</div>
          <div className="font-mono text-sm">{`"${selectedTitle}"`}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">Store.use.title():</div>
          <div className="font-mono text-sm">{`"${precomputedTitle}"`}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Store.use.hasTitle() (cached):
          </div>
          <div className="font-mono text-sm">{String(cachedHasTitle)}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Store.use.isUsingLetterA() (cached):
          </div>
          <div className="font-mono text-sm">{String(cachedLetterA)}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Store.use.titleLength() (not cached):
          </div>
          <div className="font-mono text-sm">{titleLength}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">Store.use().count:</div>
          <div className="font-mono text-sm">{entireState.count}</div>
        </div>
      </div>
    </div>
  );
};

// Test Component for Actions
const ActionsTests = () => {
  const [inputValue, setInputValue] = useState('');

  const handleSetTitle = () => {
    if (inputValue.trim()) {
      Store.dispatch.setTitle(inputValue);
      setInputValue('');
    }
  };

  const handleIncrement = () => {
    Store.dispatch.increment();
  };

  const handleReset = () => {
    Store.dispatch.reset();
  };

  return (
    <div className="rounded-lg bg-purple-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-purple-800">
        Actions Tests (Store.dispatch)
      </h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter new title..."
            className="flex-1 rounded border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSetTitle}
            className="rounded bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            Set Title
          </button>
        </div>

        <button
          onClick={handleIncrement}
          className="rounded bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          Increment Count
        </button>

        <button
          onClick={handleReset}
          className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          Reset All
        </button>
      </div>
    </div>
  );
};

// Debug Component to show cache behavior
const DebugInfo = () => {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const showCacheTest = () => {
    const info: string[] = [];

    info.push('=== Testing Cache Behavior ===');
    info.push('1. First call to cached selectors:');

    // First calls - should compute
    Store.get.hasTitle();
    Store.get.isUsingLetterA();

    info.push('2. Second call to cached selectors (should use cache):');

    // Second calls - should use cache
    Store.get.hasTitle();
    Store.get.isUsingLetterA();

    info.push('3. Call to non-cached selector:');

    // Non-cached - should always compute
    Store.get.title();
    Store.get.titleLength();

    info.push('Check console for computation logs!');
    setDebugInfo(info);
  };

  return (
    <div className="rounded-lg bg-yellow-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-yellow-800">
        Cache Debug Info
      </h2>
      <button
        onClick={showCacheTest}
        className="mb-4 rounded bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700"
      >
        Test Cache Behavior
      </button>
      <div className="space-y-1 font-mono text-sm">
        {debugInfo.map((info, index) => (
          <div key={index} className="rounded border bg-white p-2">
            {info}
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Test Component
export const Store2Tests = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Store Implementation Test
          </h1>
          <div className="mt-4">
            <a
              href="/benchmark"
              className="inline-block rounded bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
            >
              Go to Performance Benchmark →
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NonSubscribedTests />
          <SubscribedTests />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActionsTests />
          <DebugInfo />
        </div>

        <div className="mt-8 rounded-lg bg-gray-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">
            Instructions:
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li>
              • <strong>Non-Subscribed Tests:</strong> Click to test Store.get()
              methods - these don&apos;t cause re-renders
            </li>
            <li>
              • <strong>Subscribed Tests:</strong> These automatically update
              when state changes using Store.use()
            </li>
            <li>
              • <strong>Actions:</strong> Modify the store state and watch
              subscribed components update
            </li>
            <li>
              • <strong>Cache Debug:</strong> Test cache behavior - check
              browser console for computation logs
            </li>
            <li>
              • <strong>DevTools:</strong> Open Redux DevTools to see action
              history
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
