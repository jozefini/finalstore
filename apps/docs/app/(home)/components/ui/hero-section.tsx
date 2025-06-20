import Link from 'next/link';
import { Github } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <div className="border-fd-border/50 bg-fd-background/50 text-fd-muted-foreground mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
        ⚡ Optimized updates • Type-safe • Lightweight
      </div>

      <h1 className="mb-6 !text-6xl font-bold tracking-tight sm:text-6xl md:text-7xl">
        <span className="from-fd-foreground to-fd-muted-foreground bg-gradient-to-r bg-clip-text text-transparent">
          The better way to
        </span>
        <br />
        <span className="text-fd-foreground">manage React state</span>
      </h1>

      <p className="text-fd-muted-foreground mx-auto mb-8 max-w-2xl text-xl sm:text-2xl">
        Global or scoped stores. Direct mutations. Auto-memoized selectors.
        DevTools ready.
      </p>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/docs"
          className="bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 inline-flex h-12 items-center rounded-lg px-8 py-3 text-sm font-semibold transition-colors"
        >
          Get Started
        </Link>
        <a
          href="https://github.com/jozefini/finalstore"
          target="_blank"
          rel="noopener noreferrer"
          className="border-fd-border bg-fd-background text-fd-foreground hover:bg-fd-accent inline-flex h-12 items-center gap-2 rounded-lg border px-8 py-3 text-sm font-semibold transition-colors"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </div>
    </div>
  );
}
