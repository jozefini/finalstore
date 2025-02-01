'use client';

import { collection } from '../../lib/store';
import { TodoItem } from './todo-item';

export function TodoList() {
  const todoIds = collection.useKeys();

  return (
    <div className="space-y-2">
      {todoIds.map((id) => (
        <TodoItem key={id} id={id} />
      ))}
    </div>
  );
}
