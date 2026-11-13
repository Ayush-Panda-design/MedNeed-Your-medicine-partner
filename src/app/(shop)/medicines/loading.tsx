// Shown while the catalogue (re)loads — on first open and whenever a filter or sort changes.
function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="mn-skeleton aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="mn-skeleton h-4 w-5/6" />
        <div className="mn-skeleton h-3 w-2/3" />
        <div className="mn-skeleton h-3 w-1/2" />
        <div className="mn-skeleton mt-2 h-5 w-20" />
        <div className="mn-skeleton mt-auto h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mn-skeleton mb-4 h-4 w-40" />
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="space-y-2"><div className="mn-skeleton h-8 w-48" /><div className="mn-skeleton h-3 w-32" /></div>
        <div className="mn-skeleton h-9 w-40 rounded-lg" />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden w-64 shrink-0 space-y-3 lg:block">
          <div className="mn-skeleton h-10 w-full rounded-xl" />
          <div className="mn-skeleton h-40 w-full rounded-xl" />
          <div className="mn-skeleton h-40 w-full rounded-xl" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    </main>
  );
}
