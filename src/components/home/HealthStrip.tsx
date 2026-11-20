import Link from "next/link";
import { ArrowRight, CloudRain, Leaf, Siren, Snowflake, Sun } from "lucide-react";
import { SEASONS, seasonFor } from "@/lib/health/seasons";

const ICON = { summer: Sun, monsoon: CloudRain, autumn: Leaf, winter: Snowflake } as const;

/** Home page teaser for the Health hub: this season's alert plus first-aid and topics. */
export function HealthStrip() {
  const key = seasonFor();
  const season = SEASONS.find((s) => s.key === key)!;
  const Icon = ICON[key];
  return (
    <section aria-labelledby="health-strip" className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
      <div className="grid gap-6 rounded-3xl border border-line bg-surface p-6 text-ink shadow-card sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-teal-700"><Icon className="h-5 w-5" aria-hidden="true" /> {season.label} health alert · {season.months}</p>
          <h2 id="health-strip" className="mt-2 text-2xl font-bold sm:text-3xl">{season.headline}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {season.risks.slice(0, 4).map((r) => <li key={r} className="rounded-full bg-chip px-3 py-1 text-xs font-semibold text-chip-fg">{r}</li>)}
          </ul>
          <Link href="/health#seasonal" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            See what to do <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid gap-3 text-sm">
          <li><Link href="/health#first-aid" className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 font-medium hover:border-teal-600"><Siren className="h-5 w-5 text-rose-600" aria-hidden="true" /> First-aid guides: burns, cuts, fever and more</Link></li>
          <li><Link href="/health#topics" className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 font-medium hover:border-teal-600"><ArrowRight className="h-5 w-5 text-teal-700" aria-hidden="true" /> Health topics explained in plain language</Link></li>
        </ul>
      </div>
    </section>
  );
}
