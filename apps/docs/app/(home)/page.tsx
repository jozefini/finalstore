import Link from 'next/link';
import { Window } from './components/ui/window';
import { ThemeToggle } from './components/store/theme-toggle';
import { Counter } from './components/store/counter-text';
import { TextControl } from './components/store/text-control';
import { TodoControls } from './components/collection/todo-controls';
import { TodoList } from './components/collection/todo-list';
import { Github } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <div className="mx-auto max-w-[750px] space-y-4 text-center">
        <h1 className="text-6xl font-bold tracking-tight">
          Type-safe state management for React
        </h1>
        <p className="text-fd-muted-foreground mt-4 text-xl">
          Simple yet powerful state management with first-class TypeScript
          support. Zero configuration, built-in DevTools, and collection
          management.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/docs"
            className="bg-fd-primary text-fd-primary-foreground rounded-md px-5 py-2.5 font-medium transition hover:opacity-90"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/jozefini/finalstore"
            target="_blank"
            rel="noopener noreferrer"
            className="border-fd-border hover:bg-fd-accent inline-flex items-center gap-x-1.5 rounded-md border px-5 py-2.5 font-medium transition"
          >
            <Github className="-ms-1 size-4" />
            GitHub
          </a>
        </div>
      </div>

      <div className="mx-auto mt-20 w-full max-w-[900px]">
        <Window title="Store">
          <div className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ThemeToggle />
                <Counter />
              </div>
              <TextControl />
            </div>
          </div>
        </Window>

        <Window title="Collection" className="mt-8">
          <div className="space-y-4 p-6">
            <TodoControls />
            <TodoList />
          </div>
        </Window>
      </div>

      <div className="mx-auto mt-20 grid w-full max-w-[900px] grid-cols-1 gap-6 px-4 md:grid-cols-3">
        <div className="border-fd-border rounded-lg border p-6">
          <h3 className="mb-2 text-lg font-semibold">Lightweight</h3>
          <p className="text-fd-muted-foreground">
            Small bundle size with zero dependencies. Fast and efficient state
            updates.
          </p>
        </div>

        <div className="border-fd-border rounded-lg border p-6">
          <h3 className="mb-2 text-lg font-semibold">Type Safe</h3>
          <p className="text-fd-muted-foreground">
            Built with TypeScript for robust development. Full type inference
            for states and actions.
          </p>
        </div>

        <div className="border-fd-border rounded-lg border p-6">
          <h3 className="mb-2 text-lg font-semibold">Collections</h3>
          <p className="text-fd-muted-foreground">
            Efficient management of dynamic data sets with individual item
            subscriptions.
          </p>
        </div>
      </div>

      <div className="mb-10 mt-20 text-center">
        <Link
          href="/docs"
          className="text-fd-muted-foreground hover:text-fd-foreground transition"
        >
          Read the docs →
        </Link>
      </div>
    </main>
  );
}

export const generateMetadata = () => {
  return {
    title: 'FinalStore - Type-safe state management for React',
    description: 'Type-safe state management for React'
  };
};
