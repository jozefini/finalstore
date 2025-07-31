'use client';

import React, { useState } from 'react';

import { createMap } from '../../../../../../packages/store/src/map-2';

// Simple test state
const testState = {
  name: 'Test',
  count: 0
};

type TestState = typeof testState;
type TestActions = {
  setName: (name: string) => void;
  increment: () => void;
};

// Create a simple test map
const TestMap = createMap<TestState, TestActions, object>({
  defaultStates: testState,
  actions: ({ set }) => ({
    setName: (name: string) => {
      console.log('Setting name to:', name);
      set((state) => {
        state.name = name;
      });
    },
    increment: () => {
      console.log('Incrementing count');
      set((state) => {
        state.count++;
      });
    }
  }),
  config: {
    name: 'TestMap',
    devtools: true
  }
});

const MapDebug = () => {
  const [keyName, setKeyName] = useState('test-key');

  // Subscribe to map size and keys
  const mapSize = TestMap.useSize();
  const mapKeys = TestMap.useKeys();

  // Subscribe to a test key
  const testKeyData = TestMap.key('test-key').use();

  console.log(
    'Render - Map size:',
    mapSize,
    'Keys:',
    mapKeys,
    'Test key data:',
    testKeyData
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Map Debug Test
        </h1>

        {/* Current State */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold">Current State</h2>
          <div className="space-y-2">
            <div>
              Map Size: <strong>{mapSize}</strong>
            </div>
            <div>
              Map Keys: <strong>[{mapKeys.join(', ')}]</strong>
            </div>
            <div>
              Test Key Data: <strong>{JSON.stringify(testKeyData)}</strong>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-bold">Controls</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Key name"
                className="rounded border border-gray-300 px-3 py-2"
              />
              <button
                onClick={() => {
                  console.log('Creating key:', keyName);
                  TestMap.key(keyName).set({
                    name: `Key ${keyName}`,
                    count: 0
                  });
                  console.log(
                    'After creation - Size:',
                    TestMap.getSize(),
                    'Keys:',
                    TestMap.getKeys()
                  );
                }}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Create Key
              </button>
            </div>

            <button
              onClick={() => {
                console.log('Setting test-key name');
                TestMap.key('test-key').dispatch.setName('Updated Name');
              }}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Update Test Key Name
            </button>

            <button
              onClick={() => {
                console.log('Incrementing test-key count');
                TestMap.key('test-key').dispatch.increment();
              }}
              className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              Increment Test Key Count
            </button>

            <button
              onClick={() => {
                console.log('Clearing map');
                TestMap.clear();
                console.log(
                  'After clear - Size:',
                  TestMap.getSize(),
                  'Keys:',
                  TestMap.getKeys()
                );
              }}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Clear Map
            </button>

            <button
              onClick={() => {
                console.log('Testing batch operations');
                TestMap.batch(() => {
                  for (let i = 0; i < 5; i++) {
                    TestMap.key(`batch-${i}`).set({
                      name: `Batch Item ${i}`,
                      count: i
                    });
                  }
                });
                console.log(
                  'After batch - Size:',
                  TestMap.getSize(),
                  'Keys:',
                  TestMap.getKeys()
                );
              }}
              className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            >
              Test Batch (5 keys)
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="rounded-lg bg-yellow-50 p-6">
          <h3 className="mb-3 text-lg font-bold text-yellow-800">Debug Info</h3>
          <ul className="space-y-1 text-sm text-yellow-700">
            <li>• Open browser console to see detailed logs</li>
            <li>• Check Redux DevTools for action history</li>
            <li>• Map should update reactively when keys are added/modified</li>
            <li>• Size and keys should update immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MapDebug;
