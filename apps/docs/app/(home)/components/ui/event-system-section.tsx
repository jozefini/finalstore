'use client';

import { useEffect, useRef, useState } from 'react';

import { createStore } from '../../../../../../packages/store/src/store-3';
import { Button } from './button';
import { WindowWithCode } from './window';

// Interactive cart example
type CartItem = {
  id: string;
  name: string;
  price: number;
};

type CartStates = {
  cart: CartItem[];
};

type CartActions = {
  addToCart: (item: CartItem) => void;
  clearCart: () => void;
};

type CartEvents = {
  'cart.items.added': CartItem;
  'cart.cleared': void;
};

const initialCartState: CartStates = {
  cart: []
};

const cartStore = createStore<
  CartStates,
  CartActions,
  Record<string, never>,
  CartEvents
>({
  states: initialCartState,
  actions: ({ set, trigger }) => ({
    addToCart(item: CartItem) {
      set((states) => {
        const foundItem = states.cart.find((i) => i.id === item.id);
        if (!foundItem) {
          states.cart = [...states.cart, item];
          trigger('cart.items.added', item);
        }
      });
    },
    clearCart() {
      set((states) => {
        states.cart = [];
      });
      trigger('cart.cleared', undefined);
    }
  })
});

const availableItems: CartItem[] = [
  { id: '1', name: 'Coffee Mug', price: 12.99 },
  { id: '2', name: 'Laptop Sticker', price: 4.99 },
  { id: '3', name: 'T-Shirt', price: 24.99 }
];

function CartDemo() {
  const cart = cartStore.use((state) => state.cart);
  const [events, setEvents] = useState<string[]>([]);
  const eventLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to cart events
    const addedListener = cartStore.on('cart.items.added', (item: CartItem) => {
      setEvents((prev) => [
        ...prev,
        `🛒 Added "${item.name}" to cart ($${item.price})`
      ]);

      // Auto-scroll to bottom
      setTimeout(() => {
        if (eventLogRef.current) {
          eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
      }, 0);
    });

    const clearedListener = cartStore.on('cart.cleared', () => {
      setEvents((prev) => [...prev, '🗑️ Cart cleared']);

      // Auto-scroll to bottom
      setTimeout(() => {
        if (eventLogRef.current) {
          eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
      }, 0);
    });

    return () => {
      addedListener.off();
      clearedListener.off();
      cartStore.reset();
    };
  }, []);

  return (
    <div className="w-full max-w-sm space-y-4 px-4 py-8 lg:py-16">
      {/* Available Items */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">
          Store Items
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {availableItems.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                  <span className="text-xs font-bold text-white">
                    {item.name.charAt(0)}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-900">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500">${item.price}</div>
                </div>
                <Button
                  size="sm"
                  className="h-6 px-3 py-1 text-xs"
                  onClick={() => cartStore.dispatch.addToCart(item)}
                  disabled={cart.some((cartItem) => cartItem.id === item.id)}
                >
                  {cart.some((cartItem) => cartItem.id === item.id)
                    ? 'Added'
                    : 'Add'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Cart ({cart.length})
          </h3>
          <Button
            variant="secondary"
            size="sm"
            className="h-6 px-2 py-1 text-xs"
            disabled={cart.length === 0}
            onClick={() => cartStore.dispatch.clearCart()}
          >
            Clear
          </Button>
        </div>

        <div className="h-32 rounded-lg border border-gray-200 bg-white">
          {cart.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              Your cart is empty
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600">
                      <span className="text-xs font-bold text-white">
                        {item.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    ${item.price}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Log */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Event Log</h3>
        <div
          ref={eventLogRef}
          className="h-32 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-3"
        >
          {events.length === 0 ? (
            <div className="text-xs text-gray-500">
              No events yet... try adding items to cart!
            </div>
          ) : (
            <div className="space-y-1">
              {events.map((event, index) => (
                <div key={index} className="font-mono text-xs text-green-400">
                  {event}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const codeExample = `
import { createStore } from 'finalstore'

type States = {
  cart: CartItem[]
}
type Actions = {
  addToCart: (item: CartItem) => void
}
type Events = {
  'cart.items.added': CartItem
}

const cartStore = createStore<States, Actions, {}, Events>({
  states: {
    cart: [],
  },
  actions: ({ states, trigger }) => ({
    addToCart(item) {
      const foundItem = states.cart.find(i => i.id === item.id)
      if (!foundItem) {
        states.cart.push(item)
        trigger('cart.items.added', item) // Trigger event on success
      }
    }
  })
})

useEffect(() => {
  const listener = cartStore.on('cart.items.added', (item) => {
    track('Item Added', { productId: item.id, price: item.price })
  })
  return () => {
    listener.off() // Cleanup when component unmounts
  }
}, [])
`;

export function EventSystemSection() {
  return (
    <div className="relative mx-auto mt-32 w-full max-w-6xl px-4">
      {/* Background gradient */}
      <div className="via-fd-accent/20 absolute inset-0 -mx-4 bg-gradient-to-b from-transparent to-transparent blur-3xl" />

      <div className="relative">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Event System
          </h2>
          <p className="text-fd-muted-foreground mx-auto max-w-2xl text-xl">
            Trigger events for clean side effects. Listen, react, and cleanup
            with a powerful pub/sub system built into your store.
          </p>
        </div>

        <div className="flex flex-col gap-x-6 gap-y-6 lg:flex-row">
          {/* Left side - Cards (25% width on desktop) */}
          <div className="flex flex-col gap-3 lg:w-1/4 lg:gap-5">
            {/* Trigger Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-amber-500/5 to-amber-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 lg:h-10 lg:w-10">
                  <svg
                    className="h-4 w-4 lg:h-5 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.362 5.214A8.252 8.252 0 0112 21 8.252 8.252 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-amber-600 lg:text-xl">
                  Trigger Events
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Emit events for side effects like analytics, logging, and
                  notifications.
                </p>
              </div>
            </div>

            {/* Listen Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-emerald-500/5 to-emerald-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 lg:h-10 lg:w-10">
                  <svg
                    className="h-4 w-4 lg:h-5 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.464 15.536a5 5 0 017.072 0M2.636 5.636a9 9 0 0012.728 0"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-emerald-600 lg:text-xl">
                  Listen & React
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Subscribe to events and get individual unsubscribe methods for
                  each listener.
                </p>
              </div>
            </div>

            {/* Cleanup Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-rose-500/5 to-rose-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 lg:h-10 lg:w-10">
                  <svg
                    className="h-4 w-4 lg:h-5 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-rose-600 lg:text-xl">
                  Cleanup & Off
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Remove event listeners when components unmount to prevent
                  memory leaks.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Window (75% width on desktop) */}
          <div className="lg:w-3/4">
            <WindowWithCode code={codeExample} className="w-full">
              <CartDemo />
            </WindowWithCode>
          </div>
        </div>
      </div>
    </div>
  );
}
