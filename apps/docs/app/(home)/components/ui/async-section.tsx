import { WindowWithCode } from './window';

const codeExample = `
import { createStore } from 'finalstore'

type States = {
  user: User | null
  loading: boolean
}
type Actions = {
  fetchUser: (id: string) => Promise<User>
}

const userStore = createStore<States, Actions>({
  states: {
    user: null,
    loading: false,
  },
  actions: ({ states, notify }) => ({
    async fetchUser(id) {
      states.loading = true
      // Trigger UI updates to subscribed components of loading state
      // Actions auto-notify at the end, but for async operations we want instant
      // feedback to reflect spinner/loading UI before the async operation completes
      notify()

      states.user = await getUserById(id)
      states.loading = false

      return states.user
    },
  }),
})
`;

export function AsyncSection() {
  return (
    <div className="relative mx-auto mt-32 w-full max-w-6xl px-4">
      {/* Background gradient */}
      <div className="via-fd-accent/20 absolute inset-0 -mx-4 bg-gradient-to-b from-transparent to-transparent blur-3xl" />

      <div className="relative">
        <div className="mb-10 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Async Done Right
          </h2>
          <p className="text-fd-muted-foreground mx-auto max-w-2xl text-xl">
            Write async actions that feel synchronous. Direct state mutations
            with promise returns and instant UI updates.
          </p>
        </div>

        <div className="flex flex-col gap-x-6 gap-y-6 lg:flex-row">
          {/* Left side - Cards (25% width on desktop) */}
          <div className="flex flex-col gap-3 lg:order-2 lg:w-1/4 lg:gap-5">
            {/* Async Mutations Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-orange-500/5 to-orange-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 lg:h-10 lg:w-10">
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-orange-600 lg:text-xl">
                  Seamless Async
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  No reducers, no middleware, no complexity. Just write async
                  like you think.
                </p>
              </div>
            </div>

            {/* Notify Updates Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-teal-500/5 to-teal-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 lg:h-10 lg:w-10">
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
                      d="M15 17h5l-5 5v-5zM9 13h6m-3-3v6m5 1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v16a1 1 0 001 1h4"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-teal-600 lg:text-xl">
                  Live Updates
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Automatic and manual UI updates like no other store.
                </p>
              </div>
            </div>

            {/* Return Values Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-indigo-500/5 to-indigo-600/10 p-4 lg:p-6">
              <div className="relative">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 lg:h-10 lg:w-10">
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-indigo-600 lg:text-xl">
                  Promise-Aware
                </h3>
                <p className="text-fd-muted-foreground text-sm leading-relaxed lg:text-base">
                  Actions return promises. Chain operations and handle errors
                  naturally.
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
