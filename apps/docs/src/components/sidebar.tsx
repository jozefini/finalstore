'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { useHashScroll } from '@/hooks/use-hash-scroll';
import { MenuIcon } from 'lucide-react';

type NavGroup = {
  title?: string;
  links: Array<{ title: string; href: string }>;
};

// const withKey = `<code>key</code>`;
const navGroups: NavGroup[] = [
  {
    title: 'Object Store',
    links: [
      { title: 'setup', href: '#store-setup' },
      { title: 'get', href: '#store-get' },
      { title: 'use', href: '#store-use' },
      { title: 'dispatch', href: '#store-dispatch' },
      { title: 'batch', href: '#store-batch' }
    ]
  }
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);
  const desktopNavRef = useRef<HTMLDivElement | null>(null);
  useHashScroll(mobileNavRef);
  useHashScroll(desktopNavRef);

  return (
    <>
      {/* Mobile top bar with Sheet trigger */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Open navigation">
              <MenuIcon className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="px-1 text-base">FinalStore</SheetTitle>
            </SheetHeader>
            <nav ref={mobileNavRef} className="grid gap-8 p-4">
              {navGroups.map((group, index) => (
                <div key={index} className="grid gap-2">
                  {group.title ? (
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      {group.title}
                    </div>
                  ) : null}
                  <ul className="grid gap-1">
                    {group.links.map((link, ii) => (
                      <li key={ii}>
                        <Link
                          href={link.href as `#${string}`}
                          className="text-foreground/80 hover:text-foreground text-sm transition-colors *:ms-1 *:inline-flex *:rounded-md *:bg-white/5 *:px-1.5 *:py-0.5 *:text-xs *:uppercase *:tracking-wide"
                          onClick={() => setIsOpen(false)}
                          dangerouslySetInnerHTML={{
                            __html: link.title
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="text-sm font-semibold">FinalStore</div>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100svh] lg:block lg:border-r">
        <ScrollArea className="h-full w-[280px]">
          <div ref={desktopNavRef} className="px-4 py-8">
            <div className="mb-8 text-sm font-semibold">FinalStore</div>
            <nav className="grid gap-8">
              {navGroups.map((group, index) => (
                <div key={index} className="grid gap-2">
                  {group.title ? (
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      {group.title}
                    </div>
                  ) : null}
                  <ul className="grid gap-1">
                    {group.links.map((link, ii) => (
                      <li key={ii}>
                        <Link
                          href={link.href as `#${string}`}
                          className="text-foreground/80 hover:text-foreground *:text-muted-foreground text-sm transition-colors *:ms-1 *:inline-flex *:rounded-md *:bg-white/5 *:px-1.5 *:py-0.5 *:text-xs *:uppercase *:tracking-wide"
                          dangerouslySetInnerHTML={{
                            __html: link.title
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
