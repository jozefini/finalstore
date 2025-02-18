'use client';

import { store } from '../../lib/store';

const ThemeToggleButton = () => {
  return (
    <button
      onClick={() => store.dispatch.toggleTheme()}
      className="bg-fd-primary text-fd-primary-foreground cursor-pointer rounded-md px-4 py-2 hover:opacity-90"
    >
      Toggle Theme
    </button>
  );
};

const ThemeToggleDisplay = () => {
  const theme = store.use((s) => s.theme);

  return (
    <div
      className={`h-10 w-10 rounded-md border-2 border-emerald-300 ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'}`}
    />
  );
};

export function ThemeToggle() {
  return (
    <div className="space-y-2">
      <p className="text-fd-muted-foreground font-mono text-sm">
        Theme Control
      </p>
      <div className="flex items-center gap-4">
        <ThemeToggleDisplay />
        <ThemeToggleButton />
      </div>
    </div>
  );
}
