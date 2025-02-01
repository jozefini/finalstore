'use client';

import { store } from '../../lib/store';

const CounterText = () => {
  const count = store.use((s) => s.count);

  return <span className="font-mono text-lg">{count}</span>;
};

export function Counter() {
  return (
    <div className="space-y-2">
      <p className="text-fd-muted-foreground font-mono text-sm">
        Counter Control
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => store.dispatch('decrement')}
          className="border-fd-border hover:bg-fd-accent cursor-pointer rounded-md border px-4 py-2"
        >
          -
        </button>
        <CounterText />
        <button
          onClick={() => store.dispatch('increment')}
          className="border-fd-border hover:bg-fd-accent cursor-pointer rounded-md border px-4 py-2"
        >
          +
        </button>
      </div>
    </div>
  );
}
