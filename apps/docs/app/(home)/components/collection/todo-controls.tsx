'use client';

import { collection, store } from '../../lib/store';

const CollectionStats = () => {
  const size = collection.useSize();
  const taskId = store.use((s) => s.taskId - 1);

  return (
    <div className="flex gap-4">
      <div className="border-fd-border flex min-w-[150px] items-center justify-between rounded-lg border p-3">
        <span className="text-fd-muted-foreground text-sm">Total</span>
        <span className="font-mono text-sm font-bold tabular-nums">{size}</span>
      </div>
      <div className="border-fd-border flex min-w-[150px] items-center justify-between rounded-lg border p-3">
        <span className="text-fd-muted-foreground text-sm">Last</span>
        <span className="font-mono text-sm font-bold tabular-nums">
          {taskId ? `Task ${taskId}` : 'N/A'}
        </span>
      </div>
    </div>
  );
};

export function TodoControls() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-fd-muted-foreground text-xs font-medium uppercase">
          Actions
        </h4>
        <CollectionStats />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => {
            const taskId = store.get((s) => s.taskId);
            collection.key(taskId.toString()).set({
              text: `Task ${taskId}`,
              completed: false
            });
            store.dispatch.incrementTaskId();
          }}
          className="bg-fd-primary text-fd-primary-foreground cursor-pointer rounded-md px-4 py-2 hover:opacity-90"
        >
          Add Task
        </button>

        <button
          onClick={() => {
            collection.clear();
            store.dispatch.resetTaskId();
          }}
          className="border-fd-border text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground cursor-pointer rounded-md border px-4 py-2"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
