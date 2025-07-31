'use client';

import React, { useState } from 'react';

import { createMap } from '../../../../../../packages/store/src/map-2'; // Your map implementation

const defaultStates = {
  title: 'Hello',
  count: 0
};
type States = typeof defaultStates;
type Actions = {
  setTitle: (text: string) => void;
  increment: () => void;
  resetItem: () => void;
};
type Selectors = {
  hasTitle: () => boolean;
  isUsingLetterA: () => boolean;
  title: () => string;
  titleLength: () => number;
};

// Create the map with the concept
const Collection = createMap<States, Actions, Selectors>({
  map: new Map([
    ['demo1', { title: 'Demo Item 1', count: 5 }],
    ['demo2', { title: 'Demo Item 2', count: 10 }]
  ]), // Pre-populate with some demo data
  defaultStates: defaultStates,
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
    resetItem: () => {
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
    name: 'TestMap',
    devtools: true
  }
});

// Test Component for Non-Subscribed Usage
const NonSubscribedTests = () => {
  const [selectedKey, setSelectedKey] = useState('demo1');
  const [results, setResults] = useState<string[]>([]);

  const runTests = () => {
    const testResults: string[] = [];

    // Test Collection.key(selectedKey).get().title
    const entireState = Collection.key(selectedKey).get();
    testResults.push(
      `Collection.key('${selectedKey}').get().title: "${entireState?.title || 'undefined'}"`
    );

    // Test Collection.key(selectedKey).get((s) => s.title)
    const selectorResult = Collection.key(selectedKey).get((s) => s.title);
    testResults.push(
      `Collection.key('${selectedKey}').get((s) => s.title): "${selectorResult || 'undefined'}"`
    );

    // Test Collection.key(selectedKey).get.title()
    const precomputedTitle = Collection.key(selectedKey).get.title();
    testResults.push(
      `Collection.key('${selectedKey}').get.title(): "${precomputedTitle || 'undefined'}"`
    );

    // Test Collection.key(selectedKey).get.hasTitle()
    const cachedHasTitle = Collection.key(selectedKey).get.hasTitle();
    testResults.push(
      `Collection.key('${selectedKey}').get.hasTitle(): ${cachedHasTitle}`
    );

    // Test Collection.key(selectedKey).get.isUsingLetterA()
    const cachedLetterA = Collection.key(selectedKey).get.isUsingLetterA();
    testResults.push(
      `Collection.key('${selectedKey}').get.isUsingLetterA(): ${cachedLetterA}`
    );

    // Test Collection.key(selectedKey).get.titleLength()
    const lengthResult = Collection.key(selectedKey).get.titleLength();
    testResults.push(
      `Collection.key('${selectedKey}').get.titleLength(): ${lengthResult || 'undefined'}`
    );

    setResults(testResults);
  };

  return (
    <div className="rounded-lg bg-blue-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-blue-800">
        Non-Subscribed Tests (Collection.key().get)
      </h2>

      <div className="mb-4 flex gap-2">
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="demo1">demo1</option>
          <option value="demo2">demo2</option>
          <option value="nonexistent">nonexistent</option>
        </select>
        <button
          onClick={runTests}
          className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Run Tests for Key: {selectedKey}
        </button>
      </div>

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

// Test Component for Subscribed Usage
const SubscribedTests = () => {
  const [selectedKey, setSelectedKey] = useState('demo1');

  // Test Collection.key().use() - Subscribe to entire state
  const entireState = Collection.key(selectedKey).use();

  // Test Collection.key().use((s) => s.title) - Subscribe with selector
  const selectedTitle = Collection.key(selectedKey).use((s) => s.title);

  // Test Collection.key().use.title() - Subscribe to pre-computed title
  const precomputedTitle = Collection.key(selectedKey).use.title();

  // Test Collection.key().use.hasTitle() - Subscribe to cached hasTitle
  const cachedHasTitle = Collection.key(selectedKey).use.hasTitle();

  // Test Collection.key().use.isUsingLetterA() - Subscribe to cached isUsingLetterA
  const cachedLetterA = Collection.key(selectedKey).use.isUsingLetterA();

  // Test Collection.key().use.titleLength() - Subscribe to non-cached titleLength
  const titleLength = Collection.key(selectedKey).use.titleLength();

  return (
    <div className="rounded-lg bg-green-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-green-800">
        Subscribed Tests (Collection.key().use)
      </h2>

      <div className="mb-4">
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="demo1">demo1</option>
          <option value="demo2">demo2</option>
          <option value="nonexistent">nonexistent</option>
        </select>
        <span className="ml-2 text-sm text-gray-600">
          Selected Key: {selectedKey}
        </span>
      </div>

      <div className="space-y-3">
        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Collection.key('{selectedKey}').use().title:
          </div>
          <div className="font-mono text-sm">{`"${entireState?.title || 'undefined'}"`}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">{`Collection.key('{selectedKey}').use((s) => s.title):`}</div>
          <div className="font-mono text-sm">{`"${selectedTitle || 'undefined'}"`}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Collection.key('{selectedKey}').use.title():
          </div>
          <div className="font-mono text-sm">{`"${precomputedTitle || 'undefined'}"`}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            {`Collection.key('{selectedKey}').use.hasTitle() (cached)`}:
          </div>
          <div className="font-mono text-sm">{String(cachedHasTitle)}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Collection.key('{selectedKey}').use.isUsingLetterA() (cached):
          </div>
          <div className="font-mono text-sm">{String(cachedLetterA)}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Collection.key('{selectedKey}').use.titleLength() (not cached):
          </div>
          <div className="font-mono text-sm">{titleLength || 'undefined'}</div>
        </div>

        <div className="rounded border bg-white p-3">
          <div className="font-semibold text-green-700">
            Collection.key('{selectedKey}&apos;).use().count:
          </div>
          <div className="font-mono text-sm">
            {entireState?.count || 'undefined'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Test Component for Actions
const ActionsTests = () => {
  const [selectedKey, setSelectedKey] = useState('demo1');
  const [inputValue, setInputValue] = useState('');
  const [newKey, setNewKey] = useState('');

  const handleSetTitle = () => {
    if (inputValue.trim()) {
      Collection.key(selectedKey).dispatch.setTitle(inputValue);
      setInputValue('');
    }
  };

  const handleIncrement = () => {
    Collection.key(selectedKey).dispatch.increment();
  };

  const handleResetItem = () => {
    Collection.key(selectedKey).dispatch.resetItem();
  };

  const handleCreateNew = () => {
    if (newKey.trim()) {
      Collection.key(newKey).set({
        title: `New Item: ${newKey}`,
        count: 0
      });
      setNewKey('');
    }
  };

  const handleRemove = () => {
    Collection.key(selectedKey).remove();
  };

  return (
    <div className="rounded-lg bg-purple-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-purple-800">
        Actions Tests (Collection.key().dispatch)
      </h2>

      <div className="mb-4">
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="demo1">demo1</option>
          <option value="demo2">demo2</option>
          <option value="test1">test1</option>
          <option value="test2">test2</option>
        </select>
        <span className="ml-2 text-sm text-gray-600">
          Acting on Key: {selectedKey}
        </span>
      </div>

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
          onClick={handleResetItem}
          className="rounded bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700"
        >
          Reset Item
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Enter new key..."
            className="flex-1 rounded border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleCreateNew}
            className="rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
          >
            Create New Item
          </button>
        </div>

        <button
          onClick={handleRemove}
          className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          Remove Key: {selectedKey}
        </button>
      </div>
    </div>
  );
};

// Global Map Operations
const GlobalOperationsTests = () => {
  const [results, setResults] = useState<string[]>([]);

  const runGlobalTests = () => {
    const testResults: string[] = [];

    // Test global operations
    const size = Collection.getSize();
    testResults.push(`Collection.getSize(): ${size}`);

    const keys = Collection.getKeys();
    testResults.push(`Collection.getKeys(): [${keys.join(', ')}]`);

    setResults(testResults);
  };

  const handleClear = () => {
    Collection.clear();
  };

  const handleReset = () => {
    Collection.reset();
  };

  const handleBatchOperations = () => {
    Collection.batch(() => {
      Collection.key('batch1').set({ title: 'Batch Item 1', count: 1 });
      Collection.key('batch2').set({ title: 'Batch Item 2', count: 2 });
      Collection.key('batch3').set({ title: 'Batch Item 3', count: 3 });
    });
  };

  return (
    <div className="rounded-lg bg-indigo-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-indigo-800">
        Global Operations Tests
      </h2>

      <div className="space-y-4">
        <button
          onClick={runGlobalTests}
          className="rounded bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
        >
          Run Global Tests
        </button>

        <button
          onClick={handleBatchOperations}
          className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Batch Create 3 Items
        </button>

        <button
          onClick={handleClear}
          className="rounded bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700"
        >
          Clear All Items
        </button>

        <button
          onClick={handleReset}
          className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          Reset to Initial State
        </button>
      </div>

      <div className="mt-4 space-y-2 font-mono text-sm">
        {results.map((result, index) => (
          <div key={index} className="rounded border bg-white p-2">
            {result}
          </div>
        ))}
      </div>
    </div>
  );
};

// Debug Component to show cache behavior
const DebugInfo = () => {
  const [selectedKey, setSelectedKey] = useState('demo1');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const showCacheTest = () => {
    const info: string[] = [];

    info.push(`=== Testing Cache Behavior for Key: ${selectedKey} ===`);
    info.push('1. First call to cached selectors:');

    // First calls - should compute
    Collection.key(selectedKey).get.hasTitle();
    Collection.key(selectedKey).get.isUsingLetterA();

    info.push('2. Second call to cached selectors (should use cache):');

    // Second calls - should use cache
    Collection.key(selectedKey).get.hasTitle();
    Collection.key(selectedKey).get.isUsingLetterA();

    info.push('3. Call to non-cached selector:');

    // Non-cached - should always compute
    Collection.key(selectedKey).get.title();
    Collection.key(selectedKey).get.titleLength();

    info.push('Check console for computation logs!');
    setDebugInfo(info);
  };

  return (
    <div className="rounded-lg bg-yellow-50 p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-yellow-800">
        Cache Debug Info
      </h2>

      <div className="mb-4">
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="demo1">demo1</option>
          <option value="demo2">demo2</option>
        </select>
      </div>

      <button
        onClick={showCacheTest}
        className="mb-4 rounded bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700"
      >
        Test Cache Behavior for {selectedKey}
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
export const Map2Tests = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Map Implementation Test
          </h1>
          <div className="mt-4 space-x-4">
            <a
              href="/benchmark"
              className="inline-block rounded bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
            >
              Store Benchmark →
            </a>
            <a
              href="/map-benchmark"
              className="inline-block rounded bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
            >
              Map Benchmark →
            </a>
            <a
              href="/map-debug"
              className="inline-block rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              Map Debug →
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NonSubscribedTests />
          <SubscribedTests />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActionsTests />
          <GlobalOperationsTests />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DebugInfo />
          <div className="rounded-lg bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Instructions:
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li>
                • <strong>Non-Subscribed Tests:</strong> Click to test
                Collection.key().get() methods - these don&apos;t cause
                re-renders
              </li>
              <li>
                • <strong>Subscribed Tests:</strong> These automatically update
                when state changes using Collection.key().use()
              </li>
              <li>
                • <strong>Actions:</strong> Modify individual map entries and
                watch subscribed components update
              </li>
              <li>
                • <strong>Global Operations:</strong> Test map-wide operations
                like clear, reset, and batch operations
              </li>
              <li>
                • <strong>Cache Debug:</strong> Test cache behavior per key -
                check browser console for computation logs
              </li>
              <li>
                • <strong>DevTools:</strong> Open Redux DevTools to see action
                history and time-travel debug
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
