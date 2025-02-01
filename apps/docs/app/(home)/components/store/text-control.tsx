'use client';

import { store } from '../../lib/store';

const TextDisplay = () => {
  const text = store.use((s) => s.text);

  return <span className="text-fd-foreground">{text}</span>;
};

const TextInput = () => {
  const text = store.use((s) => s.text);

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => store.dispatch('setText', e.target.value)}
      className="border-fd-border w-full cursor-text rounded-md border bg-transparent px-4 py-2"
    />
  );
};

export function TextControl() {
  return (
    <div className="space-y-2">
      <label className="text-fd-muted-foreground grid grid-cols-[auto_1fr] gap-2 font-mono text-sm">
        Text Control: <TextDisplay />
      </label>
      <TextInput />
    </div>
  );
}
