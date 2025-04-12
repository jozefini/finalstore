'use client';

import { scoped } from '../../lib/store';

const ThemeToggleButton = () => {
  const store = scoped.useStore();
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
  const store = scoped.useStore();
  const theme = store.use((s) => s.theme);

  return (
    <div
      className={`h-10 w-10 rounded-md border-2 border-emerald-300 ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'}`}
    />
  );
};

export function ThemeToggle() {
  return (
    <scoped.Provider>
      <div className="space-y-2">
        <p className="text-fd-muted-foreground font-mono text-sm">
          Theme Control
        </p>
        <div className="flex items-center gap-4">
          <ThemeToggleDisplay />
          <ThemeToggleButton />
        </div>
      </div>
    </scoped.Provider>
  );
}
