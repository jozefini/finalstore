export function ThreeWaySection() {
  return (
    <div className="mx-auto mt-20 w-full max-w-4xl px-4">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold">Three-Way Architecture</h2>
        <p className="text-fd-muted-foreground text-lg">
          Modular by design yet interconnected - each part knows about the
          others and works together seamlessly
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="border-fd-border rounded-lg border p-6">
          <h3 className="mb-2 text-lg font-semibold">States</h3>
          <p className="text-fd-muted-foreground">
            Type-safe data that lives in your store.
          </p>
        </div>

        <div className="border-fd-border rounded-lg border p-6">
          <h3 className="mb-2 text-lg font-semibold">Actions</h3>
          <p className="text-fd-muted-foreground">
            Direct state mutations with async support.
          </p>
        </div>

        <div className="border-fd-border rounded-lg border p-6">
          <h3 className="mb-2 text-lg font-semibold">Selectors</h3>
          <p className="text-fd-muted-foreground">
            Computed values with automatic memoization.
          </p>
        </div>
      </div>
    </div>
  );
}
