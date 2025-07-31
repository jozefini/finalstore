'use client';

import React, { useCallback, useState } from 'react';

import { createMap } from '../../../../../../packages/store/src/map-2';

// Create a more complex map for benchmarking
const initialState = {
  id: '',
  name: '',
  email: '',
  active: true,
  score: 0,
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [] as string[]
  }
};

type BenchmarkState = typeof initialState;

type BenchmarkActions = {
  updateName: (name: string) => void;
  updateEmail: (email: string) => void;
  toggleActive: () => void;
  incrementScore: (amount?: number) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  updateMetadata: (metadata: Partial<BenchmarkState['metadata']>) => void;
  reset: () => void;
};

type BenchmarkSelectors = {
  isActive: () => boolean;
  hasHighScore: () => boolean;
  displayName: () => string;
  tagCount: () => number;
  isRecent: () => boolean;
  searchableText: () => string;
  scoreLevel: () => 'low' | 'medium' | 'high';
  complexComputation: () => number;
};

const BenchmarkMap = createMap<
  BenchmarkState,
  BenchmarkActions,
  BenchmarkSelectors
>({
  defaultStates: initialState,
  actions: ({ set, clearCache }) => ({
    updateName: (name: string) => {
      set((state) => {
        state.name = name;
        state.metadata.updatedAt = Date.now();
      });
      clearCache(['displayName', 'searchableText']);
    },
    updateEmail: (email: string) => {
      set((state) => {
        state.email = email;
        state.metadata.updatedAt = Date.now();
      });
      clearCache('searchableText');
    },
    toggleActive: () => {
      set((state) => {
        state.active = !state.active;
        state.metadata.updatedAt = Date.now();
      });
      clearCache('isActive');
    },
    incrementScore: (amount = 1) => {
      set((state) => {
        state.score += amount;
        state.metadata.updatedAt = Date.now();
      });
      clearCache(['hasHighScore', 'scoreLevel']);
    },
    addTag: (tag: string) => {
      set((state) => {
        if (!state.metadata.tags.includes(tag)) {
          state.metadata.tags.push(tag);
          state.metadata.updatedAt = Date.now();
        }
      });
      clearCache(['tagCount', 'searchableText']);
    },
    removeTag: (tag: string) => {
      set((state) => {
        const index = state.metadata.tags.indexOf(tag);
        if (index > -1) {
          state.metadata.tags.splice(index, 1);
          state.metadata.updatedAt = Date.now();
        }
      });
      clearCache(['tagCount', 'searchableText']);
    },
    updateMetadata: (metadata: Partial<BenchmarkState['metadata']>) => {
      set((state) => {
        Object.assign(state.metadata, metadata);
        state.metadata.updatedAt = Date.now();
      });
      clearCache(['isRecent', 'searchableText']);
    },
    reset: () => {
      set((state) => {
        Object.assign(state, {
          ...initialState,
          metadata: {
            ...initialState.metadata,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        });
      });
      clearCache([
        'isActive',
        'hasHighScore',
        'displayName',
        'tagCount',
        'isRecent',
        'searchableText',
        'scoreLevel'
      ]);
    }
  }),
  selectors: ({ get, cache }) => ({
    // Cached selectors - expensive computations
    isActive: cache(() => {
      console.log('🔄 Computing isActive (cached)');
      return get().active;
    }),
    hasHighScore: cache(() => {
      console.log('🔄 Computing hasHighScore (cached)');
      return get().score > 100;
    }),
    displayName: cache(() => {
      console.log('🔄 Computing displayName (cached)');
      const state = get();
      return state.name || state.email || `User-${state.id}`;
    }),
    tagCount: cache(() => {
      console.log('🔄 Computing tagCount (cached)');
      return get().metadata.tags.length;
    }),
    isRecent: cache(() => {
      console.log('🔄 Computing isRecent (cached)');
      const state = get();
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return state.metadata.updatedAt > dayAgo;
    }),
    searchableText: cache(() => {
      console.log('🔄 Computing searchableText (cached)');
      const state = get();
      return `${state.name} ${state.email} ${state.metadata.tags.join(' ')}`.toLowerCase();
    }),
    scoreLevel: cache(() => {
      console.log('🔄 Computing scoreLevel (cached)');
      const score = get().score;
      if (score > 200) return 'high';
      if (score > 50) return 'medium';
      return 'low';
    }),
    complexComputation: cache(() => {
      console.log('🔄 Computing complexComputation (cached)');
      const state = get();
      // Simulate expensive computation
      let result = 0;
      for (let i = 0; i < 1000; i++) {
        result +=
          Math.sin(i) * state.score + Math.cos(i) * state.metadata.tags.length;
      }
      return result;
    })
  }),
  config: {
    name: 'BenchmarkMap',
    devtools: true,
    cacheSize: 5000
  }
});

// Benchmark results type
type BenchmarkResult = {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memoryUsed?: number;
  keysCreated?: number;
};

const Map2Benchmark = () => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  // Subscribe to some data for reactivity testing
  const mapSize = BenchmarkMap.useSize();
  const mapKeys = BenchmarkMap.useKeys();

  // Subscribe to a few sample keys for reactivity testing
  const sampleKey1 = BenchmarkMap.key('sample1').use();
  const sampleKey2 = BenchmarkMap.key('sample2').use();

  // Debug: Log the map state
  console.log('Map size:', mapSize);
  console.log('Map keys:', mapKeys);
  console.log('Sample key 1:', sampleKey1);
  console.log('Sample key 2:', sampleKey2);

  const runBenchmark = useCallback(
    async (
      name: string,
      operations: number,
      testFn: () => void | Promise<void>
    ): Promise<BenchmarkResult> => {
      setCurrentTest(name);

      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }

      const startMemory = (performance as unknown).memory?.usedJSHeapSize;
      const startTime = performance.now();
      const startSize = BenchmarkMap.getSize();

      await testFn();

      const endTime = performance.now();
      const endMemory = (performance as unknown).memory?.usedJSHeapSize;
      const endSize = BenchmarkMap.getSize();
      const duration = endTime - startTime;

      return {
        name,
        duration,
        operations,
        opsPerSecond: operations / (duration / 1000),
        memoryUsed:
          endMemory && startMemory ? endMemory - startMemory : undefined,
        keysCreated: endSize - startSize
      };
    },
    []
  );

  const runAllBenchmarks = useCallback(async () => {
    setIsRunning(true);
    setResults([]);

    const benchmarkResults: BenchmarkResult[] = [];

    try {
      // Clear map first
      BenchmarkMap.clear();

      // 1. Single key operations benchmark
      const singleOpsResult = await runBenchmark(
        'Single Key Operations (1000 keys)',
        1000,
        () => {
          for (let i = 0; i < 1000; i++) {
            BenchmarkMap.key(`user${i}`).set({
              ...initialState,
              id: `user${i}`,
              name: `User ${i}`,
              email: `user${i}@test.com`,
              score: Math.floor(Math.random() * 300),
              metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: [`tag${i % 10}`, `category${i % 5}`]
              }
            });
          }
        }
      );
      benchmarkResults.push(singleOpsResult);

      // 2. Batch operations benchmark
      BenchmarkMap.clear();
      const batchOpsResult = await runBenchmark(
        'Batch Operations (1000 keys)',
        1000,
        () => {
          BenchmarkMap.batch(() => {
            for (let i = 0; i < 1000; i++) {
              BenchmarkMap.key(`user${i}`).set({
                ...initialState,
                id: `user${i}`,
                name: `User ${i}`,
                email: `user${i}@test.com`,
                score: Math.floor(Math.random() * 300),
                metadata: {
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  tags: [`tag${i % 10}`, `category${i % 5}`]
                }
              });
            }
          });
        }
      );
      benchmarkResults.push(batchOpsResult);

      // 3. Action dispatch benchmark
      const actionResult = await runBenchmark(
        'Action Dispatches (500 actions)',
        500,
        () => {
          for (let i = 0; i < 100; i++) {
            const key = `user${i}`;
            BenchmarkMap.key(key).dispatch.updateName(`Updated User ${i}`);
            BenchmarkMap.key(key).dispatch.incrementScore(5);
            BenchmarkMap.key(key).dispatch.addTag(`newtag${i}`);
            BenchmarkMap.key(key).dispatch.toggleActive();
            BenchmarkMap.key(key).dispatch.updateEmail(`updated${i}@test.com`);
          }
        }
      );
      benchmarkResults.push(actionResult);

      // 4. Selector computation benchmark
      const selectorResult = await runBenchmark(
        'Selector Computations (1000 calls)',
        1000,
        () => {
          for (let i = 0; i < 100; i++) {
            const key = `user${i}`;
            // Mix of cached and non-cached selectors
            BenchmarkMap.key(key).get.isActive();
            BenchmarkMap.key(key).get.hasHighScore();
            BenchmarkMap.key(key).get.displayName();
            BenchmarkMap.key(key).get.tagCount();
            BenchmarkMap.key(key).get.isRecent();
            BenchmarkMap.key(key).get.searchableText();
            BenchmarkMap.key(key).get.scoreLevel();
            BenchmarkMap.key(key).get.complexComputation();
            // Call twice to test caching
            BenchmarkMap.key(key).get.complexComputation();
            BenchmarkMap.key(key).get.searchableText();
          }
        }
      );
      benchmarkResults.push(selectorResult);

      // 5. Mixed operations benchmark
      const mixedOpsResult = await runBenchmark(
        'Mixed Operations (2000 ops)',
        2000,
        () => {
          for (let i = 0; i < 200; i++) {
            const key = `mixed${i}`;
            // Create
            BenchmarkMap.key(key).set({
              ...initialState,
              id: key,
              name: `Mixed User ${i}`,
              email: `mixed${i}@test.com`,
              score: i
            });
            // Update
            BenchmarkMap.key(key).dispatch.incrementScore(10);
            BenchmarkMap.key(key).dispatch.addTag(`tag${i}`);
            // Read
            BenchmarkMap.key(key).get.displayName();
            BenchmarkMap.key(key).get.hasHighScore();
            // Update again
            BenchmarkMap.key(key).dispatch.updateName(`Updated ${i}`);
            // Read cached
            BenchmarkMap.key(key).get.searchableText();
            BenchmarkMap.key(key).get.complexComputation();
            // Remove some
            if (i % 10 === 0) {
              BenchmarkMap.key(key).remove();
            }
          }
        }
      );
      benchmarkResults.push(mixedOpsResult);

      // 6. Rapid key creation/removal
      const rapidOpsResult = await runBenchmark(
        'Rapid Key Creation/Removal (1000 ops)',
        1000,
        () => {
          for (let i = 0; i < 500; i++) {
            const key = `rapid${i}`;
            // Create
            BenchmarkMap.key(key).set({
              ...initialState,
              id: key,
              name: `Rapid ${i}`,
              score: i
            });
            // Remove
            BenchmarkMap.key(key).remove();
          }
        }
      );
      benchmarkResults.push(rapidOpsResult);

      // 7. Large dataset operations
      BenchmarkMap.clear();
      // Create a large dataset first
      BenchmarkMap.batch(() => {
        for (let i = 0; i < 2000; i++) {
          BenchmarkMap.key(`large${i}`).set({
            ...initialState,
            id: `large${i}`,
            name: `Large User ${i}`,
            email: `large${i}@test.com`,
            score: Math.floor(Math.random() * 500),
            metadata: {
              createdAt: Date.now() - Math.random() * 86400000,
              updatedAt: Date.now(),
              tags: Array.from(
                { length: Math.floor(Math.random() * 5) + 1 },
                (_, j) => `tag${j}`
              )
            }
          });
        }
      });

      const largeDatasetResult = await runBenchmark(
        'Large Dataset Selectors (500 calls)',
        500,
        () => {
          for (let i = 0; i < 100; i++) {
            const key = `large${Math.floor(Math.random() * 2000)}`;
            BenchmarkMap.key(key).get.isActive();
            BenchmarkMap.key(key).get.displayName();
            BenchmarkMap.key(key).get.searchableText();
            BenchmarkMap.key(key).get.complexComputation();
            BenchmarkMap.key(key).get.scoreLevel();
          }
        }
      );
      benchmarkResults.push(largeDatasetResult);

      setResults(benchmarkResults);
    } catch (error) {
      console.error('Benchmark error:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [runBenchmark]);

  const formatNumber = (num: number) => {
    if (num > 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num > 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatMemory = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Map Performance Benchmark
        </h1>

        {/* Current State Display */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{mapSize}</div>
            <div className="text-sm text-blue-500">Total Keys</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {mapKeys.length}
            </div>
            <div className="text-sm text-green-500">Active Keys</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {sampleKey1?.name || 'N/A'}
            </div>
            <div className="text-sm text-purple-500">Sample Key 1</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {sampleKey2?.score || 0}
            </div>
            <div className="text-sm text-orange-500">Sample Key 2 Score</div>
          </div>
        </div>

        {/* Benchmark Controls */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Map Benchmark Suite
              </h2>
              {currentTest && (
                <p className="text-sm text-gray-600">Running: {currentTest}</p>
              )}
            </div>
            <button
              onClick={runAllBenchmarks}
              disabled={isRunning}
              className={`rounded px-6 py-2 text-white transition-colors ${
                isRunning
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRunning ? 'Running...' : 'Run Map Benchmarks'}
            </button>
          </div>
        </div>

        {/* Benchmark Results */}
        {results.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-bold text-gray-800">Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2 text-left">Test</th>
                    <th className="px-4 py-2 text-right">Duration (ms)</th>
                    <th className="px-4 py-2 text-right">Operations</th>
                    <th className="px-4 py-2 text-right">Ops/Second</th>
                    <th className="px-4 py-2 text-right">Keys Created</th>
                    <th className="px-4 py-2 text-right">Memory</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{result.name}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {result.duration.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatNumber(result.operations)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatNumber(result.opsPerSecond)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {result.keysCreated || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatMemory(result.memoryUsed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manual Test Controls */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 font-bold text-gray-800">Quick Tests</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  console.log('Creating 100 keys...');
                  BenchmarkMap.batch(() => {
                    for (let i = 0; i < 100; i++) {
                      BenchmarkMap.key(`quick${i}`).set({
                        ...initialState,
                        id: `quick${i}`,
                        name: `Quick ${i}`,
                        score: i
                      });
                    }
                  });
                  console.log(
                    'Done creating keys. New size:',
                    BenchmarkMap.getSize()
                  );
                }}
                className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Create 100 Keys (Batched)
              </button>
              <button
                onClick={() => {
                  console.log('Testing single key creation...');
                  BenchmarkMap.key('test-key').set({
                    ...initialState,
                    id: 'test-key',
                    name: 'Test Key',
                    score: 42
                  });
                  console.log(
                    'Created test key. Size:',
                    BenchmarkMap.getSize()
                  );
                  console.log('Keys:', BenchmarkMap.getKeys());
                }}
                className="w-full rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                Test Single Key Creation
              </button>
              <button
                onClick={() => {
                  for (let i = 0; i < 50; i++) {
                    BenchmarkMap.key(`individual${i}`).set({
                      ...initialState,
                      id: `individual${i}`,
                      name: `Individual ${i}`,
                      score: i
                    });
                  }
                }}
                className="w-full rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                Create 50 Keys (Individual)
              </button>
              <button
                onClick={() => BenchmarkMap.clear()}
                className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
              >
                Clear All Keys
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 font-bold text-gray-800">Selector Testing</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  console.time('Cached Selectors');
                  for (let i = 0; i < 50; i++) {
                    const key = `user${i}`;
                    BenchmarkMap.key(key).get.hasHighScore();
                    BenchmarkMap.key(key).get.displayName();
                    BenchmarkMap.key(key).get.complexComputation();
                  }
                  console.timeEnd('Cached Selectors');
                }}
                className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
              >
                Test Cached Selectors
              </button>
              <button
                onClick={() => {
                  console.time('Mixed Selectors');
                  for (let i = 0; i < 50; i++) {
                    const key = `user${i}`;
                    BenchmarkMap.key(key).get.isActive();
                    BenchmarkMap.key(key).get.searchableText();
                    BenchmarkMap.key(key).get.scoreLevel();
                  }
                  console.timeEnd('Mixed Selectors');
                }}
                className="w-full rounded bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
              >
                Test Mixed Selectors
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 font-bold text-gray-800">Stress Testing</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  console.time('Rapid Operations');
                  for (let i = 0; i < 1000; i++) {
                    const key = `stress${i}`;
                    BenchmarkMap.key(key).set({
                      ...initialState,
                      id: key,
                      name: `Stress ${i}`,
                      score: i
                    });
                    BenchmarkMap.key(key).dispatch.incrementScore(5);
                    BenchmarkMap.key(key).get.hasHighScore();
                    if (i % 2 === 0) {
                      BenchmarkMap.key(key).remove();
                    }
                  }
                  console.timeEnd('Rapid Operations');
                }}
                className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
              >
                Stress Test (1000 ops)
              </button>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-6">
          <h3 className="mb-3 text-lg font-bold text-yellow-800">
            Map Performance Tips
          </h3>
          <ul className="space-y-2 text-sm text-yellow-700">
            <li>
              • Use <code className="rounded bg-yellow-100 px-1">batch()</code>{' '}
              for multiple key operations
            </li>
            <li>
              • Cache expensive selectors with{' '}
              <code className="rounded bg-yellow-100 px-1">cache()</code>
            </li>
            <li>
              • Clear cache strategically in actions that affect cached
              selectors
            </li>
            <li>
              • Use key-specific operations instead of iterating over all keys
            </li>
            <li>• Monitor memory usage when creating many keys</li>
            <li>• Use structural sharing for efficient updates</li>
            <li>
              • Open browser DevTools → Console to see selector computation logs
            </li>
            <li>
              • <strong>Debug Mode:</strong> Run{' '}
              <code className="rounded bg-yellow-100 px-1">
                window.__STORE_DEBUG__ = true
              </code>{' '}
              for detailed logs
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Map2Benchmark;
