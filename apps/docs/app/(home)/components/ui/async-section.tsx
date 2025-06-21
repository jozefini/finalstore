'use client';

import { createStore } from '../../../../../../packages/store/src/store';
import { Button } from './button';
import { WindowWithCode } from './window';

type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

type UserStates = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

type UserActions = {
  fetchUser: (id: string) => Promise<User>;
  clearUser: () => void;
};

const initialUserState: UserStates = {
  user: null,
  loading: false,
  error: null
};

// Fake users database
const fakeUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', avatar: 'AJ' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', avatar: 'BS' },
  { id: '3', name: 'Carol Davis', email: 'carol@example.com', avatar: 'CD' }
];

// Fake API function
const fetchUserById = async (id: string): Promise<User> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const user = fakeUsers.find((u) => u.id === id);
  if (!user) {
    throw new Error(`User with id ${id} not found`);
  }

  // Simulate occasional errors
  if (Math.random() < 0.2) {
    throw new Error('Network error occurred');
  }

  return user;
};

const userStore = createStore<UserStates, UserActions>({
  states: initialUserState,
  actions: ({ states, notify }) => ({
    async fetchUser(id: string) {
      states.loading = true;
      states.error = null;
      states.user = null;
      notify();

      try {
        states.user = await fetchUserById(id);
        states.loading = false;
        return states.user;
      } catch (error) {
        states.error = (error as Error).message;
        states.loading = false;
        throw error;
      }
    },
    clearUser() {
      states.user = null;
      states.error = null;
      states.loading = false;
    }
  }),
  config: {
    name: 'userStore',
    devtools: true
  }
});

function AsyncDemo() {
  const { user, loading, error } = userStore.use();

  const handleFetchUser = async (id: string) => {
    try {
      await userStore.dispatch.fetchUser(id);
    } catch (err) {
      // Error is handled in the store
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4 px-4 py-8 lg:py-32">
      {/* User Selection */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Fetch User</h3>
        <div className="grid grid-cols-3 gap-2">
          {fakeUsers.map((fakeUser) => (
            <Button
              key={fakeUser.id}
              size="sm"
              className="flex h-auto flex-col items-center space-y-1 px-3 py-2 text-xs"
              onClick={() => handleFetchUser(fakeUser.id)}
              disabled={loading}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600">
                <span className="text-xs font-bold text-white">
                  {fakeUser.avatar}
                </span>
              </div>
              <span>{fakeUser.name.split(' ')[0]}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* User Display */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Current User</h3>
          <Button
            variant="secondary"
            size="sm"
            className="h-6 px-2 py-1 text-xs"
            disabled={!user || loading}
            onClick={() => userStore.dispatch.clearUser()}
          >
            Clear
          </Button>
        </div>

        <div className="flex h-32 items-center justify-center rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <span className="text-xs text-gray-500">Loading user...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center space-y-2 px-4 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <span className="text-xs text-red-600">✕</span>
              </div>
              <span className="text-xs text-red-600">{error}</span>
            </div>
          ) : user ? (
            <div className="flex items-center space-x-3 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600">
                <span className="text-lg font-bold text-white">
                  {user.avatar}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">No user selected</span>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Status</h3>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${
                loading
                  ? 'animate-pulse bg-yellow-500'
                  : error
                    ? 'bg-red-500'
                    : user
                      ? 'bg-green-500'
                      : 'bg-gray-400'
              }`}
            ></div>
            <span className="font-mono text-xs text-gray-700">
              {loading
                ? 'Loading...'
                : error
                  ? 'Error occurred'
                  : user
                    ? 'User loaded'
                    : 'Ready'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
                      d="M15 17h5l-5 5v-5zM9 13h6m-3-3v6m5 1V4a1 1 0 00-1-1H5a1 1 0 001 1h4"
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
            <WindowWithCode code={codeExample} className="w-full">
              <AsyncDemo />
            </WindowWithCode>
          </div>
        </div>
      </div>
    </div>
  );
}
