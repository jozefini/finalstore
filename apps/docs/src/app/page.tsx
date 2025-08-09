import { Section } from '@/components/ui/section';

import { StoreDocs } from './components/store';

export default function Home() {
  return (
    <div>
      <StoreDocs />
      <Section className="h-screen bg-amber-900" />
      <Section className="h-screen bg-indigo-900" />
      <Section className="h-screen bg-emerald-900" />
    </div>
  );
}
