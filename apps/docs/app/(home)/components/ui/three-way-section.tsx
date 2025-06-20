export function ThreeWaySection() {
  return (
    <div className="relative mx-auto mt-32 w-full max-w-6xl px-4">
      {/* Background gradient */}
      <div className="via-fd-accent/20 absolute inset-0 -mx-4 bg-gradient-to-b from-transparent to-transparent blur-3xl" />

      <div className="relative">
        <div className="mb-10 text-center">
          <div className="bg-fd-accent/10 text-fd-accent-foreground mb-3 inline-flex items-center rounded-full px-6 py-2 text-xs font-bold uppercase tracking-wider">
            ARCHITECTURE
          </div>
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Modular Architecture
          </h2>
          <p className="text-fd-muted-foreground mx-auto max-w-2xl text-xl">
            Clean separation with seamless integration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* States Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-blue-500/5 to-blue-600/10 p-8">
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-blue-600">
                States
              </h3>
              <p className="text-fd-muted-foreground leading-relaxed">
                Type-safe data that lives in your store.
              </p>
            </div>
          </div>

          {/* Actions Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-green-500/5 to-green-600/10 p-8">
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-green-600">
                Actions
              </h3>
              <p className="text-fd-muted-foreground leading-relaxed">
                Direct state mutations with async support.
              </p>
            </div>
          </div>

          {/* Selectors Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-purple-500/5 to-purple-600/10 p-8">
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold text-purple-600">
                Selectors
              </h3>
              <p className="text-fd-muted-foreground leading-relaxed">
                Computed values with automatic memoization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
