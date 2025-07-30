'use client';

import React, { useCallback, useState } from 'react';

import { createStore } from '../../../../../../packages/store/src/store-3';

// Create a more complex store for benchmarking
const initialState = {
  users: [] as Array<{
    id: number;
    name: string;
    email: string;
    active: boolean;
  }>,
  posts: [] as Array<{
    id: number;
    userId: number;
    title: string;
    content: string;
    likes: number;
  }>,
  comments: [] as Array<{
    id: number;
    postId: number;
    userId: number;
    text: string;
  }>,
  settings: {
    theme: 'light' as 'light' | 'dark',
    notifications: true,
    language: 'en'
  },
  counters: {
    totalClicks: 0,
    totalUpdates: 0,
    lastUpdate: Date.now()
  }
};

type BenchmarkState = typeof initialState;

type BenchmarkActions = {
  addUser: (user: Omit<BenchmarkState['users'][0], 'id'>) => void;
  addPost: (post: Omit<BenchmarkState['posts'][0], 'id'>) => void;
  addComment: (comment: Omit<BenchmarkState['comments'][0], 'id'>) => void;
  updateUserStatus: (userId: number, active: boolean) => void;
  likePost: (postId: number) => void;
  incrementCounter: () => void;
  bulkAddUsers: (count: number) => void;
  bulkAddPosts: (count: number) => void;
  clearAll: () => void;
  updateSettings: (settings: Partial<BenchmarkState['settings']>) => void;
};

type BenchmarkSelectors = {
  activeUsers: () => BenchmarkState['users'];
  totalUsers: () => number;
  totalPosts: () => number;
  totalComments: () => number;
  postsWithComments: () => Array<
    BenchmarkState['posts'][0] & { commentCount: number }
  >;
  userPostCounts: () => Array<{ userId: number; postCount: number }>;
  averageLikes: () => number;
  recentPosts: () => BenchmarkState['posts'];
  topUsers: () => BenchmarkState['users'];
  complexComputation: () => number;
};

const BenchmarkStore = createStore<
  BenchmarkState,
  BenchmarkActions,
  BenchmarkSelectors
>({
  states: initialState,
  actions: ({ set, clearCache }) => ({
    addUser: (user) => {
      set((state) => {
        const id = state.users.length + 1;
        state.users.push({ ...user, id });
        state.counters.totalUpdates++;
        state.counters.lastUpdate = Date.now();
      });
      clearCache(['activeUsers', 'totalUsers', 'topUsers']);
    },

    addPost: (post) => {
      set((state) => {
        const id = state.posts.length + 1;
        state.posts.push({ ...post, id });
        state.counters.totalUpdates++;
        state.counters.lastUpdate = Date.now();
      });
      clearCache([
        'totalPosts',
        'postsWithComments',
        'userPostCounts',
        'averageLikes',
        'recentPosts'
      ]);
    },

    addComment: (comment) => {
      set((state) => {
        const id = state.comments.length + 1;
        state.comments.push({ ...comment, id });
        state.counters.totalUpdates++;
        state.counters.lastUpdate = Date.now();
      });
      clearCache(['totalComments', 'postsWithComments']);
    },

    updateUserStatus: (userId, active) => {
      set((state) => {
        const user = state.users.find((u) => u.id === userId);
        if (user) {
          user.active = active;
          state.counters.totalUpdates++;
          state.counters.lastUpdate = Date.now();
        }
      });
      clearCache(['activeUsers', 'topUsers']);
    },

    likePost: (postId) => {
      set((state) => {
        const post = state.posts.find((p) => p.id === postId);
        if (post) {
          post.likes++;
          state.counters.totalUpdates++;
          state.counters.lastUpdate = Date.now();
        }
      });
      clearCache(['averageLikes', 'recentPosts']);
    },

    incrementCounter: () => {
      set((state) => {
        state.counters.totalClicks++;
        state.counters.lastUpdate = Date.now();
      });
    },

    bulkAddUsers: (count) => {
      set((state) => {
        for (let i = 0; i < count; i++) {
          const id = state.users.length + 1;
          state.users.push({
            id,
            name: `User ${id}`,
            email: `user${id}@example.com`,
            active: Math.random() > 0.3
          });
        }
        state.counters.totalUpdates += count;
        state.counters.lastUpdate = Date.now();
      });
      clearCache(['activeUsers', 'totalUsers', 'topUsers']);
    },

    bulkAddPosts: (count) => {
      set((state) => {
        for (let i = 0; i < count; i++) {
          const id = state.posts.length + 1;
          const userId =
            Math.floor(Math.random() * Math.max(1, state.users.length)) + 1;
          state.posts.push({
            id,
            userId,
            title: `Post ${id}`,
            content: `Content for post ${id}`,
            likes: Math.floor(Math.random() * 100)
          });
        }
        state.counters.totalUpdates += count;
        state.counters.lastUpdate = Date.now();
      });
      clearCache([
        'totalPosts',
        'postsWithComments',
        'userPostCounts',
        'averageLikes',
        'recentPosts'
      ]);
    },

    clearAll: () => {
      set((state) => {
        state.users = [];
        state.posts = [];
        state.comments = [];
        state.counters.totalUpdates++;
        state.counters.lastUpdate = Date.now();
      });
      clearCache([
        'activeUsers',
        'totalUsers',
        'totalPosts',
        'totalComments',
        'postsWithComments',
        'userPostCounts',
        'averageLikes',
        'recentPosts',
        'topUsers'
      ]);
    },

    updateSettings: (settings) => {
      set((state) => {
        Object.assign(state.settings, settings);
        state.counters.totalUpdates++;
        state.counters.lastUpdate = Date.now();
      });
    }
  }),

  selectors: ({ get, cache }) => ({
    // Cached selectors - expensive computations
    activeUsers: cache(() => {
      console.log('🔄 Computing activeUsers (cached)');
      return get().users.filter((user) => user.active);
    }),

    totalUsers: cache(() => {
      console.log('🔄 Computing totalUsers (cached)');
      return get().users.length;
    }),

    totalPosts: cache(() => {
      console.log('🔄 Computing totalPosts (cached)');
      return get().posts.length;
    }),

    totalComments: cache(() => {
      console.log('🔄 Computing totalComments (cached)');
      return get().comments.length;
    }),

    postsWithComments: cache(() => {
      console.log('🔄 Computing postsWithComments (cached)');
      const state = get();
      return state.posts.map((post) => ({
        ...post,
        commentCount: state.comments.filter((c) => c.postId === post.id).length
      }));
    }),

    userPostCounts: cache(() => {
      console.log('🔄 Computing userPostCounts (cached)');
      const state = get();
      const counts = new Map<number, number>();
      state.posts.forEach((post) => {
        counts.set(post.userId, (counts.get(post.userId) || 0) + 1);
      });
      return Array.from(counts.entries()).map(([userId, postCount]) => ({
        userId,
        postCount
      }));
    }),

    averageLikes: cache(() => {
      console.log('🔄 Computing averageLikes (cached)');
      const posts = get().posts;
      if (posts.length === 0) return 0;
      return posts.reduce((sum, post) => sum + post.likes, 0) / posts.length;
    }),

    recentPosts: cache(() => {
      console.log('🔄 Computing recentPosts (cached)');
      return get().posts.slice(-10);
    }),

    topUsers: cache(() => {
      console.log('🔄 Computing topUsers (cached)');
      const state = get();
      const userPostCounts = new Map<number, number>();
      state.posts.forEach((post) => {
        userPostCounts.set(
          post.userId,
          (userPostCounts.get(post.userId) || 0) + 1
        );
      });

      return state.users
        .map((user) => ({
          ...user,
          postCount: userPostCounts.get(user.id) || 0
        }))
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 5);
    }),

    complexComputation: cache(() => {
      console.log('🔄 Computing complexComputation (cached)');
      const state = get();
      // Simulate expensive computation
      let result = 0;
      for (let i = 0; i < 10000; i++) {
        result +=
          Math.sin(i) * state.users.length + Math.cos(i) * state.posts.length;
      }
      return result;
    })
  }),

  config: {
    name: 'BenchmarkStore',
    devtools: true,
    cacheSize: 2000
  }
});

// Benchmark results type
type BenchmarkResult = {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memoryUsed?: number;
};

const StoreBenchmark = () => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  // Subscribe to some data for reactivity testing
  const totalUsers = BenchmarkStore.use.totalUsers();
  const totalPosts = BenchmarkStore.use.totalPosts();
  const activeUsers = BenchmarkStore.use.activeUsers();
  const counters = BenchmarkStore.use((s) => s.counters);

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

      const startMemory = (performance as any).memory?.usedJSHeapSize;
      const startTime = performance.now();

      await testFn();

      const endTime = performance.now();
      const endMemory = (performance as unknown).memory?.usedJSHeapSize;
      const duration = endTime - startTime;

      return {
        name,
        duration,
        operations,
        opsPerSecond: operations / (duration / 1000),
        memoryUsed:
          endMemory && startMemory ? endMemory - startMemory : undefined
      };
    },
    []
  );

  const runAllBenchmarks = useCallback(async () => {
    setIsRunning(true);
    setResults([]);

    const benchmarkResults: BenchmarkResult[] = [];

    try {
      // Clear store first
      BenchmarkStore.dispatch.clearAll();

      // 1. Single operations benchmark
      const singleOpsResult = await runBenchmark(
        'Single Operations (1000 users)',
        1000,
        () => {
          for (let i = 0; i < 1000; i++) {
            BenchmarkStore.dispatch.addUser({
              name: `User ${i}`,
              email: `user${i}@test.com`,
              active: i % 3 !== 0
            });
          }
        }
      );
      benchmarkResults.push(singleOpsResult);

      // 2. Bulk operations benchmark
      BenchmarkStore.dispatch.clearAll();
      const bulkOpsResult = await runBenchmark(
        'Bulk Operations (1000 users)',
        1000,
        () => {
          BenchmarkStore.dispatch.bulkAddUsers(1000);
        }
      );
      benchmarkResults.push(bulkOpsResult);

      // 3. Batched operations benchmark
      BenchmarkStore.dispatch.clearAll();
      const batchedOpsResult = await runBenchmark(
        'Batched Operations (1000 users)',
        1000,
        () => {
          BenchmarkStore.batch(() => {
            for (let i = 0; i < 1000; i++) {
              BenchmarkStore.dispatch.addUser({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                active: i % 3 !== 0
              });
            }
          });
        }
      );
      benchmarkResults.push(batchedOpsResult);

      // 4. Selector computation benchmark
      BenchmarkStore.dispatch.bulkAddUsers(500);
      BenchmarkStore.dispatch.bulkAddPosts(1000);

      const selectorResult = await runBenchmark(
        'Selector Computations (100 calls)',
        100,
        () => {
          for (let i = 0; i < 100; i++) {
            BenchmarkStore.get.activeUsers();
            BenchmarkStore.get.postsWithComments();
            BenchmarkStore.get.userPostCounts();
            BenchmarkStore.get.averageLikes();
            BenchmarkStore.get.complexComputation();
          }
        }
      );
      benchmarkResults.push(selectorResult);

      // 5. Mixed operations benchmark
      BenchmarkStore.dispatch.clearAll();
      const mixedOpsResult = await runBenchmark(
        'Mixed Operations (500 ops)',
        500,
        () => {
          for (let i = 0; i < 100; i++) {
            BenchmarkStore.dispatch.addUser({
              name: `User ${i}`,
              email: `user${i}@test.com`,
              active: true
            });
            BenchmarkStore.dispatch.addPost({
              userId: i + 1,
              title: `Post ${i}`,
              content: `Content ${i}`,
              likes: 0
            });
            BenchmarkStore.dispatch.likePost(i + 1);
            BenchmarkStore.dispatch.incrementCounter();
            BenchmarkStore.dispatch.incrementCounter();
          }
        }
      );
      benchmarkResults.push(mixedOpsResult);

      // 6. Rapid state changes benchmark
      const rapidChangesResult = await runBenchmark(
        'Rapid State Changes (1000 ops)',
        1000,
        () => {
          for (let i = 0; i < 1000; i++) {
            BenchmarkStore.dispatch.incrementCounter();
          }
        }
      );
      benchmarkResults.push(rapidChangesResult);

      // 7. Large dataset operations
      BenchmarkStore.dispatch.clearAll();
      BenchmarkStore.dispatch.bulkAddUsers(1000);
      BenchmarkStore.dispatch.bulkAddPosts(2000);

      const largeDatasetResult = await runBenchmark(
        'Large Dataset Selectors (50 calls)',
        50,
        () => {
          for (let i = 0; i < 50; i++) {
            BenchmarkStore.get.activeUsers();
            BenchmarkStore.get.postsWithComments();
            BenchmarkStore.get.topUsers();
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
          Store Performance Benchmark
        </h1>

        {/* Current State Display */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
            <div className="text-sm text-blue-500">Total Users</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {totalPosts}
            </div>
            <div className="text-sm text-green-500">Total Posts</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {activeUsers.length}
            </div>
            <div className="text-sm text-purple-500">Active Users</div>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {counters.totalClicks}
            </div>
            <div className="text-sm text-orange-500">Total Clicks</div>
          </div>
        </div>

        {/* Benchmark Controls */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Benchmark Suite
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
              {isRunning ? 'Running...' : 'Run Benchmarks'}
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
            <h3 className="mb-3 font-bold text-gray-800">Data Generation</h3>
            <div className="space-y-2">
              <button
                onClick={() => BenchmarkStore.dispatch.bulkAddUsers(100)}
                className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Add 100 Users
              </button>
              <button
                onClick={() => BenchmarkStore.dispatch.bulkAddPosts(200)}
                className="w-full rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
              >
                Add 200 Posts
              </button>
              <button
                onClick={() => BenchmarkStore.dispatch.clearAll()}
                className="w-full rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
              >
                Clear All Data
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 font-bold text-gray-800">Batch Testing</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  BenchmarkStore.batch(() => {
                    for (let i = 0; i < 50; i++) {
                      BenchmarkStore.dispatch.incrementCounter();
                    }
                  });
                }}
                className="w-full rounded bg-purple-600 px-3 py-2 text-sm text-white hover:bg-purple-700"
              >
                Batched: 50 Increments
              </button>
              <button
                onClick={() => {
                  for (let i = 0; i < 50; i++) {
                    BenchmarkStore.dispatch.incrementCounter();
                  }
                }}
                className="w-full rounded bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700"
              >
                Unbatched: 50 Increments
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 font-bold text-gray-800">Selector Testing</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  console.time('Selector calls');
                  for (let i = 0; i < 10; i++) {
                    BenchmarkStore.get.activeUsers();
                    BenchmarkStore.get.postsWithComments();
                    BenchmarkStore.get.complexComputation();
                  }
                  console.timeEnd('Selector calls');
                }}
                className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
              >
                Test Cached Selectors
              </button>
              <button
                onClick={() => {
                  (window as any).__STORE_DEBUG__ = !(window as any)
                    .__STORE_DEBUG__;
                  const isEnabled = (window as unknown).__STORE_DEBUG__;
                  console.log(
                    `🔧 Store Debug Mode: ${isEnabled ? 'ENABLED' : 'DISABLED'}`
                  );
                  alert(
                    `Store Debug Mode: ${isEnabled ? 'ENABLED' : 'DISABLED'}\nCheck console for cache clearing logs during DevTools time-travel.`
                  );
                }}
                className="w-full rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700"
              >
                Toggle Debug Mode
              </button>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-6">
          <h3 className="mb-3 text-lg font-bold text-yellow-800">
            Performance Tips
          </h3>
          <ul className="space-y-2 text-sm text-yellow-700">
            <li>
              • Use <code className="rounded bg-yellow-100 px-1">batch()</code>{' '}
              for multiple related updates
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
              • Use bulk operations when possible instead of individual updates
            </li>
            <li>• Monitor memory usage for large datasets</li>
            <li>
              • Open browser DevTools → Console to see selector computation logs
            </li>
            <li>
              • <strong>Redux DevTools:</strong> Install the Redux DevTools
              Extension to see action history, time-travel debug, and inspect
              state changes
            </li>
            <li>
              • <strong>Debug Mode:</strong> Run{' '}
              <code className="rounded bg-yellow-100 px-1">
                window.__STORE_DEBUG__ = true
              </code>{' '}
              in console to see cache clearing logs during DevTools time-travel
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StoreBenchmark;
