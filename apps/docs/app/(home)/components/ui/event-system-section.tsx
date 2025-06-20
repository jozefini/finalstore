import { WindowWithCode } from './window';

const codeExample = `
import { createStore } from 'finalstore'

type States = {
  cart: CartItem[]
}
type Actions = {
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
}
type Events = {
  itemAdded: CartItem
  itemRemoved: CartItem
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
        trigger('itemAdded', item)
      }
    },
    removeFromCart(id) {
      const foundItem = states.cart.find(i => i.id === id)
      if (foundItem) {
        states.cart = states.cart.filter(i => i.id !== id)
        trigger('itemRemoved', id)
      }
    }
  })
})

// Listen to events for side effects
const addedListener = cartStore.on('itemAdded', (item) => {
  track('Item Added', { productId: item.id, price: item.price })
})
const removedListener = cartStore.on('itemRemoved', (id) => {
  track('Item Removed', { productId: id })
})

// Cleanup when component unmounts
addedListener.off()
removedListener.off()
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
            <WindowWithCode title="" code={codeExample} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
