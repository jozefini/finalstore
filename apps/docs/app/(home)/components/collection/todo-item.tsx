'use client';

import { collection } from '../../lib/store';

const TodoChecked = ({ id }: { id: string }) => {
  const completed = collection.key(id).use((s) => s.completed);

  return (
    <input
      type="checkbox"
      checked={completed}
      onChange={() => collection.key(id).dispatch.toggle()}
      className="h-4 w-4 cursor-pointer"
    />
  );
};

const TodoText = ({ id }: { id: string }) => {
  const text = collection.key(id).use((s) => s.text);
  const completed = collection.key(id).use((s) => s.completed);

  return (
    <span className={completed ? 'text-fd-muted-foreground line-through' : ''}>
      {text}
    </span>
  );
};

const TodoRemove = ({ id }: { id: string }) => {
  return (
    <button
      onClick={() => collection.key(id).remove()}
      className="text-fd-muted-foreground hover:text-fd-foreground ml-auto cursor-pointer p-2"
    >
      ×
    </button>
  );
};

export function TodoItem({ id }: { id: string }) {
  return (
    <div className="border-fd-border flex items-center gap-3 rounded-md border p-3">
      <TodoChecked id={id} />
      <TodoText id={id} />
      <TodoRemove id={id} />
    </div>
  );
}
