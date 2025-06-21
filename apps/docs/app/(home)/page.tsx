import Link from 'next/link';

import { AsyncSection } from './components/ui/async-section';
import { EventSystemSection } from './components/ui/event-system-section';
import { HeroSection } from './components/ui/hero-section';
import {
  AsyncTest,
  BasicStoreTest,
  BatchingTest,
  PerformanceTest
} from './components/ui/store-test';
import { ThreeWaySection } from './components/ui/three-way-section';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <HeroSection />

      <ThreeWaySection />
      <AsyncSection />
      <EventSystemSection />

      <div className="mx-auto mt-20 grid w-full max-w-2xl gap-y-10">
        <BasicStoreTest />
        <BatchingTest />
        <AsyncTest />
        <PerformanceTest />
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
