// Shown at once while any storefront page is being prepared, so a click always responds instantly instead of freezing on the old page.
export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="mn-skeleton mb-4 h-4 w-40" />
      <div className="mn-skeleton mb-6 h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="mn-skeleton aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <div className="mn-skeleton h-4 w-5/6" />
              <div className="mn-skeleton h-3 w-2/3" />
              <div className="mn-skeleton h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
