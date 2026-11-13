/** Loading placeholder shaped like the final cart (title, banner, three item cards, summary) so nothing jumps when data arrives. */
export function CartSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading your cart">
      <div className="mn-skeleton h-9 w-56" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="mn-skeleton h-[84px] rounded-2xl" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mn-skeleton h-24 w-24 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-3">
                <div className="mn-skeleton h-5 w-2/3" />
                <div className="mn-skeleton h-4 w-1/3" />
                <div className="mt-auto flex items-end justify-between">
                  <div className="mn-skeleton h-11 w-32 rounded-xl" />
                  <div className="mn-skeleton h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden h-[420px] rounded-2xl border border-slate-200 bg-white p-6 lg:block">
          <div className="mn-skeleton h-6 w-40" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="mn-skeleton h-4 w-full" />)}
          </div>
          <div className="mn-skeleton mt-10 h-12 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}
