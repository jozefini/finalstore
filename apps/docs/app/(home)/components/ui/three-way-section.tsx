'use client';

import { createStore } from '../../../../../../packages/store/src/store';
import { Button } from './button';
import { WindowWithCode } from './window';

// Counter demo
type CounterStates = {
  count: number;
  multiplier: number;
};

type CounterActions = {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setMultiplier: (value: number) => void;
};

type CounterSelectors = {
  isEven: () => boolean;
  isGreaterThan: (value: number) => boolean;
  multipliedValue: () => number;
  getStatus: () => string;
};

const counterStore = createStore<
  CounterStates,
  CounterActions,
  CounterSelectors
>({
  states: {
    count: 0,
    multiplier: 2
  },
  actions: ({ states }) => ({
    increment() {
      states.count += 1;
    },
    decrement() {
      states.count -= 1;
    },
    reset() {
      states.count = 0;
    },
    setMultiplier(value: number) {
      states.multiplier = value;
    }
  }),
  selectors: ({ states }) => ({
    isEven: () => states.count % 2 === 0,
    isGreaterThan: (value: number) => states.count > value,
    multipliedValue: () => states.count * states.multiplier,
    getStatus: () => {
      if (states.count === 0) return 'Zero';
      if (states.count > 0) return 'Positive';
      return 'Negative';
    }
  })
});

function CounterDemo() {
  const count = counterStore.use((state) => state.count);
  const multiplier = counterStore.use((state) => state.multiplier);
  const isEven = counterStore.use.isEven();
  const multipliedValue = counterStore.use.multipliedValue();
  const status = counterStore.use.getStatus();
  const isGreaterThanFive = counterStore.use.isGreaterThan(5);

  return (
    <div className="w-full max-w-sm space-y-4 px-4 py-8 lg:py-20">
      {/* Counter Display */}
      <div className="text-center">
        <div className="mb-2 text-4xl font-bold text-gray-900">{count}</div>
        <div className="text-sm text-gray-500">Current Count</div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Actions</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => counterStore.dispatch.decrement()}
            className="flex-1"
          >
            -1
          </Button>
          <Button
            size="sm"
            onClick={() => counterStore.dispatch.increment()}
            className="flex-1"
          >
            +1
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => counterStore.dispatch.reset()}
            className="flex-1"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Multiplier Control */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Multiplier: {multiplier}
        </h3>
        <div className="flex gap-1">
          {[1, 2, 3, 5, 10].map((value) => (
            <Button
              key={value}
              variant={multiplier === value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => counterStore.dispatch.setMultiplier(value)}
              className="flex-1 text-xs"
            >
              {value}x
            </Button>
          ))}
        </div>
      </div>

      {/* Selectors Display */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Computed Values (Selectors)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Even/Odd</div>
            <div className="font-semibold text-gray-900">
              {isEven ? '✓ Even' : '✗ Odd'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Status</div>
            <div className="font-semibold text-gray-900">{status}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Multiplied</div>
            <div className="font-semibold text-gray-900">
              {count} × {multiplier} = {multipliedValue}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">&gt; 5</div>
            <div className="font-semibold text-gray-900">
              {isGreaterThanFive ? '✓ Yes' : '✗ No'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const codeExample = `
import { createStore } from 'finalstore'

type States = {
  count: number,
}
type Actions = {
  increment: () => void
  decrement: () => void
}
type Selectors = {
  isEven: () => boolean
  isGreaterThan: (value: number) => boolean
}

const store = createStore<States, Actions, Selectors>({
  states: {
    count: 0,
  },
  actions: ({ states, selectors, trigger, notify }) => ({
    increment: () => { states.count += 1 },
    decrement: () => { states.count -= 1 },
  }),
  selectors: ({ states, selectors }) => ({
    isEven: () => states.count % 2 === 0,
    isGreaterThan: (value) => states.count > value,
  }),
})
`;

export function ThreeWaySection() {
  return (
    <div className="relative mx-auto mt-32 w-full max-w-6xl px-4">
      {/* Background gradient */}
      <div className="via-fd-accent/20 absolute inset-0 -mx-4 bg-gradient-to-b from-transparent to-transparent blur-3xl" />

      <div className="relative">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Modular Architecture
          </h2>
          <p className="text-fd-muted-foreground mx-auto max-w-2xl text-xl">
            Separate concerns without losing connections. Type-safe states,
            direct mutations, and computed selectors that just work.
          </p>
        </div>

        <div className="flex flex-col gap-x-6 gap-y-6 lg:flex-row">
          {/* Left side - Cards (25% width on desktop) */}
          <div className="flex flex-col gap-3 lg:w-1/4 lg:gap-5">
            {/* States Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-blue-500/5 to-blue-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 lg:h-10 lg:w-10">
                  <svg
                    className="h-4 w-4 lg:h-5 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-blue-600 lg:text-xl">
                  States
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Type-safe data that lives in your store.
                </p>
              </div>
            </div>

            {/* Actions Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-green-500/5 to-green-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600 lg:h-10 lg:w-10">
                  <svg
                    className="h-4 w-4 lg:h-5 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-green-600 lg:text-xl">
                  Actions
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Direct state mutations with async support.
                </p>
              </div>
            </div>

            {/* Selectors Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-purple-500/5 to-purple-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 lg:h-10 lg:w-10">
                  <svg
                    className="h-4 w-4 lg:h-5 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-purple-600 lg:text-xl">
                  Selectors
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Computed values with automatic memoization.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Window (75% width on desktop) */}
          <div className="lg:w-3/4">
            <WindowWithCode code={codeExample} className="w-full">
              <CounterDemo />
            </WindowWithCode>
          </div>
        </div>
      </div>
    </div>
  );
}
